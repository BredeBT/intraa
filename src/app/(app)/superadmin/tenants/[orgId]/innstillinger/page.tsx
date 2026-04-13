import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import OrgSettingsForm from "./OrgSettingsForm";

export default async function InnstillingerPage({ params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const { orgId } = await params;

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) notFound();

  return (
    <div className="px-8 py-8">
      <h2 className="mb-1 text-lg font-semibold text-white">Innstillinger</h2>
      <p className="mb-6 text-sm text-zinc-500">Rediger grunnleggende informasjon om organisasjonen.</p>
      <OrgSettingsForm org={{ id: org.id, name: org.name, slug: org.slug, plan: org.plan, description: org.description ?? null }} />
    </div>
  );
}
