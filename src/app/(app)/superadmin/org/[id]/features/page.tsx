import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { seedDefaultFeatures } from "@/server/seedFeatures";
import { ChevronLeft } from "lucide-react";
import FeatureToggles from "./FeatureToggles";

export default async function OrgFeaturesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/feed");

  const org = await db.organization.findUnique({
    where:   { id },
    include: { features: true },
  });
  if (!org) notFound();

  let features = org.features;
  if (features.length === 0) {
    await seedDefaultFeatures(org.id, org.type);
    features = await db.organizationFeature.findMany({ where: { organizationId: org.id } });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href={`/superadmin/org/${id}`}
        className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" /> Tilbake til org
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-white">Feature-toggles</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Aktiver eller deaktiver funksjoner for <span className="font-medium text-white">{org.name}</span>.
        Deaktiverte funksjoner skjules i sidemenyen og gir 404 ved direkte besøk.
      </p>

      <FeatureToggles orgId={org.id} initial={features} />
    </div>
  );
}
