"use client";

import { Users, TrendingUp, CreditCard, UserPlus } from "lucide-react";

type Role = "Eier" | "Moderator" | "VIP" | "Medlem";
type Plan = "Gratis" | "Pro" | "VIP";

interface Member {
  id: string;
  name: string;
  initials: string;
  role: Role;
  plan: Plan;
  joined: string;
}

import { useState } from "react";

const ROLE_ORDER: Role[] = ["Medlem", "VIP", "Moderator"];

const INITIAL_MEMBERS: Member[] = [
  { id: "m1", name: "Ole Rønning",     initials: "OR", role: "Eier",      plan: "VIP",    joined: "Jan 2024" },
  { id: "m2", name: "Kari Moe",        initials: "KM", role: "VIP",       plan: "VIP",    joined: "Mar 2024" },
  { id: "m3", name: "Thomas Kvam",     initials: "TK", role: "Moderator", plan: "Pro",    joined: "Feb 2024" },
  { id: "m4", name: "Maria Haugen",    initials: "MH", role: "Moderator", plan: "Pro",    joined: "Apr 2024" },
  { id: "m5", name: "Anders Sørensen", initials: "AS", role: "VIP",       plan: "VIP",    joined: "Mai 2024" },
  { id: "m6", name: "Linn Berg",       initials: "LB", role: "Medlem",    plan: "Gratis", joined: "Jun 2024" },
  { id: "m7", name: "Pål Eriksen",     initials: "PE", role: "Medlem",    plan: "Pro",    joined: "Nov 2025" },
  { id: "m8", name: "Silje Nygaard",   initials: "SN", role: "VIP",       plan: "VIP",    joined: "Des 2025" },
  { id: "m9", name: "Erik Dahl",       initials: "ED", role: "Medlem",    plan: "Gratis", joined: "Feb 2026" },
  { id: "m10",name: "Nina Strand",     initials: "NS", role: "Medlem",    plan: "Gratis", joined: "Mar 2026" },
  { id: "m11",name: "Jonas Lie",       initials: "JL", role: "Medlem",    plan: "Gratis", joined: "Apr 2026" },
  { id: "m12",name: "Hanne Dahl",      initials: "HD", role: "Medlem",    plan: "Gratis", joined: "Apr 2026" },
];

const ROLE_STYLES: Record<Role, string> = {
  Eier:      "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  Moderator: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  VIP:       "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  Medlem:    "bg-zinc-700/50 text-zinc-400",
};

const PLAN_STYLES: Record<Plan, string> = {
  VIP:    "bg-violet-500/10 text-violet-400",
  Pro:    "bg-indigo-500/10 text-indigo-400",
  Gratis: "bg-zinc-700/50 text-zinc-500",
};

const stats = [
  { label: "Totale medlemmer", value: "12",     icon: Users,      color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { label: "Aktive i dag",     value: "7",       icon: TrendingUp, color: "text-emerald-400",bg: "bg-emerald-500/10" },
  { label: "Inntekt (mnd)",    value: "2 194 kr",icon: CreditCard, color: "text-amber-400",  bg: "bg-amber-500/10" },
  { label: "Nye denne uken",   value: "2",       icon: UserPlus,   color: "text-blue-400",   bg: "bg-blue-500/10" },
];

export default function CommunityAdminPage() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);

  function cycleRole(id: string) {
    setMembers(prev => prev.map(m => {
      if (m.id !== id || m.role === "Eier") return m;
      const idx = ROLE_ORDER.indexOf(m.role as typeof ROLE_ORDER[number]);
      const next = ROLE_ORDER[(idx + 1) % ROLE_ORDER.length];
      return { ...m, role: next };
    }));
  }

  return (
    <div className="px-4 py-5 md:px-8 md:py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Community Admin</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="mt-0.5 text-sm text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Members table */}
      <h2 className="mb-3 text-sm font-semibold text-zinc-400">Alle medlemmer</h2>
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Navn</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Rolle</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Plan</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden sm:table-cell">Medlem siden</th>
              <th className="px-5 py-3 text-right font-medium text-zinc-500">Handling</th>
            </tr>
          </thead>
          <tbody className="bg-zinc-950">
            {members.map((member, i) => (
              <tr
                key={member.id}
                className={`transition-colors hover:bg-zinc-900 ${i < members.length - 1 ? "border-b border-zinc-800" : ""}`}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
                      {member.initials}
                    </div>
                    <span className="font-medium text-white">{member.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[member.role]}`}>
                    {member.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_STYLES[member.plan]}`}>
                    {member.plan}
                  </span>
                </td>
                <td className="px-5 py-4 text-zinc-500 hidden sm:table-cell">{member.joined}</td>
                <td className="px-5 py-4 text-right">
                  {member.role !== "Eier" ? (
                    <button
                      onClick={() => cycleRole(member.id)}
                      className="rounded-md bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                    >
                      → {ROLE_ORDER[(ROLE_ORDER.indexOf(member.role as typeof ROLE_ORDER[number]) + 1) % ROLE_ORDER.length]}
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
