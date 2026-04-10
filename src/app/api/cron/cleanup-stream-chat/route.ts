import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/** POST /api/cron/cleanup-stream-chat — deletes stream-chat messages for orgs whose stream ended >60min ago */
export async function POST(request: Request) {
  const { organizationId } = (await request.json().catch(() => ({}))) as { organizationId?: string };

  const cutoff = new Date(Date.now() - 60 * 60 * 1000);

  const where = organizationId
    ? { organizationId, endedAt: { not: null, lte: cutoff } }
    : { endedAt: { not: null, lte: cutoff } };

  const sessions = await db.streamSession.findMany({ where });

  for (const session of sessions) {
    const channel = await db.channel.findUnique({
      where: { orgId_name: { orgId: session.organizationId, name: "stream-chat" } },
    });
    if (channel) {
      await db.message.deleteMany({ where: { channelId: channel.id } });
    }
    await db.streamSession.delete({ where: { id: session.id } });
  }

  return NextResponse.json({ cleaned: sessions.length });
}
