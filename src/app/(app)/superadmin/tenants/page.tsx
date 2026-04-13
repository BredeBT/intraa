import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import TenantsClient from "./TenantsClient";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

export default async function TenantsPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const orgs = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { memberships: true, posts: true } },
      theme:  { select: { logoUrl: true, bannerUrl: true } },
    },
  });

  const tenants = orgs.map((o) => ({
    id:        o.id,
    name:      o.name,
    slug:      o.slug,
    type:      o.type as "COMPANY" | "COMMUNITY",
    plan:      o.plan as "FREE" | "PRO" | "ENTERPRISE",
    createdAt: o.createdAt.toISOString(),
    _count:    o._count,
    theme:     o.theme,
  }));

  return <TenantsClient initialTenants={tenants} />;
}
