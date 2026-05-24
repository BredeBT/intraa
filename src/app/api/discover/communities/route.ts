import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

// GET /api/discover/communities?q=&sort=trending|new|alphabetical
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const q    = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const sort = req.nextUrl.searchParams.get("sort") ?? "trending";

  const orderBy =
    sort === "new"          ? { createdAt: "desc" as const } :
    sort === "alphabetical" ? { name:      "asc"  as const } :
    /* default: trending */   { memberships: { _count: "desc" as const } };

  const [communities, myMemberships, pendingRequests] = await Promise.all([
    db.organization.findMany({
      where: {
        type:       "COMMUNITY",
        visibility: { not: "private" },
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      include: {
        _count:        { select: { memberships: true } },
        streamSessions: { where: { endedAt: null }, select: { id: true }, take: 1 },
        theme:         { select: { logoUrl: true, bannerUrl: true } },
      },
      orderBy,
      take: 60,
    }),
    db.membership.findMany({
      where:  { userId },
      select: { organizationId: true },
    }),
    db.joinRequest.findMany({
      where:  { userId, status: "PENDING" },
      select: { organizationId: true },
    }),
  ]);

  const memberOrgIds  = new Set(myMemberships.map((m) => m.organizationId));
  const pendingOrgIds = new Set(pendingRequests.map((r) => r.organizationId));

  return NextResponse.json({ communities: communities.map((c) => ({
    id:                 c.id,
    slug:               c.slug,
    name:               c.name,
    description:        c.description,
    joinType:           c.joinType,
    requiresFanpass:    c.requiresFanpassToJoin,
    memberCount:        c._count.memberships,
    isLive:             c.streamSessions.length > 0,
    logoUrl:            c.theme?.logoUrl ?? null,
    bannerUrl:          c.theme?.bannerUrl ?? null,
    isMember:           memberOrgIds.has(c.id),
    hasPendingRequest:  pendingOrgIds.has(c.id),
  })) });
}
