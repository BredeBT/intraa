import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/** GET /api/stream/chat?orgId=X — returns messages for stream-chat channel */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  const channel = await db.channel.findUnique({
    where: { orgId_name: { orgId, name: "stream-chat" } },
  });
  if (!channel) return NextResponse.json({ messages: [], channelId: null });

  const messages = await db.message.findMany({
    where:   { channelId: channel.id, parentMessageId: null },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
    take:    100,
  });

  return NextResponse.json({ messages, channelId: channel.id });
}

/** POST /api/stream/chat — send a message, auto-create channel if needed */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { orgId, content } = (await request.json()) as { orgId: string; content: string };
  if (!orgId || !content?.trim()) return NextResponse.json({ error: "Mangler data" }, { status: 400 });

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  const channel = await db.channel.upsert({
    where:  { orgId_name: { orgId, name: "stream-chat" } },
    create: { orgId, name: "stream-chat", type: "STREAM" },
    update: {},
  });

  const message = await db.message.create({
    data: { channelId: channel.id, authorId: session.user.id, content: content.trim() },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json({ message, channelId: channel.id });
}
