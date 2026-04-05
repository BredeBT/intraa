import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { Users, TrendingUp, Globe, ShieldAlert, Eye, Ban, Trash2, Mail } from "lucide-react";

type OrgPlan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

const PLAN_STYLES: Record<OrgPlan, string> = {
  FREE:       "bg-zinc-700/50 text-zinc-400",
  STARTER:    "bg-blue-500/10 text-blue-400",
  PRO:        "bg-indigo-500/10 text-indigo-400",
  ENTERPRISE: "bg-amber-500/15 text-amber-400",
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("nb-NO", { month: "short", year: "numeric" });
}

export default async function SuperAdminPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/feed");

  const [
    totalOrgs,
    totalMembers,
    proEnterpriseCount,
    orgs,
  ] = await Promise.all([
    db.organization.count(),
    db.membership.count(),
    db.organization.count({ where: { plan: { in: ["PRO", "ENTERPRISE"] } } }),
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: true } },
        memberships: {
          where: { role: "OWNER" },
          include: { user: { select: { name: true } } },
          take: 1,
        },
      },
    }),
  ]);

  const globalStats = [
    { label: "Totale organisasjoner", value: String(totalOrgs),                          icon: Globe,       color: "text-indigo-400",  bg: "bg-indigo-500/10" },
    { label: "Totale medlemmer",      value: totalMembers.toLocaleString("nb-NO"),        icon: Users,       color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Aktive org.",           value: String(totalOrgs),                          icon: TrendingUp,  color: "text-blue-400",    bg: "bg-blue-500/10" },
    { label: "PRO / Enterprise",      value: String(proEnterpriseCount),                 icon: ShieldAlert, color: "text-amber-400",   bg: "bg-amber-500/10" },
  ];

  return (
    <div className="px-8 py-8">
      <div className="mb-1 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-red-400" />
        <h1 className="text-xl font-semibold text-white">Superadmin</h1>
      </div>
      <p className="mb-8 text-sm text-zinc-500">Globalt administrasjonspanel for alle organisasjoner på plattformen.</p>

      {/* Quick actions */}
      <div className="mb-8">
        <Link
          href="/superadmin/invitasjoner"
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20"
        >
          <Mail className="h-4 w-4" />
          Send invitasjoner
        </Link>
      </div>

      {/* Global stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {globalStats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="mt-0.5 text-sm text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Orgs table */}
      <h2 className="mb-3 text-sm font-semibold text-zinc-400">Alle organisasjoner</h2>
      {orgs.length === 0 ? (
        <p className="text-sm text-zinc-600">Ingen organisasjoner i databasen ennå.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Navn</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden sm:table-cell">Eier</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Medlemmer</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Plan</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden md:table-cell">Opprettet</th>
                <th className="px-5 py-3 text-right font-medium text-zinc-500">Handlinger</th>
              </tr>
            </thead>
            <tbody className="bg-zinc-950">
              {orgs.map((org, i) => {
                const plan = org.plan as OrgPlan;
                const owner = org.memberships[0]?.user.name ?? "—";
                const memberCount = org._count.memberships;

                return (
                  <tr
                    key={org.id}
                    className={`transition-colors hover:bg-zinc-900 ${i < orgs.length - 1 ? "border-b border-zinc-800" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-700 text-xs font-bold text-white">
                          {org.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{org.name}</p>
                          <p className="text-xs text-zinc-500">/{org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-400 hidden sm:table-cell">{owner}</td>
                    <td className="px-5 py-4 text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-zinc-500" />
                        {memberCount.toLocaleString("nb-NO")}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_STYLES[plan] ?? PLAN_STYLES.FREE}`}>
                        {plan}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-500 hidden md:table-cell">
                      {formatDate(org.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Se som admin"
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          title="Deaktiver"
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-amber-400"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                        <button
                          title="Slett"
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
