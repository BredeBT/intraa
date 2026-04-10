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

  // ── Communities + channels ───────────────────────────────────────────────────
  const memberships = await db.membership.findMany({
    where: { userId },
    include: {
      organization: {
        select: {
          id:   true,
          name: true,
          type: true,
          theme: { select: { logoUrl: true } },
          channels: {
            where:   { type: { not: "DIRECT" } },
            orderBy: { name: "asc" },
            select:  { id: true, name: true, type: true },
          },
        },
      },
    },
  });

  // Get channel read times for unread counts
  const channelReads = await db.channelRead.findMany({
    where: { userId },
    select: { channelId: true, readAt: true },
  });
  const channelReadMap = new Map(channelReads.map((r) => [r.channelId, r.readAt]));

  const communities = await Promise.all(
    memberships.map(async (m) => {
      const channels = await Promise.all(
        m.organization.channels.map(async (ch) => {
          const lastRead = channelReadMap.get(ch.id);
          const unread = await db.message.count({
            where: {
              channelId:       ch.id,
              parentMessageId: null,
              authorId:        { not: userId },
              ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
            },
          });
          return { id: ch.id, name: ch.name, type: ch.type, unread };
        })
      );
      return {
        orgId:   m.organization.id,
        orgName: m.organization.name,
        orgType: m.organization.type,
        logoUrl: m.organization.theme?.logoUrl ?? null,
        role:    m.role,
        channels,
      };
    })
  );

  // All org members (for @mentions in channels)
  const allOrgMemberIds = new Set<string>();
  const allOrgMembers: { id: string; name: string | null }[] = [];
  for (const m of memberships) {
    const orgMembers = await db.membership.findMany({
      where:  { organizationId: m.organization.id },
      select: { user: { select: { id: true, name: true } } },
    });
    for (const om of orgMembers) {
      if (!allOrgMemberIds.has(om.user.id) && om.user.id !== userId) {
        allOrgMemberIds.add(om.user.id);
        allOrgMembers.push({ id: om.user.id, name: om.user.name });
      }
    }
  }

  // ── DM conversations ─────────────────────────────────────────────────────────
  const friendships = await db.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: {
      sender:   { select: { id: true, name: true, avatarUrl: true } },
      receiver: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

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
  const groupMemberships = await db.groupChatMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const groups = groupMemberships.map((gm) => {
    const lastMsg = gm.group.messages[0];
    const unread = gm.lastReadAt
      ? gm.group.messages.filter((m) => m.createdAt > gm.lastReadAt! && m.authorId !== userId).length
      : 0; // simplified — will be accurate enough for initial render
    return {
      id:          gm.group.id,
      name:        gm.group.name,
      createdBy:   gm.group.createdBy,
      lastMessage: lastMsg
        ? { content: lastMsg.content, createdAt: lastMsg.createdAt.toISOString() }
        : null,
      unread,
      members:     gm.group.members.map((m) => ({ id: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl })),
    };
  });

  // All people the user can invite to groups (org members + friends, deduped)
  const invitablePeople = [
    ...friends,
    ...allOrgMembers
      .filter((m) => !friends.some((f) => f.id === m.id))
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
