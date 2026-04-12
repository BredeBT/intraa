import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const search = searchParams.get("search")?.trim() ?? "";
  const orgId  = searchParams.get("orgId")?.trim() ?? "";
  const sort   = searchParams.get("sort") ?? "newest";

  const orderBy = sort === "oldest"
    ? { createdAt: "asc" as const }
    : sort === "name"
    ? { name: "asc" as const }
    : { createdAt: "desc" as const };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (orgId) {
    where.memberships = { some: { organizationId: orgId } };
  }

  if (search) {
    where.OR = [
      { name:     { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { email:    { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy,
      skip:  (page - 1) * limit,
      take:  limit,
      select: {
        id:          true,
        name:        true,
        username:    true,
        email:       true,
        avatarUrl:   true,
        isSuperAdmin: true,
        createdAt:   true,
        _count:      { select: { memberships: true } },
        fanPasses:   { where: { status: "ACTIVE", cancelledAt: null }, select: { id: true, endDate: true }, take: 1 },
      },
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, limit });
}
