import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ArrowLeft } from "lucide-react";
import OrgAdminPanel from "./OrgAdminPanel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SuperAdminOrgPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/feed");

  const { id } = await params;

  const [org, allUsers] = await Promise.all([
    db.organization.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true, email: true, username: true } } },
          orderBy: { role: "asc" },
        },
      },
    }),
    db.user.findMany({
      select: { id: true, name: true, email: true, username: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!org) notFound();

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/superadmin"
          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">{org.name}</h1>
          <p className="text-xs text-zinc-500">/{org.slug} · {org.type} · {org.plan}</p>
        </div>
      </div>

      <OrgAdminPanel
        orgId={org.id}
        orgName={org.name}
        memberships={org.memberships.map((m) => ({
          id:       m.id,
          role:     m.role,
          userId:   m.userId,
          userName: m.user.name ?? "",
          email:    m.user.email,
          username: m.user.username ?? null,
        }))}
        allUsers={allUsers.map((u) => ({
          id:       u.id,
          name:     u.name ?? "",
          email:    u.email,
          username: u.username ?? null,
        }))}
      />
    </div>
  );
}
