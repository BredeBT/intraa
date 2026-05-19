import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/** GET /api/superadmin/orgs — list orgs (id, slug, name). Superadmin only. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const caller = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { isSuperAdmin: true },
  });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "100"), 500);

  const orgs = await db.organization.findMany({
    where:   { slug: { not: "intraa-support" } },
    orderBy: { name: "asc" },
    select:  { id: true, slug: true, name: true },
    take:    limit,
  });

  return NextResponse.json({ orgs });
}
