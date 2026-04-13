import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db }   from "@/server/db";
import OrgSettingsForm from "./OrgSettingsForm";

export const dynamic  = "force-dynamic";
export const revalidate = 0;

export default async function InnstillingerPage({ params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const { orgId } = await params;

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) notFound();

  return (
    <div className="px-8 py-8" style={{ maxWidth: 680 }}>
      <OrgSettingsForm
        org={{
          id:              org.id,
          name:            org.name,
          slug:            org.slug,
          plan:            org.plan,
          description:     org.description ?? null,
          type:            org.type,
          joinType:        org.joinType,
          visibility:      org.visibility,
          openInviteToken: org.openInviteToken ?? null,
          createdAt:       org.createdAt.toISOString(),
        }}
      />
    </div>
  );
}
