import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { SUPERADMIN_FEATURE_GROUPS } from "@/lib/featureGroups";
import FeatureToggles from "./FeatureToggles";

export default async function FunksjonerPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  const org = await db.organization.findUnique({
    where:   { id: orgId },
    include: { features: true },
  });
  if (!org) notFound();

  // Build a map of all known features and their current state
  // Features not yet in DB default to false
  const featureMap = Object.fromEntries(org.features.map((f) => [f.feature, f.enabled]));

  const allFeatureKeys = SUPERADMIN_FEATURE_GROUPS.flatMap((g) => g.features.map((f) => f.key));
  const allFeatures    = allFeatureKeys.map((key) => ({
    feature: key,
    enabled: featureMap[key] ?? false,
  }));

  return (
    <div className="px-8 py-8">
      <h2 className="mb-1 text-lg font-semibold text-white">Funksjoner</h2>
      <p className="mb-2 text-sm text-zinc-500">
        Aktiver eller deaktiver funksjoner for denne tenanten.
      </p>
      <div className="mb-6 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
        <p className="text-xs text-indigo-400">
          Som superadmin kan du aktivere alle features uavhengig av org-type.
        </p>
      </div>
      <FeatureToggles orgId={org.id} initial={allFeatures} />
    </div>
  );
}
