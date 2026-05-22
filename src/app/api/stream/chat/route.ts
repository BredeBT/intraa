import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { updateLastActive } from "@/lib/updateLastActive";

export const dynamic = "force-dynamic";

const STALE_CUTOFF_MS = 60 * 60 * 1000; // 60 min

/**
 * Self-healing cleanup: deletes stream-chat messages older than the most recent
 * stream-session's endedAt + 60min. Called inline on every GET/POST so chat
 * cleans itself up without relying on a cron job.
 */
async function cleanupStaleChat(orgId: string): Promise<void> {
  const channel = await db.channel.findUnique({
    where:  { orgId_name: { orgId, name: "stream-chat" } },
    select: { id: true },
  });
  if (!channel) return;

  // Active session (no endedAt OR endedAt within last 60 min) → don't clean
  const activeSession = await db.streamSession.findFirst({
    where: {
      organizationId: orgId,
      OR: [
        { endedAt: null },
        { endedAt: { gt: new Date(Date.now() - STALE_CUTOFF_MS) } },
      ],
    },
    select: { id: true },
  });
  if (activeSession) return;

  // Otherwise: delete all messages in stream-chat (they're from an old session)
  await db.message.deleteMany({ where: { channelId: channel.id } });

  // Also clean up the closed StreamSession rows
  await db.streamSession.deleteMany({
    where: {
      organizationId: orgId,
      endedAt:        { not: null, lte: new Date(Date.now() - STALE_CUTOFF_MS) },
    },
  });
}

/** GET /api/stream/chat?orgId=X — returns messages for stream-chat channel */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  void updateLastActive(session.user.id);

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  // Self-healing cleanup before returning messages
  await cleanupStaleChat(orgId);

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
