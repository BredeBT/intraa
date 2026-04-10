import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ArrowRight, Users, Globe } from "lucide-react";

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

const TYPE_STYLES: Record<string, string> = {
  COMPANY:   "bg-indigo-500/10 text-indigo-400",
  COMMUNITY: "bg-violet-500/10 text-violet-400",
};

const TYPE_LABELS: Record<string, string> = {
  COMPANY:   "Bedrift",
  COMMUNITY: "Community",
};

export default async function TenantsPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const orgs = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { memberships: true } } },
  });

  return (
    <div className="px-8 py-8">
      <div className="mb-1 flex items-center gap-2">
        <Globe className="h-5 w-5 text-zinc-400" />
        <h1 className="text-xl font-semibold text-white">Alle tenants</h1>
      </div>
      <p className="mb-8 text-sm text-zinc-500">{orgs.length} organisasjoner på plattformen.</p>

      {orgs.length === 0 ? (
        <p className="text-sm text-zinc-600">Ingen organisasjoner ennå.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-6 py-3 text-left font-medium text-zinc-500">Navn</th>
                <th className="px-6 py-3 text-left font-medium text-zinc-500">Type</th>
                <th className="px-6 py-3 text-left font-medium text-zinc-500">Medlemmer</th>
                <th className="px-6 py-3 text-left font-medium text-zinc-500 hidden md:table-cell">Opprettet</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="bg-zinc-950">
              {orgs.map((org, i) => (
                <tr
                  key={org.id}
                  className={`transition-colors hover:bg-zinc-900 ${i < orgs.length - 1 ? "border-b border-zinc-800" : ""}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-white">
                        {org.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{org.name}</p>
                        <p className="text-xs text-zinc-500">/{org.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_STYLES[org.type] ?? ""}`}>
                      {TYPE_LABELS[org.type] ?? org.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-300">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-zinc-500" />
                      {org._count.memberships.toLocaleString("nb-NO")}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500 hidden md:table-cell">
                    {formatDate(org.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/superadmin/tenants/${org.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
                    >
                      Administrer <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
