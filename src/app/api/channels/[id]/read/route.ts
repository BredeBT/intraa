import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// PATCH /api/channels/[id]/read — mark channel as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { id: channelId } = await params;

  await db.channelRead.upsert({
    where:  { userId_channelId: { userId: session.user.id, channelId } },
    create: { userId: session.user.id, channelId, readAt: new Date() },
    update: { readAt: new Date() },
  });

  // Auto-dismiss: clear MENTION + BROADCAST + STORY notifications for this channel
  await db.notification.deleteMany({
    where: {
      userId: session.user.id,
      type:   { in: ["MENTION", "BROADCAST", "STORY"] },
      metadata: { path: ["channelId"], equals: channelId },
    },
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
