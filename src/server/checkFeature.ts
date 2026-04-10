import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getUserOrg } from "@/server/getUserOrg";

/** Call at the top of a page server component. Triggers notFound() if the feature is disabled for the user's org. */
export async function checkFeature(feature: string) {
  const ctx = await getUserOrg();
  if (!ctx) return;

  const row = await db.organizationFeature.findUnique({
    where: { organizationId_feature: { organizationId: ctx.organizationId, feature } },
  });

  if (row && !row.enabled) notFound();
}
