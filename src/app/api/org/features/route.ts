import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { getUserOrg } from "@/server/getUserOrg";
import { seedDefaultFeatures } from "@/server/seedFeatures";
import { COMPANY_FEATURES, COMMUNITY_FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

/** PATCH /api/org/features — toggle a feature, requires OWNER */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const ctx = await getUserOrg();
  if (!ctx) return NextResponse.json({ error: "Ingen org" }, { status: 400 });

  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: ctx.organizationId } },
  });
  if (membership?.role !== "OWNER") return NextResponse.json({ error: "Kun eier kan endre funksjoner" }, { status: 403 });

  const { feature, enabled } = (await request.json()) as { feature: string; enabled: boolean };
  if (!feature || typeof enabled !== "boolean") return NextResponse.json({ error: "Ugyldig" }, { status: 400 });

  console.log("[org/features] Toggler:", { orgId: ctx.organizationId, feature, enabled });
  const updated = await db.organizationFeature.upsert({
    where:  { organizationId_feature: { organizationId: ctx.organizationId, feature } },
    create: { organizationId: ctx.organizationId, feature, enabled },
    update: { enabled },
  });
  return NextResponse.json(updated);
}

/** GET /api/org/features — returns enabled feature keys for the current user's org */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const ctx = await getUserOrg();
  if (!ctx) return NextResponse.json({ features: [] });

  const org = await db.organization.findUnique({
    where: { id: ctx.organizationId },
    include: { features: true },
  });
  if (!org) return NextResponse.json({ features: [] });

  // Auto-seed if no features recorded yet
  if (org.features.length === 0) {
    await seedDefaultFeatures(org.id, org.type);
    const seeded = await db.organizationFeature.findMany({ where: { organizationId: org.id } });
    const enabled = seeded.filter((f) => f.enabled).map((f) => f.feature);
    return NextResponse.json({ features: enabled });
  }

  // Backfill any features added after initial seed (e.g. "live" added later)
  const expectedFeatures = org.type === "COMPANY" ? COMPANY_FEATURES : COMMUNITY_FEATURES;
  const existingKeys     = new Set(org.features.map((f) => f.feature));
  const missing          = expectedFeatures.filter((f) => !existingKeys.has(f));
  if (missing.length > 0) {
    await seedDefaultFeatures(org.id, org.type); // skipDuplicates handles existing rows
    // Re-fetch to include newly seeded rows
    const all = await db.organizationFeature.findMany({ where: { organizationId: org.id } });
    const enabled = all.filter((f) => f.enabled).map((f) => f.feature);
    return NextResponse.json({ features: enabled });
  }

  const enabled = org.features.filter((f) => f.enabled).map((f) => f.feature);
  return NextResponse.json({ features: enabled });
}
