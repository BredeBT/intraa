import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * Returns total unread across DMs, group chats and org-channels.
 * Tidligere kjørte vi 1 COUNT-query per kanal og per gruppe (N+1).
 * Nå: 3 queries totalt — én per kategori, batched via raw SQL JOINs.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ total: 0 });
  const userId = session.user.id;

  const [dmRow, groupRow, channelRow] = await Promise.all([
    // DMs: messages where I'm receiver and not read
    db.directMessage.count({ where: { receiverId: userId, readAt: null } }),

    // Group chats: én query med LEFT JOIN på medlemskap (lastReadAt per gruppe)
    db.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(gm.id)::bigint AS total
      FROM "GroupMessage" gm
      INNER JOIN "GroupChatMember" gcm
        ON gcm."groupId" = gm."groupId" AND gcm."userId" = ${userId}
      WHERE gm."authorId" != ${userId}
        AND (gcm."lastReadAt" IS NULL OR gm."createdAt" > gcm."lastReadAt")
    `,

    // Org-kanaler: én query med JOIN på Membership + LEFT JOIN på ChannelRead
    db.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(m.id)::bigint AS total
      FROM "Message" m
      INNER JOIN "Channel" c ON c.id = m."channelId"
      INNER JOIN "Membership" mem
        ON mem."organizationId" = c."orgId" AND mem."userId" = ${userId}
      LEFT JOIN "ChannelRead" cr
        ON cr."channelId" = m."channelId" AND cr."userId" = ${userId}
      WHERE c.type != 'DIRECT'
        AND m."authorId" != ${userId}
        AND m."parentMessageId" IS NULL
        AND (cr."readAt" IS NULL OR m."createdAt" > cr."readAt")
    `,
  ]);

  const dmUnread      = dmRow;
  const groupUnread   = Number(groupRow[0]?.total ?? BigInt(0));
  const channelUnread = Number(channelRow[0]?.total ?? BigInt(0));

  return NextResponse.json(
    { total: dmUnread + groupUnread + channelUnread, dm: dmUnread, group: groupUnread, channel: channelUnread },
    { headers: { "Cache-Control": "private, max-age=20" } },
  );
}
