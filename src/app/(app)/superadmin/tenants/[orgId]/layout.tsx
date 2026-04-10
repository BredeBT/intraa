import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ChevronLeft } from "lucide-react";
import TenantSideNav from "./TenantSideNav";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params:   Promise<{ orgId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const { orgId } = await params;
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) notFound();

  return (
    <div className="flex min-h-full">
      {/* Left sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900 px-3 py-6">
        <Link
          href="/superadmin/tenants"
          className="mb-6 flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Alle tenants
        </Link>
        <TenantSideNav orgId={org.id} orgName={org.name} orgType={org.type} />
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
