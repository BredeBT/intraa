import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getUserOrg } from "@/server/getUserOrg";
import { seedDefaultFeatures } from "@/server/seedFeatures";
import { COMPANY_FEATURES, COMMUNITY_FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

/**
 * GET /api/layout/bootstrap
 * Returns features + theme in a single round trip instead of two separate calls.
 * Used by the app layout on org change.
 */
export async function GET() {
  const ctx = await getUserOrg();
  if (!ctx) return NextResponse.json({ features: [], theme: null });

  const [org, theme] = await Promise.all([
    db.organization.findUnique({
      where:   { id: ctx.organizationId },
      include: { features: true },
    }),
    db.tenantTheme.findUnique({
      where: { organizationId: ctx.organizationId },
    }),
  ]);

  if (!org) return NextResponse.json({ features: [], theme });

  // Auto-seed features if none recorded yet
  let featureRows = org.features;
  if (featureRows.length === 0) {
    await seedDefaultFeatures(org.id, org.type);
    featureRows = await db.organizationFeature.findMany({ where: { organizationId: org.id } });
  } else {
    // Backfill any features added after initial seed
    const expectedFeatures = org.type === "COMPANY" ? COMPANY_FEATURES : COMMUNITY_FEATURES;
    const existingKeys     = new Set(featureRows.map((f) => f.feature));
    const missing          = expectedFeatures.filter((f) => !existingKeys.has(f));
    if (missing.length > 0) {
      await seedDefaultFeatures(org.id, org.type);
      featureRows = await db.organizationFeature.findMany({ where: { organizationId: org.id } });
    }
  }

  const features = featureRows.filter((f) => f.enabled).map((f) => f.feature);

  return NextResponse.json({ features, theme });
}
