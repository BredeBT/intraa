import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { stripHtml } from "@/lib/webpush";
import { notifyDM } from "@/server/notifications/dispatch";
import { rateLimit } from "@/lib/rateLimit";

async function areFriends(userId1: string, userId2: string) {
  const f = await db.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    },
  });
  return !!f;
}

// GET /api/dm/[userId] — fetch messages between current user and userId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;

  if (!(await areFriends(session.user.id, userId))) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor");

  const [messages, friend, lastReadFromThem] = await Promise.all([
    db.directMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: userId },
          { senderId: userId, receiverId: session.user.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      take:    50,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    db.user.findUnique({
      where:  { id: userId },
      select: { lastActive: true, status: true },
    }),
    // Friend's most recent read of OUR messages — tells us "Sett N min siden"
    db.directMessage.findFirst({
      where:   { senderId: session.user.id, receiverId: userId, readAt: { not: null } },
      orderBy: { readAt: "desc" },
      select:  { readAt: true, id: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    messages,
    friend: friend ?? {},
    lastReadByThem: lastReadFromThem ?? null,
  });
}

// POST /api/dm/[userId] — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Anti-spam: 30 DM-er per minutt per bruker (≈ aggressiv samtale-tempo OK,
  // men ikke nok for å spamme noen med tusenvis av meldinger).
  const limited = await rateLimit(req, { key: `dm:${session.user.id}`, max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { userId } = await params;

  if (!(await areFriends(session.user.id, userId))) {
    return NextResponse.json({ error: "Dere er ikke venner" }, { status: 403 });
  }

  const { content, imageUrl } = await req.json() as { content?: string; imageUrl?: string };
  if (!content?.trim() && !imageUrl) return NextResponse.json({ error: "Innhold er påkrevd" }, { status: 400 });

  const message = await db.directMessage.create({
    data: {
      senderId:   session.user.id,
      receiverId: userId,
      content:    content?.trim() ?? " ",
      ...(imageUrl ? { imageUrl } : {}),
    },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // Dispatch notification (creates row + push + realtime)
  void notifyDM({
    receiverId:   userId,
    senderId:     session.user.id,
    senderName:   message.sender.name ?? "Noen",
    senderAvatar: message.sender.avatarUrl,
    preview:      stripHtml(message.content).slice(0, 100),
  }).catch(() => {});

  return NextResponse.json({ message }, { status: 201 });
}
