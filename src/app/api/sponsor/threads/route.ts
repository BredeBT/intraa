import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/sponsor/threads?status=
 * Liste tråder for innlogget bruker.
 *  - Hvis bruker er SPONSOR: alle tråder de har startet
 *  - Hvis bruker er CREATOR: alle tråder de har mottatt
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const userId = session.user.id;

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const statusFilter = status && ["PENDING", "ACCEPTED", "DECLINED", "ARCHIVED"].includes(status)
    ? { status: status as "PENDING" | "ACCEPTED" | "DECLINED" | "ARCHIVED" }
    : {};

  // Sponsor eller creator?
  const sponsor = await db.sponsorProfile.findUnique({ where: { userId }, select: { id: true } });

  const threads = await db.sponsorThread.findMany({
    where: {
      ...statusFilter,
      ...(sponsor
        ? { sponsorId: sponsor.id }
        : { creatorId: userId }),
    },
    include: {
      sponsor: { select: { id: true, brandName: true, slug: true, logoUrl: true } },
      creator: { select: { id: true, name: true, username: true, avatarUrl: true } },
      _count:  { select: { messages: { where: { readAt: null, NOT: { authorId: userId } } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take:    1,
        select: { content: true, createdAt: true, authorId: true, senderRole: true },
      },
    },
    orderBy: { lastMessageAt: "desc" },
    take:    100,
  });

  return NextResponse.json({
    role: sponsor ? "sponsor" : "creator",
    threads: threads.map((t) => ({
      id:            t.id,
      subject:       t.subject,
      status:        t.status,
      createdAt:     t.createdAt.toISOString(),
      lastMessageAt: t.lastMessageAt.toISOString(),
      sponsor:       t.sponsor,
      creator:       t.creator,
      lastMessage:   t.messages[0] ? {
        content:    t.messages[0].content.slice(0, 200),
        createdAt:  t.messages[0].createdAt.toISOString(),
        senderRole: t.messages[0].senderRole,
        isFromMe:   t.messages[0].authorId === userId,
      } : null,
      unreadCount:   t._count.messages,
    })),
  });
}

/**
 * POST /api/sponsor/threads { creatorId, subject, message }
 * Sponsor starter en ny tråd med en creator.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const userId = session.user.id;

  // Bare SPONSOR med en SponsorProfile kan starte tråder
  const sponsor = await db.sponsorProfile.findUnique({ where: { userId } });
  if (!sponsor) return NextResponse.json({ error: "Du må ha en sponsor-profil for å starte en henvendelse" }, { status: 403 });

  const { creatorId, subject, message } = (await req.json()) as {
    creatorId?: string;
    subject?:   string;
    message?:   string;
  };

  if (!creatorId || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Mangler felt" }, { status: 400 });
  }
  if (creatorId === userId) {
    return NextResponse.json({ error: "Kan ikke kontakte deg selv" }, { status: 400 });
  }
  if (subject.length > 120) {
    return NextResponse.json({ error: "Emne maks 120 tegn" }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Melding maks 2000 tegn" }, { status: 400 });
  }

  // Verifiser at creator finnes og er CREATOR
  const creator = await db.user.findUnique({
    where:  { id: creatorId },
    select: { id: true, userType: true, name: true, isPublic: true },
  });
  if (!creator) return NextResponse.json({ error: "Creator ikke funnet" }, { status: 404 });
  if (creator.userType !== "CREATOR") return NextResponse.json({ error: "Brukeren er ikke en creator" }, { status: 400 });
  if (!creator.isPublic) return NextResponse.json({ error: "Profilen er privat" }, { status: 403 });

  // Hindre spam — én pending-tråd per sponsor↔creator-par av gangen
  const existing = await db.sponsorThread.findFirst({
    where: { sponsorId: sponsor.id, creatorId, status: { in: ["PENDING", "ACCEPTED"] } },
  });
  if (existing) {
    return NextResponse.json({
      ok:                  true,
      alreadyHasThread:    true,
      threadId:            existing.id,
      message:             "Du har allerede en åpen tråd med denne creatoren.",
    });
  }

  const now = new Date();
  const thread = await db.sponsorThread.create({
    data: {
      sponsorId:     sponsor.id,
      creatorId,
      subject:       subject.trim().slice(0, 120),
      status:        "PENDING",
      lastMessageAt: now,
      messages: {
        create: {
          authorId:   userId,
          senderRole: "SPONSOR",
          content:    message.trim().slice(0, 2000),
        },
      },
    },
    select: { id: true },
  });

  // Varsle creator
  await db.notification.create({
    data: {
      userId:    creatorId,
      type:      "SPONSOR_TAG",  // gjenbruker SPONSOR_TAG-type — kunne legge til ny enum-verdi senere
      title:     "Ny sponsor-henvendelse",
      body:      `${sponsor.brandName}: ${subject.trim().slice(0, 80)}`,
      href:      `/sponsor-henvendelser/${thread.id}`,
      iconUrl:   sponsor.logoUrl,
      metadata:  { kind: "sponsor_thread", threadId: thread.id, sponsorId: sponsor.id },
    },
  });

  return NextResponse.json({ ok: true, threadId: thread.id }, { status: 201 });
}
