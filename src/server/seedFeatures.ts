"use server";

import { db } from "@/server/db";
import { COMPANY_FEATURES, COMMUNITY_FEATURES } from "@/lib/features";
import type { Feature } from "@/lib/features";

// Features that are off by default and must be explicitly enabled
const DISABLED_BY_DEFAULT = new Set<Feature>(["live"]);

export async function seedDefaultFeatures(orgId: string, type: "COMPANY" | "COMMUNITY") {
  const features: Feature[] = type === "COMPANY" ? COMPANY_FEATURES : COMMUNITY_FEATURES;
  await db.organizationFeature.createMany({
    data: features.map((feature) => ({
      organizationId: orgId,
      feature,
      enabled: !DISABLED_BY_DEFAULT.has(feature),
    })),
    skipDuplicates: true,
  });
}
