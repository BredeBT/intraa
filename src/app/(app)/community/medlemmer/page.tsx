"use client";

import { useState } from "react";
import { Search } from "lucide-react";

type Role = "Eier" | "Moderator" | "VIP" | "Medlem";

interface Member {
  id: string;
  name: string;
  initials: string;
  role: Role;
  points: number;
  joined: string;
}

const ALL_MEMBERS: Member[] = [
  { id: "m1", name: "Ole Rønning",     initials: "OR", role: "Eier",      points: 4820, joined: "2024-01" },
  { id: "m2", name: "Kari Moe",        initials: "KM", role: "VIP",       points: 3610, joined: "2024-03" },
  { id: "m3", name: "Thomas Kvam",     initials: "TK", role: "Moderator", points: 2940, joined: "2024-02" },
  { id: "m4", name: "Maria Haugen",    initials: "MH", role: "Moderator", points: 2310, joined: "2024-04" },
  { id: "m5", name: "Anders Sørensen", initials: "AS", role: "VIP",       points: 1870, joined: "2024-05" },
  { id: "m6", name: "Linn Berg",       initials: "LB", role: "Medlem",    points: 1540, joined: "2024-06" },
  { id: "m7", name: "Pål Eriksen",     initials: "PE", role: "Medlem",    points: 1230, joined: "2025-11" },
  { id: "m8", name: "Silje Nygaard",   initials: "SN", role: "VIP",       points: 980,  joined: "2025-12" },
  { id: "m9", name: "Erik Dahl",       initials: "ED", role: "Medlem",    points: 760,  joined: "2026-02" },
  { id: "m10",name: "Nina Strand",     initials: "NS", role: "Medlem",    points: 610,  joined: "2026-03" },
  { id: "m11",name: "Jonas Lie",       initials: "JL", role: "Medlem",    points: 420,  joined: "2026-04" },
  { id: "m12",name: "Hanne Dahl",      initials: "HD", role: "Medlem",    points: 310,  joined: "2026-04" },
];

const ROLE_STYLES: Record<Role, string> = {
  Eier:      "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  Moderator: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  VIP:       "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  Medlem:    "bg-zinc-700/50 text-zinc-400",
};

const AVATAR_COLORS = [
  "bg-indigo-600","bg-violet-600","bg-emerald-700","bg-blue-700",
  "bg-rose-700","bg-amber-700","bg-teal-700","bg-pink-700",
];

type Filter = "Alle" | "VIP" | "Moderatorer" | "Nye";

const NEW_CUTOFF = "2026-01";

export default function CommunityMedlemmerPage() {
  const [followed, setFollowed]   = useState<Record<string, boolean>>({});
  const [filter, setFilter]       = useState<Filter>("Alle");
  const [search, setSearch]       = useState("");

  function toggleFollow(id: string) {
    setFollowed(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const filtered = ALL_MEMBERS.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "Alle"        ? true :
      filter === "VIP"         ? m.role === "VIP" :
      filter === "Moderatorer" ? m.role === "Moderator" :
      filter === "Nye"         ? m.joined >= NEW_CUTOFF :
      true;
    return matchSearch && matchFilter;
  });

  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Medlemmer</h1>

      {/* Filters + search */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {(["Alle", "VIP", "Moderatorer", "Nye"] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            type="text"
            placeholder="Søk etter navn…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-zinc-500">Ingen medlemmer funnet.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((member, i) => (
          <div key={member.id} className="flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-6 text-center">
            <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
              {member.initials}
            </div>
            <p className="font-semibold text-white">{member.name}</p>
            <span className={`mt-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[member.role]}`}>
              {member.role}
            </span>
            <p className="mt-2 text-xs text-zinc-500">{member.points.toLocaleString("no-NO")} poeng</p>
            <button
              onClick={() => toggleFollow(member.id)}
              className={`mt-4 w-full rounded-lg py-2 text-sm font-semibold transition-colors ${
                followed[member.id]
                  ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  : "bg-violet-600 text-white hover:bg-violet-500"
              }`}
            >
              {followed[member.id] ? "Følger" : "Følg"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
