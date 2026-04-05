import Link from "next/link";
import { Users, TrendingUp, Globe, ShieldAlert, Eye, Ban, Trash2, Mail } from "lucide-react";

// In Phase 4 this will verify isSuperAdmin from the session.
// For now, mock access is always granted.
const MOCK_IS_SUPERADMIN = true;

interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  owner: string;
  members: number;
  plan: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  active: boolean;
  createdAt: string;
}

const MOCK_COMMUNITIES: CommunityRow[] = [
  { id: "c1", name: "Intraa Community",   slug: "intraa",           owner: "Anders Sørensen", members: 1247, plan: "PRO",        active: true,  createdAt: "Jan 2024" },
  { id: "c2", name: "Designerklubben",    slug: "designerklubben",  owner: "Kari Moe",        members: 843,  plan: "STARTER",    active: true,  createdAt: "Mar 2024" },
  { id: "c3", name: "GamersNorge",        slug: "gamers-norge",     owner: "Thomas Kvam",     members: 2104, plan: "PRO",        active: true,  createdAt: "Feb 2024" },
  { id: "c4", name: "PodcastForum",       slug: "podcast-forum",    owner: "Maria Haugen",    members: 312,  plan: "FREE",       active: true,  createdAt: "Apr 2024" },
  { id: "c5", name: "TechFounders Oslo",  slug: "techfounders",     owner: "Erik Dahl",       members: 589,  plan: "ENTERPRISE", active: true,  createdAt: "Mai 2024" },
  { id: "c6", name: "Fitness & Helse",    slug: "fitness-helse",    owner: "Nina Strand",     members: 94,   plan: "FREE",       active: false, createdAt: "Jun 2024" },
];

const PLAN_STYLES: Record<CommunityRow["plan"], string> = {
  FREE:       "bg-zinc-700/50 text-zinc-400",
  STARTER:    "bg-blue-500/10 text-blue-400",
  PRO:        "bg-indigo-500/10 text-indigo-400",
  ENTERPRISE: "bg-amber-500/15 text-amber-400",
};

const globalStats = [
  { label: "Totale communities", value: String(MOCK_COMMUNITIES.length),                                          icon: Globe,       color: "text-indigo-400",  bg: "bg-indigo-500/10" },
  { label: "Totale medlemmer",   value: MOCK_COMMUNITIES.reduce((a, c) => a + c.members, 0).toLocaleString("nb-NO"), icon: Users,       color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { label: "Aktive communities", value: String(MOCK_COMMUNITIES.filter(c => c.active).length),                    icon: TrendingUp,  color: "text-blue-400",    bg: "bg-blue-500/10" },
  { label: "PRO / Enterprise",   value: String(MOCK_COMMUNITIES.filter(c => c.plan === "PRO" || c.plan === "ENTERPRISE").length), icon: ShieldAlert, color: "text-amber-400",   bg: "bg-amber-500/10" },
];

export default function SuperAdminPage() {
  if (!MOCK_IS_SUPERADMIN) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-32 text-center">
        <ShieldAlert className="mb-4 h-10 w-10 text-red-500" />
        <p className="text-lg font-semibold text-white">Ingen tilgang</p>
        <p className="mt-1 text-sm text-zinc-500">Denne siden er kun tilgjengelig for superadmins.</p>
      </div>
    );
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-1 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-red-400" />
        <h1 className="text-xl font-semibold text-white">Superadmin</h1>
      </div>
      <p className="mb-8 text-sm text-zinc-500">Globalt administrasjonspanel for alle communities på plattformen.</p>

      {/* Global stats */}
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

      {/* Communities table */}
      <h2 className="mb-3 text-sm font-semibold text-zinc-400">Alle communities</h2>
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Navn</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden sm:table-cell">Eier</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Medlemmer</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Plan</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden md:table-cell">Status</th>
              <th className="px-5 py-3 text-right font-medium text-zinc-500">Handlinger</th>
            </tr>
          </thead>
          <tbody className="bg-zinc-950">
            {MOCK_COMMUNITIES.map((c, i) => (
              <tr
                key={c.id}
                className={`transition-colors hover:bg-zinc-900 ${i < MOCK_COMMUNITIES.length - 1 ? "border-b border-zinc-800" : ""} ${!c.active ? "opacity-50" : ""}`}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-700 text-xs font-bold text-white">
                      {c.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-white">{c.name}</p>
                      <p className="text-xs text-zinc-500">/{c.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-zinc-400 hidden sm:table-cell">{c.owner}</td>
                <td className="px-5 py-4 text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-zinc-500" />
                    {c.members.toLocaleString("nb-NO")}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_STYLES[c.plan]}`}>
                    {c.plan}
                  </span>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-700/50 text-zinc-500"}`}>
                    {c.active ? "Aktiv" : "Deaktivert"}
                  </span>
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
                      title={c.active ? "Deaktiver" : "Aktiver"}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
