"use client";

import { Users, Ticket, FolderOpen, MessageSquare, TrendingUp, TrendingDown, UserPlus, CheckCircle, AlertCircle, Upload, LogIn } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const stats = [
  { label: "Brukere", value: 24, trend: "+2", up: true, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { label: "Aktive tickets", value: 7, trend: "+3", up: true, icon: Ticket, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { label: "Filer lagret", value: 142, trend: "+12", up: true, icon: FolderOpen, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { label: "Meldinger i dag", value: 38, trend: "-5", up: false, icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10" },
];

const activityData = [
  { day: "Man", hendelser: 14 },
  { day: "Tir", hendelser: 22 },
  { day: "Ons", hendelser: 18 },
  { day: "Tor", hendelser: 31 },
  { day: "Fre", hendelser: 27 },
  { day: "Lør", hendelser: 9 },
  { day: "Søn", hendelser: 5 },
];

const recentActivity = [
  { id: 1, icon: UserPlus, color: "text-indigo-400", bg: "bg-indigo-500/10", text: "Kari Moe ble lagt til som medlem", time: "14:22" },
  { id: 2, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", text: 'Ticket "Spørsmål om feriepenger" ble løst', time: "13:45" },
  { id: 3, icon: Upload, color: "text-blue-400", bg: "bg-blue-500/10", text: "Designsystem-v2.fig ble lastet opp", time: "12:10" },
  { id: 4, icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-500/10", text: 'Ny ticket opprettet: "VPN fungerer ikke hjemmefra"', time: "10:58" },
  { id: 5, icon: LogIn, color: "text-zinc-400", bg: "bg-zinc-500/10", text: "Ole Rønning logget inn", time: "09:03" },
];

export default function AdminPage() {
  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Oversikt</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, trend, up, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className={`inline-flex rounded-lg p-2 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>
                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="mt-0.5 text-sm text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar chart */}
        <div className="col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Aktivitet siste 7 dager</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityData} barSize={28}>
              <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: "rgba(99,102,241,0.08)" }}
              />
              <Bar dataKey="hendelser" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Siste aktivitet</h2>
          <div className="flex flex-col gap-3">
            {recentActivity.map(({ id, icon: Icon, color, bg, text, time }) => (
              <div key={id} className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug text-zinc-300">{text}</p>
                  <p className="mt-0.5 text-xs text-zinc-600">{time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
