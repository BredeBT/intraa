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
            streamSessions: { where: { endedAt: null }, select: { id: true }, take: 1 },
          },
        },
      },
    }),

    db.organization.findMany({
      where:   { type: "COMMUNITY" },
      include: {
        _count:         { select: { memberships: true } },
        theme:          { select: { logoUrl: true, bannerUrl: true } },
        streamSettings: { select: { twitchChannel: true } },
        streamSessions: { where: { endedAt: null }, select: { id: true }, take: 1 },
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
        sender:   { select: { id: true, name: true, avatarUrl: true, username: true, status: true } },
        receiver: { select: { id: true, name: true, avatarUrl: true, username: true, status: true } },
      },
    }),

    db.friendship.findMany({
      where:   { receiverId: userId, status: "PENDING" },
      include: { sender: { select: { id: true, name: true, avatarUrl: true, bio: true } } },
    }),
  ]);

  const myOrgIds   = myMemberships.map((m) => m.organizationId);
  const myOrgIdSet = new Set(myOrgIds);
  const weekAgo    = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Second round — needs myOrgIds
  const [postCountsRaw, activityPosts] = myOrgIds.length > 0
    ? await Promise.all([
        db.post.groupBy({
          by:    ["orgId"],
          where: { orgId: { in: myOrgIds }, createdAt: { gte: weekAgo } },
          _count: { id: true },
        }),
        db.post.findMany({
          where:   { orgId: { in: myOrgIds } },
          orderBy: { createdAt: "desc" },
          take:    10,
          include: {
            author:       { select: { name: true, avatarUrl: true } },
            organization: { select: { name: true, slug: true } },
          },
        }),
      ])
    : [[], []] as [{ orgId: string; _count: { id: number } }[], typeof activityPostsPlaceholder];

  // Satisfy TS — placeholder type used only for the empty branch above
  type ActivityPost = Awaited<ReturnType<typeof db.post.findMany<{
    include: { author: { select: { name: true; avatarUrl: true } }; organization: { select: { name: true; slug: true } } };
  }>>>[number];
  const activityPostsPlaceholder = [] as ActivityPost[];
  void activityPostsPlaceholder; // suppress unused-var

  const postCountMap = new Map(
    (postCountsRaw as { orgId: string; _count: { id: number } }[])
      .map((r) => [r.orgId, r._count.id])
  );

  const myCommunities = myMemberships
    .filter((m) => m.organization.type === "COMMUNITY")
    .map((m) => ({
      id:          m.organization.id,
      slug:        m.organization.slug,
      name:        m.organization.name,
      memberCount: m.organization._count.memberships,
      postCount:   postCountMap.get(m.organization.id) ?? 0,
      onlineCount: 0, // TODO: Supabase Presence
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

  const friends = friendships.map((f) => ({
    friendshipId: f.id,
    friend: f.senderId === userId ? f.receiver : f.sender,
  }));

  type ActivityItem =
    | { type: "post"; createdAt: string; authorName: string | null; authorAvatar: string | null; orgName: string; orgSlug: string; preview: string };

  const posts = activityPosts as ActivityPost[];
  const activity: ActivityItem[] = posts.map((p) => ({
    type:        "post",
    createdAt:   p.createdAt.toISOString(),
    authorName:  p.author.name,
    authorAvatar: p.author.avatarUrl,
    orgName:     p.organization.name,
    orgSlug:     p.organization.slug,
    preview:     p.content.replace(/<[^>]+>/g, "").slice(0, 60),
  }));

  return (
    <HomeClient
      userName={session.user.name ?? ""}
      myCommunities={myCommunities}
      recommendedCommunities={recommendedCommunities}
      friends={friends}
      pendingRequests={pendingRequests.map((r) => ({ id: r.id, sender: r.sender }))}
      activity={activity}
    />
  );
}
