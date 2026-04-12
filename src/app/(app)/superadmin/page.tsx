import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import {
  ShieldAlert, Globe, Users, TrendingUp, Ticket,
  UserPlus, Activity, Clock, Zap,
} from "lucide-react";
import SuperAdminNav from "./SuperAdminNav";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

function relTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return "akkurat nå";
  if (m < 60)  return `${m}m siden`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}t siden`;
  const d = Math.floor(h / 24);
  return `${d}d siden`;
}

export default async function SuperAdminPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/feed");

  const now      = new Date();
  const minus5m  = new Date(now.getTime() - 5  * 60_000);
  const minus24h = new Date(now.getTime() - 24 * 60 * 60_000);
  const minus7d  = new Date(now.getTime() - 7  * 24 * 60 * 60_000);
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const [
    totalOrgs,
    totalUsers,
    proEntCount,
    waitlistCount,
    activeNow,
    activeToday,
    openTickets,
    newUsersWeek,
    // Activity chart: user sign-ups per day for last 7 days
    recentUsers,
    recentTickets,
    recentOrgs,
    recentFanpasses,
  ] = await Promise.all([
    db.organization.count(),
    db.user.count(),
    db.organization.count({ where: { plan: { in: ["PRO", "ENTERPRISE"] } } }),
    db.fanpassWaitlist.count(),
    db.user.count({ where: { lastActive: { gte: minus5m } } }),
    db.user.count({ where: { lastActive: { gte: minus24h } } }),
    db.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.user.count({ where: { createdAt: { gte: startOfWeek } } }),

    // For events feed + chart
    db.user.findMany({
      where:   { createdAt: { gte: minus7d } },
      orderBy: { createdAt: "desc" },
      select:  { id: true, name: true, email: true, createdAt: true },
      take: 20,
    }),
    db.ticket.findMany({
      orderBy: { createdAt: "desc" },
      select:  { id: true, title: true, status: true, createdAt: true, author: { select: { name: true } } },
      take: 5,
    }),
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      select:  { id: true, name: true, slug: true, createdAt: true },
      take: 5,
    }),
    db.fanPass.findMany({
      orderBy: { createdAt: "desc" },
      select:  { id: true, createdAt: true, user: { select: { name: true } }, organization: { select: { name: true } } },
      take: 5,
    }),
  ]);

  // Build chart: count sign-ups per day for last 7 days
  const dayLabels: string[] = [];
  const dayCounts: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    dayLabels.push(d.toLocaleDateString("nb-NO", { weekday: "short" }));
    dayCounts.push(recentUsers.filter((u) => u.createdAt >= d && u.createdAt < next).length);
  }
  const maxCount = Math.max(...dayCounts, 1);

  // Merge recent events
  type Event = { key: string; icon: "user" | "ticket" | "org" | "fan"; label: string; sub: string; time: Date };
  const events: Event[] = [
    ...recentUsers.slice(0, 5).map((u) => ({
      key:   `u-${u.id}`,
      icon:  "user" as const,
      label: u.name ?? u.email ?? "Ukjent",
      sub:   "Ny bruker registrert",
      time:  u.createdAt,
    })),
    ...recentTickets.map((t) => ({
      key:   `t-${t.id}`,
      icon:  "ticket" as const,
      label: t.title,
      sub:   `Sak — ${t.author.name ?? "ukjent"} · ${t.status}`,
      time:  t.createdAt,
    })),
    ...recentOrgs.map((o) => ({
      key:   `o-${o.id}`,
      icon:  "org" as const,
      label: o.name,
      sub:   `Ny organisasjon /${o.slug}`,
      time:  o.createdAt,
    })),
    ...recentFanpasses.map((f) => ({
      key:   `f-${f.id}`,
      icon:  "fan" as const,
      label: f.user.name ?? "Ukjent",
      sub:   `Fanpass — ${f.organization.name}`,
      time:  f.createdAt,
    })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 10);

  const ICON_COLOR: Record<Event["icon"], string> = {
    user:   "bg-indigo-500/10 text-indigo-400",
    ticket: "bg-amber-500/10  text-amber-400",
    org:    "bg-emerald-500/10 text-emerald-400",
    fan:    "bg-pink-500/10   text-pink-400",
  };

  const ICON_EL: Record<Event["icon"], ReactNode> = {
    user:   <UserPlus  className="h-3.5 w-3.5" />,
    ticket: <Ticket    className="h-3.5 w-3.5" />,
    org:    <Globe     className="h-3.5 w-3.5" />,
    fan:    <Zap       className="h-3.5 w-3.5" />,
  };

  const statsRow1 = [
    { label: "Totale organisasjoner", value: String(totalOrgs),                    icon: Globe,       color: "text-emerald-400" },
    { label: "Totale brukere",        value: totalUsers.toLocaleString("nb-NO"),   icon: Users,       color: "text-indigo-400" },
    { label: "PRO / Enterprise",      value: String(proEntCount),                   icon: TrendingUp,  color: "text-violet-400" },
    { label: "Venter på Fanpass",     value: String(waitlistCount),                icon: Zap,         color: "text-pink-400" },
  ];
  const statsRow2 = [
    { label: "Aktive nå",      value: String(activeNow),                   icon: Activity,  color: "text-green-400",  pulse: true },
    { label: "Aktive i dag",   value: String(activeToday),                 icon: Clock,     color: "text-sky-400",    pulse: false },
    { label: "Åpne saker",     value: String(openTickets),                 icon: Ticket,    color: "text-amber-400",  pulse: false },
    { label: "Nye brukere (uke)", value: String(newUsersWeek),             icon: UserPlus,  color: "text-rose-400",   pulse: false },
  ];

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-1 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-slate-500" />
        <h1 className="text-xl font-semibold text-white">Superadmin</h1>
      </div>
      <p className="mb-8 text-sm text-zinc-500">Globalt administrasjonspanel for alle organisasjoner på plattformen.</p>

      <SuperAdminNav />

      {/* Stat cards — 4×2 */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statsRow1.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-zinc-900 p-5">
            <Icon className={`mb-3 h-5 w-5 ${color}`} />
            <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statsRow2.map(({ label, value, icon: Icon, color, pulse }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-zinc-900 p-5">
            <Icon className={`mb-3 h-5 w-5 ${color}`} />
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
              {pulse && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Bottom grid: chart + events */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* CSS activity bar chart */}
        <div className="rounded-xl border border-white/5 bg-zinc-900 p-6">
          <p className="mb-1 text-sm font-semibold text-zinc-300">Nye brukere — siste 7 dager</p>
          <p className="mb-5 text-xs text-zinc-600">Antall registreringer per dag</p>
          <div className="flex h-32 items-end gap-2">
            {dayCounts.map((count, i) => {
              const heightPct = Math.round((count / maxCount) * 100);
              return (
                <div key={i} className="group flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {count}
                  </span>
                  <div
                    className="w-full rounded-t-sm bg-indigo-500/40 transition-all group-hover:bg-indigo-500/70"
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                  <span className="text-[10px] text-zinc-600 capitalize">{dayLabels[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent events feed */}
        <div className="rounded-xl border border-white/5 bg-zinc-900 p-6">
          <p className="mb-1 text-sm font-semibold text-zinc-300">Siste hendelser</p>
          <p className="mb-4 text-xs text-zinc-600">Brukere, saker, org, fanpass</p>
          {events.length === 0 ? (
            <p className="text-xs text-zinc-600">Ingen hendelser ennå.</p>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div key={ev.key} className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${ICON_COLOR[ev.icon]}`}>
                    {ICON_EL[ev.icon]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-200">{ev.label}</p>
                    <p className="text-xs text-zinc-500">{ev.sub}</p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-600">{relTime(ev.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
