import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";
import OrganisasjonClient from "./OrganisasjonClient";

export default async function OrganisasjonPage() {
  const { organizationId } = await requireAdmin();

  const org = await db.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) return null;

  return (
    <OrganisasjonClient
      orgId={org.id}
      initialName={org.name}
      initialSlug={org.slug}
      initialType={org.type}
    />
  );
}
