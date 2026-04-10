import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// GET /api/groups/[id]/messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { id: groupId } = await params;

  const membership = await db.groupChatMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const messages = await db.groupMessage.findMany({
    where:   { groupId },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
    take:    100,
  });

  // Update lastReadAt
  await db.groupChatMember.update({
    where: { groupId_userId: { groupId, userId: session.user.id } },
    data:  { lastReadAt: new Date() },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id:        m.id,
      content:   m.content,
      imageUrl:  m.imageUrl,
      createdAt: m.createdAt.toISOString(),
      author:    m.author,
    })),
  });
}

// POST /api/groups/[id]/messages
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { id: groupId } = await params;
  const body = await req.json() as { content?: string; imageUrl?: string };
  const { content, imageUrl } = body;

  if (!content?.trim() && !imageUrl)
    return NextResponse.json({ error: "Meldingen er tom" }, { status: 400 });

  const membership = await db.groupChatMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const message = await db.groupMessage.create({
    data:    { groupId, authorId: session.user.id, content: content?.trim() ?? "", imageUrl: imageUrl ?? null },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // Update lastReadAt for sender
  await db.groupChatMember.update({
    where: { groupId_userId: { groupId, userId: session.user.id } },
    data:  { lastReadAt: new Date() },
  });

  return NextResponse.json({
    message: {
      id:        message.id,
      content:   message.content,
      imageUrl:  message.imageUrl,
      createdAt: message.createdAt.toISOString(),
      author:    message.author,
    },
  });
}
