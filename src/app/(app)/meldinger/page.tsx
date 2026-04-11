import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import MeldingerClient from "./MeldingerClient";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

export default async function MeldingerPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; channelId?: string; groupId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { userId: initialUserId, channelId: initialChannelId, groupId: initialGroupId } = await searchParams;

  // ── Fetch all data in parallel ───────────────────────────────────────────────
  const [memberships, friendships, groupMemberships, channelReads] = await Promise.all([
    db.membership.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id:   true,
            name: true,
            type: true,
            slug: true,
            theme: { select: { logoUrl: true } },
            channels: {
              where:   { type: { not: "DIRECT" } },
              orderBy: { name: "asc" },
              select:  { id: true, name: true, type: true },
            },
          },
        },
      },
    }),
    db.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ senderId: userId }, { receiverId: userId }] },
      include: {
        sender:   { select: { id: true, name: true, avatarUrl: true } },
        receiver: { select: { id: true, name: true, avatarUrl: true } },
      },
      take: 20,
    }),
    db.groupChatMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members:  { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 10,
    }),
    db.channelRead.findMany({
      where:  { userId },
      select: { channelId: true, readAt: true },
    }),
  ]);

  // ── Channel unread counts — all parallel ─────────────────────────────────────
  const channelReadMap  = new Map(channelReads.map((r) => [r.channelId, r.readAt]));
  const allChannelIds   = memberships.flatMap((m) => m.organization.channels.map((c) => c.id));

  const channelUnreadEntries = await Promise.all(
    allChannelIds.map(async (channelId) => {
      const lastRead = channelReadMap.get(channelId);
      const count = await db.message.count({
        where: {
          channelId,
          parentMessageId: null,
          authorId:        { not: userId },
          ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
        },
      });
      return [channelId, count] as const;
    })
  );
  const channelUnreadMap = new Map(channelUnreadEntries);

  const communities = memberships.map((m) => ({
    orgId:   m.organization.id,
    orgName: m.organization.name,
    orgType: m.organization.type,
    logoUrl: m.organization.theme?.logoUrl ?? null,
    role:    m.role,
    channels: m.organization.channels.map((ch) => ({
      id:     ch.id,
      name:   ch.name,
      type:   ch.type,
      unread: channelUnreadMap.get(ch.id) ?? 0,
    })),
  }));

  // ── Org members — single bulk query instead of N serial queries ───────────────
  const allOrgIds = memberships.map((m) => m.organization.id);
  const orgMembersRaw = await db.membership.findMany({
    where:    { organizationId: { in: allOrgIds }, userId: { not: userId } },
    select:   { user: { select: { id: true, name: true } } },
    distinct: ["userId"],
  });
  const allOrgMembers = orgMembersRaw.map((m) => ({ id: m.user.id, name: m.user.name }));

  // ── DM conversations — lastMessage + unread in parallel ──────────────────────
  const friends = friendships.map((f) => {
    const friend = f.senderId === userId ? f.receiver : f.sender;
    return { id: friend.id, name: friend.name, avatarUrl: friend.avatarUrl };
  });

  const conversations = await Promise.all(
    friends.map(async (friend) => {
      const [lastMessage, unreadCount] = await Promise.all([
        db.directMessage.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: friend.id },
              { senderId: friend.id, receiverId: userId },
            ],
          },
          orderBy: { createdAt: "desc" },
          select:  { content: true, createdAt: true },
        }),
        db.directMessage.count({
          where: { senderId: friend.id, receiverId: userId, readAt: null },
        }),
      ]);
      return {
        friend,
        lastMessage: lastMessage
          ? { content: lastMessage.content, createdAt: lastMessage.createdAt.toISOString() }
          : null,
        unreadCount,
      };
    })
  );

  conversations.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ?? "0";
    const bTime = b.lastMessage?.createdAt ?? "0";
    return bTime.localeCompare(aTime);
  });

  // ── Groups ───────────────────────────────────────────────────────────────────
  const groups = groupMemberships.map((gm) => {
    const lastMsg = gm.group.messages[0];
    const unread  = gm.lastReadAt
      ? gm.group.messages.filter((m) => m.createdAt > gm.lastReadAt! && m.authorId !== userId).length
      : 0;
    return {
      id:          gm.group.id,
      name:        gm.group.name,
      createdBy:   gm.group.createdBy,
      lastMessage: lastMsg
        ? { content: lastMsg.content, createdAt: lastMsg.createdAt.toISOString() }
        : null,
      unread,
      members: gm.group.members.map((m) => ({
        id:        m.user.id,
        name:      m.user.name,
        avatarUrl: m.user.avatarUrl,
      })),
    };
  });

  // ── Invitable people (deduped friends + org members) ─────────────────────────
  const friendIds = new Set(friends.map((f) => f.id));
  const invitablePeople = [
    ...friends,
    ...allOrgMembers
      .filter((m) => !friendIds.has(m.id))
      .map((m) => ({ id: m.id, name: m.name, avatarUrl: null as string | null })),
  ];

  return (
    <MeldingerClient
      currentUserId={userId}
      currentUserName={session.user.name ?? ""}
      communities={communities}
      conversations={conversations}
      groups={groups}
      invitablePeople={invitablePeople}
      allMembers={allOrgMembers}
      initialUserId={initialUserId ?? null}
      initialChannelId={initialChannelId ?? null}
      initialGroupId={initialGroupId ?? null}
    />
  );
}
