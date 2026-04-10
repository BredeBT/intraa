import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import HomeClient from "./HomeClient";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [myMemberships, allCommunities, friendships, pendingRequests] = await Promise.all([
    // My communities
    db.membership.findMany({
      where:   { userId: session.user.id },
      include: {
        organization: {
          select: {
            id: true, slug: true, name: true, type: true,
            _count:  { select: { memberships: true } },
            theme:   { select: { logoUrl: true, bannerUrl: true } },
            streamSessions: { where: { endedAt: null }, select: { id: true }, take: 1 },
          },
        },
      },
    }),

    // Discover: all COMMUNITY orgs sorted by member count
    db.organization.findMany({
      where:   { type: "COMMUNITY" },
      include: {
        _count:         { select: { memberships: true } },
        theme:          { select: { logoUrl: true, bannerUrl: true } },
        streamSessions: { where: { endedAt: null }, select: { id: true }, take: 1 },
      },
      orderBy: { memberships: { _count: "desc" } },
      take: 30,
    }),

    // Friends (accepted)
    db.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
      },
      include: {
        sender:   { select: { id: true, name: true, avatarUrl: true, status: true } },
        receiver: { select: { id: true, name: true, avatarUrl: true, status: true } },
      },
    }),

    // Pending friend requests (I received)
    db.friendship.findMany({
      where: { receiverId: session.user.id, status: "PENDING" },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, bio: true } },
      },
    }),
  ]);

  const myOrgIds = new Set(myMemberships.map((m) => m.organizationId));

  const myCommunities = myMemberships
    .filter((m) => m.organization.type === "COMMUNITY")
    .map((m) => ({
      id:          m.organization.id,
      slug:        m.organization.slug,
      name:        m.organization.name,
      memberCount: m.organization._count.memberships,
      isLive:      m.organization.streamSessions.length > 0,
      logoUrl:     m.organization.theme?.logoUrl ?? null,
      bannerUrl:   m.organization.theme?.bannerUrl ?? null,
    }));

  const recommendedCommunities = allCommunities
    .filter((c) => !myOrgIds.has(c.id))
    .map((c) => ({
      id:          c.id,
      slug:        c.slug,
      name:        c.name,
      description: c.description,
      memberCount: c._count.memberships,
      isLive:      c.streamSessions.length > 0,
      logoUrl:     c.theme?.logoUrl ?? null,
      bannerUrl:   c.theme?.bannerUrl ?? null,
    }));

  const friends = friendships.map((f) => ({
    friendshipId: f.id,
    friend: f.senderId === session.user.id ? f.receiver : f.sender,
  }));

  return (
    <HomeClient
      userName={session.user.name ?? ""}
      myCommunities={myCommunities}
      recommendedCommunities={recommendedCommunities}
      friends={friends}
      pendingRequests={pendingRequests.map((r) => ({
        id:     r.id,
        sender: r.sender,
      }))}
    />
  );
}
