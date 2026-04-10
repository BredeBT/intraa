import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

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
  const cursor = req.nextUrl.searchParams.get("cursor");

  const messages = await db.directMessage.findMany({
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
  });

  return NextResponse.json({ messages });
}

// POST /api/dm/[userId] — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;

  if (!(await areFriends(session.user.id, userId))) {
    return NextResponse.json({ error: "Dere er ikke venner" }, { status: 403 });
  }

  const { content } = await req.json() as { content?: string };
  if (!content?.trim()) return NextResponse.json({ error: "Innhold er påkrevd" }, { status: 400 });

  const message = await db.directMessage.create({
    data: {
      senderId:   session.user.id,
      receiverId: userId,
      content:    content.trim(),
    },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json({ message }, { status: 201 });
}
