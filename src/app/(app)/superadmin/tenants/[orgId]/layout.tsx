import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
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
  const org = await db.organization.findUnique({
    where:   { id: orgId },
    include: { theme: { select: { logoUrl: true } } },
  });
  if (!org) notFound();

  return (
    <div className="grid min-h-full" style={{ gridTemplateColumns: "220px 1fr", background: "#050816" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col px-3 py-5"
        style={{ background: "#0B1027", borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        <TenantSideNav
          orgId={org.id}
          orgName={org.name}
          orgType={org.type}
          logoUrl={org.theme?.logoUrl ?? null}
        />
      </aside>

      {/* Main */}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
