import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export interface OrgSearchResult {
  id:          string;
  slug:        string;
  name:        string;
  description: string | null;
  logoUrl:     string | null;
  memberCount: number;
  isMember:    boolean;
}

// GET /api/organizations/search?q=... — public community search
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ organizations: [] });

  const orgs = await db.organization.findMany({
    where: {
      type:     "COMMUNITY",
      joinType: "OPEN",
      name:     { contains: q, mode: "insensitive" },
    },
    select: {
      id:          true,
      slug:        true,
      name:        true,
      description: true,
      theme:       { select: { logoUrl: true } },
      _count:      { select: { memberships: true } },
      memberships: { where: { userId: session.user.id }, select: { id: true } },
    },
    take: 5,
  });

  const results: OrgSearchResult[] = orgs.map((o) => ({
    id:          o.id,
    slug:        o.slug,
    name:        o.name,
    description: o.description,
    logoUrl:     o.theme?.logoUrl ?? null,
    memberCount: o._count.memberships,
    isMember:    o.memberships.length > 0,
  }));

  return NextResponse.json({ organizations: results });
}
