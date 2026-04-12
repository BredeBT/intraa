import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { Users, TrendingUp, Globe, ShieldAlert, ArrowRight } from "lucide-react";
import SuperAdminActions from "./SuperAdminActions";
import SuperAdminNav from "./SuperAdminNav";

type OrgPlan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

const PLAN_STYLES: Record<OrgPlan, string> = {
  FREE:       "bg-zinc-800 text-zinc-500",
  STARTER:    "bg-sky-500/10 text-sky-400",
  PRO:        "bg-violet-500/10 text-violet-400",
  ENTERPRISE: "bg-amber-400/10 text-amber-300",
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("nb-NO", { month: "short", year: "numeric" });
}

export default async function SuperAdminPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/feed");

  const [totalOrgs, totalMembers, proEnterpriseCount, waitlistCount, orgs] = await Promise.all([
    db.organization.count(),
    db.membership.count(),
    db.organization.count({ where: { plan: { in: ["PRO", "ENTERPRISE"] } } }),
    db.fanpassWaitlist.count(),
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: true } },
        memberships: {
          where:   { role: "OWNER" },
          include: { user: { select: { name: true } } },
          take: 1,
        },
      },
    }),
  ]);

  const globalStats = [
    { label: "Organisasjoner",      value: String(totalOrgs),                   icon: Globe },
    { label: "Medlemmer",           value: totalMembers.toLocaleString("nb-NO"), icon: Users },
    { label: "PRO / Enterprise",    value: String(proEnterpriseCount),           icon: TrendingUp },
    { label: "Venter på Fanpass",   value: String(waitlistCount),               icon: ShieldAlert },
  ];

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-1 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-slate-500" />
        <h1 className="text-xl font-semibold text-white">Superadmin</h1>
      </div>
      <p className="mb-8 text-sm text-zinc-500">Globalt administrasjonspanel for alle organisasjoner på plattformen.</p>

      {/* Tab navigation */}
      <SuperAdminNav />

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {globalStats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-zinc-900 p-5">
            <Icon className="mb-3 h-5 w-5 text-slate-400" />
            <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Orgs table */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-400">Alle organisasjoner</h2>
        <SuperAdminActions />
      </div>

      {orgs.length === 0 ? (
        <p className="text-sm text-zinc-600">Ingen organisasjoner i databasen ennå.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Navn</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 hidden sm:table-cell">Eier</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Medlemmer</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Plan</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 hidden md:table-cell">Opprettet</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {orgs.map((org, i) => {
                const plan  = org.plan as OrgPlan;
                const owner = org.memberships[0]?.user.name ?? "—";

                return (
                  <tr
                    key={org.id}
                    className={`transition-colors hover:bg-zinc-800/60 ${
                      i < orgs.length - 1 ? "border-b border-zinc-800" : ""
                    } ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/40"}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-xs font-bold text-zinc-300">
                          {org.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{org.name}</p>
                          <p className="text-xs text-zinc-600">/{org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-zinc-400 hidden sm:table-cell">{owner}</td>
                    <td className="px-5 py-3.5 text-sm text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-zinc-600" />
                        {org._count.memberships.toLocaleString("nb-NO")}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_STYLES[plan] ?? PLAN_STYLES.FREE}`}>
                        {plan}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-600 hidden md:table-cell">
                      {formatDate(org.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/superadmin/tenants/${org.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
                      >
                        Administrer <ArrowRight className="h-3 w-3" />
                      </Link>
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
