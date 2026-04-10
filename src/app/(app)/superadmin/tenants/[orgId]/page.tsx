import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function TenantRootPage({ params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const { orgId } = await params;
  redirect(`/superadmin/tenants/${orgId}/oversikt`);
}
