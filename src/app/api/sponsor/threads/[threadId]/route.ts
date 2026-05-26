import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

const VALID_STATUS = ["PENDING", "ACCEPTED", "DECLINED", "ARCHIVED"] as const;
type ThreadStatus = (typeof VALID_STATUS)[number];

/** Sjekker at innlogget bruker har tilgang til tråden. Returnerer rolle. */
async function getThreadContext(userId: string, threadId: string) {
  const thread = await db.sponsorThread.findUnique({
    where:   { id: threadId },
    include: { sponsor: { select: { userId: true, brandName: true, slug: true, logoUrl: true } } },
  });
  if (!thread) return null;
  if (thread.sponsor.userId === userId) return { thread, role: "SPONSOR" as const };
  if (thread.creatorId === userId)      return { thread, role: "CREATOR" as const };
  return null;
}

/** GET /api/sponsor/threads/[threadId] — hent tråd + meldinger */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const { threadId } = await params;

  const ctx = await getThreadContext(session.user.id, threadId);
  if (!ctx) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const [thread, messages, creator] = await Promise.all([
    db.sponsorThread.findUnique({
      where:   { id: threadId },
      include: { sponsor: { select: { id: true, brandName: true, slug: true, logoUrl: true } } },
    }),
    db.sponsorMessage.findMany({
      where:   { threadId },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    }),
    db.user.findUnique({
      where:  { id: ctx.thread.creatorId },
      select: { id: true, name: true, username: true, avatarUrl: true, bio: true, creatorTags: true },
    }),
  ]);

  // Marker meldinger fra motparten som lest
  await db.sponsorMessage.updateMany({
    where: { threadId, readAt: null, NOT: { authorId: session.user.id } },
    data:  { readAt: new Date() },
  });

  return NextResponse.json({
    role:     ctx.role,
    thread:   thread,
    messages: messages.map((m) => ({
      id:         m.id,
      content:    m.content,
      senderRole: m.senderRole,
      createdAt:  m.createdAt.toISOString(),
      readAt:     m.readAt?.toISOString() ?? null,
      author:     m.author,
      isFromMe:   m.authorId === session.user.id,
    })),
    creator,
  });
}

/** POST /api/sponsor/threads/[threadId] { content } — svar på tråden */
export async function POST(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const userId = session.user.id;
  const { threadId } = await params;

  const ctx = await getThreadContext(userId, threadId);
  if (!ctx) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  if (ctx.thread.status === "ARCHIVED" || ctx.thread.status === "DECLINED") {
    return NextResponse.json({ error: "Tråden er lukket" }, { status: 400 });
  }

  const { content } = (await req.json()) as { content?: string };
  if (!content?.trim()) return NextResponse.json({ error: "Tom melding" }, { status: 400 });
  if (content.length > 2000) return NextResponse.json({ error: "Melding maks 2000 tegn" }, { status: 400 });

  const now = new Date();
  await db.$transaction([
    db.sponsorMessage.create({
      data: {
        threadId,
        authorId:   userId,
        senderRole: ctx.role,
        content:    content.trim().slice(0, 2000),
      },
    }),
    db.sponsorThread.update({
      where: { id: threadId },
      data:  { lastMessageAt: now },
    }),
  ]);

  // Varsle motparten
  const recipientId = ctx.role === "SPONSOR" ? ctx.thread.creatorId : ctx.thread.sponsor.userId;
  await db.notification.create({
    data: {
      userId:   recipientId,
      type:     "SPONSOR_TAG",
      title:    ctx.role === "SPONSOR" ? `${ctx.thread.sponsor.brandName}: nytt svar` : "Nytt svar i sponsor-tråd",
      body:     content.trim().slice(0, 120),
      href:     `/sponsor-henvendelser/${threadId}`,
      iconUrl:  ctx.role === "SPONSOR" ? ctx.thread.sponsor.logoUrl : null,
      metadata: { kind: "sponsor_thread_reply", threadId },
    },
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}

/** PATCH /api/sponsor/threads/[threadId] { status } — bytte status (creator godtar/avslår, eller arkiver) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const userId = session.user.id;
  const { threadId } = await params;

  const ctx = await getThreadContext(userId, threadId);
  if (!ctx) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const { status } = (await req.json()) as { status?: string };
  if (!status || !VALID_STATUS.includes(status as ThreadStatus)) {
    return NextResponse.json({ error: "Ugyldig status" }, { status: 400 });
  }

  // Regler: creator kan godta/avslå/arkivere. Sponsor kan kun arkivere.
  if (ctx.role === "SPONSOR" && status !== "ARCHIVED") {
    return NextResponse.json({ error: "Bare creator kan godta/avslå" }, { status: 403 });
  }

  await db.sponsorThread.update({
    where: { id: threadId },
    data:  { status: status as ThreadStatus },
  });

  return NextResponse.json({ ok: true, status });
}
