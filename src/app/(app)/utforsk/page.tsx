import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import UtforskClient from "./UtforskClient";

export const dynamic    = "force-dynamic";
export const revalidate = 0;

export default async function UtforskPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // Hent første batch på server-side så siden vises umiddelbart.
  // Client overtar deretter ved søk / sortering.
  const [communities, myMemberships, pendingRequests] = await Promise.all([
    db.organization.findMany({
      where:   { type: "COMMUNITY", visibility: { not: "private" } },
      include: {
        _count:         { select: { memberships: true } },
        streamSessions: { where: { endedAt: null }, select: { id: true }, take: 1 },
        theme:          { select: { logoUrl: true, bannerUrl: true } },
      },
      orderBy: { memberships: { _count: "desc" } },
      take:    60,
    }),
    db.membership.findMany({ where: { userId }, select: { organizationId: true } }),
    db.joinRequest.findMany({
      where:  { userId, status: "PENDING" },
      select: { organizationId: true },
    }),
  ]);

  const memberOrgIds  = new Set(myMemberships.map((m) => m.organizationId));
  const pendingOrgIds = new Set(pendingRequests.map((r) => r.organizationId));

  const initial = communities.map((c) => ({
    id:                c.id,
    slug:              c.slug,
    name:              c.name,
    description:       c.description,
    joinType:          c.joinType,
    requiresFanpass:   c.requiresFanpassToJoin,
    memberCount:       c._count.memberships,
    isLive:            c.streamSessions.length > 0,
    logoUrl:           c.theme?.logoUrl ?? null,
    bannerUrl:         c.theme?.bannerUrl ?? null,
    isMember:          memberOrgIds.has(c.id),
    hasPendingRequest: pendingOrgIds.has(c.id),
  }));

  return <UtforskClient initialCommunities={initial} />;
}
