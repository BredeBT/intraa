import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// GET /api/discover/communities?q=&tag=
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q   = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const tag = req.nextUrl.searchParams.get("tag") ?? "";

  const communities = await db.organization.findMany({
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
    orderBy: { memberships: { _count: "desc" } },
    take: 50,
  });

  return NextResponse.json({ communities: communities.map((c) => ({
    id:          c.id,
    slug:        c.slug,
    name:        c.name,
    description: c.description,
    joinType:    c.joinType,
    memberCount: c._count.memberships,
    isLive:      c.streamSessions.length > 0,
    logoUrl:     c.theme?.logoUrl ?? null,
    bannerUrl:   c.theme?.bannerUrl ?? null,
  })) });
}
