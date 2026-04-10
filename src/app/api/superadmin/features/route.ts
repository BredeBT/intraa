import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { seedDefaultFeatures } from "@/server/seedFeatures";

export const dynamic = "force-dynamic";

/** GET /api/superadmin/features?orgId=X — returns all features for an org */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "Mangler orgId" }, { status: 400 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: { features: true },
  });
  if (!org) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  // Auto-seed if no features exist yet
  if (org.features.length === 0) {
    await seedDefaultFeatures(orgId, org.type);
    const seeded = await db.organizationFeature.findMany({ where: { organizationId: orgId } });
    return NextResponse.json(seeded);
  }

  return NextResponse.json(org.features);
}

/** PATCH /api/superadmin/features — { orgId, feature, enabled } */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const body = await request.json() as { orgId: string; feature: string; enabled: boolean };
  const { orgId, enabled } = body;
  const feature = body.feature?.toLowerCase().trim();

  if (!orgId || !feature || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
  }

  const updated = await db.organizationFeature.upsert({
    where:  { organizationId_feature: { organizationId: orgId, feature } },
    create: { organizationId: orgId, feature, enabled },
    update: { enabled },
  });

  return NextResponse.json(updated);
}
