import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { seedDefaultFeatures } from "@/server/seedFeatures";

export const dynamic = "force-dynamic";

/** POST /api/superadmin/tenants — create a new organization */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const body = await request.json() as {
    name:     string;
    slug:     string;
    type:     "COMPANY" | "COMMUNITY";
    plan?:    "FREE" | "PRO" | "ENTERPRISE";
    ownerId?: string;
  };

  const { name, slug, type } = body;
  const plan    = body.plan    ?? "FREE";
  const ownerId = body.ownerId ?? session.user.id;

  if (!name?.trim() || !slug?.trim() || !type) {
    return NextResponse.json({ error: "Mangler påkrevde felt" }, { status: 400 });
  }

  const slugClean = slug.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slugClean)) {
    return NextResponse.json({ error: "Slug kan kun inneholde a-z, 0-9 og bindestrek" }, { status: 400 });
  }

  const existing = await db.organization.findUnique({ where: { slug: slugClean } });
  if (existing) return NextResponse.json({ error: `Slug «${slugClean}» er allerede i bruk` }, { status: 409 });

  const org = await db.organization.create({
    data: {
      name: name.trim(),
      slug: slugClean,
      type: type as never,
      plan: plan as never,
    },
  });

  // Seed default features
  await seedDefaultFeatures(org.id, type);

  // Create default channels
  await db.channel.createMany({
    data: [
      { orgId: org.id, name: "generelt" },
      { orgId: org.id, name: "kunngjøringer" },
      { orgId: org.id, name: "tilfeldig" },
    ],
  });

  // Add owner as OWNER member
  await db.membership.create({
    data: {
      userId:         ownerId,
      organizationId: org.id,
      role:           "OWNER",
    },
  });

  return NextResponse.json({ org });
}

/** GET /api/superadmin/tenants — list all orgs with stats */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const orgs = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { memberships: true, posts: true } },
      theme:  { select: { logoUrl: true, bannerUrl: true } },
    },
  });

  return NextResponse.json({ orgs });
}
