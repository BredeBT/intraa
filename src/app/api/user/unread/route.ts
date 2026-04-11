import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ total: 0 });
  const userId = session.user.id;

  // DM unreads: messages where I am receiver and not read
  const dmUnread = await db.directMessage.count({
    where: { receiverId: userId, readAt: null },
  });

  // Group unreads: group messages sent after my lastReadAt (or all if never read)
  const memberships = await db.groupChatMember.findMany({
    where: { userId },
    select: { groupId: true, lastReadAt: true },
  });

  let groupUnread = 0;
  for (const m of memberships) {
    const count = await db.groupMessage.count({
      where: {
        groupId:  m.groupId,
        authorId: { not: userId },
        ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
      },
    });
    groupUnread += count;
  }

  // Channel unreads: messages after my ChannelRead.readAt
  const channelReads = await db.channelRead.findMany({
    where: { userId },
    select: { channelId: true, readAt: true },
  });
  const readMap = new Map(channelReads.map((r) => [r.channelId, r.readAt]));

  // Get all channels the user has access to
  const userChannels = await db.channel.findMany({
    where: {
      type:         { not: "DIRECT" },
      organization: { memberships: { some: { userId } } },
    },
    select: { id: true },
  });

  let channelUnread = 0;
  for (const ch of userChannels) {
    const lastRead = readMap.get(ch.id);
    const count = await db.message.count({
      where: {
        channelId:       ch.id,
        parentMessageId: null,
        authorId:        { not: userId },
        ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
      },
    });
    channelUnread += count;
  }

  return NextResponse.json(
    { total: dmUnread + groupUnread + channelUnread, dm: dmUnread, group: groupUnread, channel: channelUnread },
    { headers: { "Cache-Control": "private, max-age=20" } },
  );
}
