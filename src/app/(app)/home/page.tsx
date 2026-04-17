import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import HomeClient from "./HomeClient";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const fiveMinAgo  = new Date(Date.now() - 5 * 60 * 1000);
  const weekAgo     = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

  const [myMemberships, allCommunities, friendships, pendingRequests] = await Promise.all([
    db.membership.findMany({
      where:   { userId },
      include: {
        organization: {
          select: {
            id: true, slug: true, name: true, type: true,
            _count:         { select: { memberships: true } },
            theme:          { select: { logoUrl: true, bannerUrl: true } },
            streamSettings: { select: { twitchChannel: true } },
            streamSessions: { where: { endedAt: null, startedAt: { gte: fourHoursAgo } }, select: { id: true }, take: 1 },
          },
        },
      },
    }),

    db.organization.findMany({
      where:   { type: "COMMUNITY", visibility: { not: "private" } },
      include: {
        _count:         { select: { memberships: true } },
        theme:          { select: { logoUrl: true, bannerUrl: true } },
        streamSettings: { select: { twitchChannel: true } },
        streamSessions: { where: { endedAt: null, startedAt: { gte: fourHoursAgo } }, select: { id: true }, take: 1 },
      },
      orderBy: { memberships: { _count: "desc" } },
      take:    30,
    }),

    db.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender:   { select: { id: true, name: true, avatarUrl: true, lastActive: true } },
        receiver: { select: { id: true, name: true, avatarUrl: true, lastActive: true } },
      },
    }),

    db.friendship.findMany({
      where:   { receiverId: userId, status: "PENDING" },
      include: { sender: { select: { id: true, name: true, avatarUrl: true, bio: true } } },
    }),
  ]);

  const myOrgIds   = myMemberships.map((m) => m.organizationId);
  const myOrgIdSet = new Set(myOrgIds);

  // Second round — per-org post counts and online user counts
  const [postCountsRaw, onlineCountsRaw] = myOrgIds.length > 0
    ? await Promise.all([
        db.post.groupBy({
          by:    ["orgId"],
          where: { orgId: { in: myOrgIds }, createdAt: { gte: weekAgo } },
          _count: { id: true },
        }),
        Promise.all(
          myOrgIds.map((orgId) =>
            db.user
              .count({
                where: {
                  memberships: { some: { organizationId: orgId } },
                  lastActive:  { gte: fiveMinAgo },
                },
              })
              .then((count) => ({ orgId, count }))
          )
        ),
      ])
    : [[], []] as [{ orgId: string; _count: { id: number } }[], { orgId: string; count: number }[]];

  const postCountMap   = new Map(
    (postCountsRaw as { orgId: string; _count: { id: number } }[]).map((r) => [r.orgId, r._count.id])
  );
  const onlineCountMap = new Map(
    (onlineCountsRaw as { orgId: string; count: number }[]).map((r) => [r.orgId, r.count])
  );

  const myCommunities = myMemberships
    .filter((m) => m.organization.type === "COMMUNITY")
    .map((m) => ({
      id:          m.organization.id,
      slug:        m.organization.slug,
      name:        m.organization.name,
      memberCount: m.organization._count.memberships,
      postCount:   postCountMap.get(m.organization.id) ?? 0,
      onlineCount: onlineCountMap.get(m.organization.id) ?? 0,
      isLive:      m.organization.streamSessions.length > 0 && !!m.organization.streamSettings?.twitchChannel?.trim(),
      logoUrl:     m.organization.theme?.logoUrl ?? null,
      bannerUrl:   m.organization.theme?.bannerUrl ?? null,
    }));

  const recommendedCommunities = allCommunities
    .filter((c) => !myOrgIdSet.has(c.id))
    .map((c) => ({
      id:          c.id,
      slug:        c.slug,
      name:        c.name,
      description: c.description,
      memberCount: c._count.memberships,
      postCount:   0,
      onlineCount: 0,
      isLive:      c.streamSessions.length > 0 && !!c.streamSettings?.twitchChannel?.trim(),
      logoUrl:     c.theme?.logoUrl ?? null,
      bannerUrl:   c.theme?.bannerUrl ?? null,
    }));

  const friends = friendships
    .map((f) => {
      const other = f.senderId === userId ? f.receiver : f.sender;
      return {
        id:       other.id,
        name:     other.name,
        avatarUrl: other.avatarUrl,
        isOnline: other.lastActive ? other.lastActive >= fiveMinAgo : false,
      };
    })
    .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));

  return (
    <HomeClient
      userName={session.user.name ?? ""}
      myCommunities={myCommunities}
      recommendedCommunities={recommendedCommunities}
      friends={friends}
      pendingRequests={pendingRequests.map((r) => ({ id: r.id, sender: r.sender }))}
    />
  );
}
