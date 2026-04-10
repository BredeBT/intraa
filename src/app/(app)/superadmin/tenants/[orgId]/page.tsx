import { redirect } from "next/navigation";

export default async function TenantRootPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/superadmin/tenants/${orgId}/oversikt`);
}
