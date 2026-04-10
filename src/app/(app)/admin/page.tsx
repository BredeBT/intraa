import { Users, Ticket, FolderOpen, MessageSquare, Activity, FileText, Coins } from "lucide-react";
import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";
import AdminChart from "./AdminChart";

function relTime(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Nettopp";
  if (mins < 60) return `${mins} min siden`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}t siden`;
  return new Date(date).toLocaleDateString("no-NO", { day: "numeric", month: "short" });
}

const ACTION_LABEL: Record<string, string> = {
  POST:    "la ut et innlegg",
  MESSAGE: "sendte en melding",
  COMMENT: "kommenterte et innlegg",
  LOGIN:   "logget inn",
};

export default async function AdminPage() {
  const { organizationId } = await requireAdmin();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [org, memberCount, activeTickets, fileCount, messagesToday, postCount, coinsAggregate, recentActivities, weekActivities] =
    await Promise.all([
      db.organization.findUnique({ where: { id: organizationId }, select: { type: true } }),
      db.membership.count({ where: { organizationId } }),
      db.ticket.count({ where: { orgId: organizationId, status: { not: "RESOLVED" } } }),
      db.file.count({ where: { orgId: organizationId } }),
      db.message.count({
        where: { channel: { orgId: organizationId }, createdAt: { gte: startOfToday } },
      }),
      db.post.count({ where: { orgId: organizationId } }),
      db.membership.aggregate({
        where: { organizationId },
        _sum:  { points: true },
      }),
      db.userActivity.findMany({
        where:   { organizationId },
        orderBy: { createdAt: "desc" },
        take:    5,
        include: { user: { select: { name: true } } },
      }),
      db.userActivity.findMany({
        where:  { organizationId, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
    ]);

  const isCommunity = org?.type === "COMMUNITY";
  const totalCoins  = coinsAggregate._sum.points ?? 0;

  // Aggregate weekly activity by day label
  const DAY_LABELS = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
  const dayCounts: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayCounts[DAY_LABELS[d.getDay()]] = 0;
  }
  for (const a of weekActivities) {
    const label = DAY_LABELS[new Date(a.createdAt).getDay()];
    dayCounts[label] = (dayCounts[label] ?? 0) + 1;
  }
  const chartData = Object.entries(dayCounts).map(([day, hendelser]) => ({ day, hendelser }));

  const companyStats = [
    { label: "Antall medlemmer",  value: memberCount,   icon: Users,         color: "text-indigo-400",  bg: "bg-indigo-500/10"  },
    { label: "Aktive tickets",    value: activeTickets, icon: Ticket,        color: "text-yellow-400",  bg: "bg-yellow-500/10"  },
    { label: "Filer lagret",      value: fileCount,     icon: FolderOpen,    color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Meldinger i dag",   value: messagesToday, icon: MessageSquare, color: "text-blue-400",    bg: "bg-blue-500/10"    },
  ];

  const communityStats = [
    { label: "Antall medlemmer",  value: memberCount,   icon: Users,         color: "text-indigo-400",  bg: "bg-indigo-500/10"  },
    { label: "Innlegg totalt",    value: postCount,     icon: FileText,      color: "text-violet-400",  bg: "bg-violet-500/10"  },
    { label: "Meldinger i dag",   value: messagesToday, icon: MessageSquare, color: "text-blue-400",    bg: "bg-blue-500/10"    },
    { label: "Coins i omløp",     value: totalCoins,    icon: Coins,         color: "text-amber-400",   bg: "bg-amber-500/10"   },
  ];

  const stats = isCommunity ? communityStats : companyStats;

  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Oversikt</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-3">
              <div className={`inline-flex rounded-lg p-2 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{value.toLocaleString("no-NO")}</p>
            <p className="mt-0.5 text-sm text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar chart */}
        <div className="col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Aktivitet siste 7 dager</h2>
          <AdminChart data={chartData} />
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Siste aktivitet</h2>
          {recentActivities.length === 0 ? (
            <p className="text-xs text-zinc-600">Ingen aktivitet ennå.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentActivities.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/10">
                    <Activity className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug text-zinc-300">
                      <span className="font-medium text-white">{a.user.name ?? "Ukjent"}</span>
                      {" "}{ACTION_LABEL[a.action] ?? a.action}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-600">{relTime(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
