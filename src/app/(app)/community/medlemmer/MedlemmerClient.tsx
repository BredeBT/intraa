"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";

type MemberRole = "OWNER" | "ADMIN" | "MODERATOR" | "VIP" | "MEMBER";

const ROLE_LABEL: Record<MemberRole, string> = {
  OWNER:     "Eier",
  ADMIN:     "Admin",
  MODERATOR: "Moderator",
  VIP:       "VIP",
  MEMBER:    "Medlem",
};

const ROLE_STYLES: Record<MemberRole, string> = {
  OWNER:     "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  ADMIN:     "bg-red-500/15 text-red-400 border border-red-500/30",
  MODERATOR: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  VIP:       "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  MEMBER:    "bg-zinc-700/50 text-zinc-400",
};

const AVATAR_COLORS = [
  "bg-indigo-600","bg-violet-600","bg-emerald-700","bg-blue-700",
  "bg-rose-700","bg-amber-700","bg-teal-700","bg-pink-700",
];

interface Member {
  id:         string;
  name:       string;
  role:       MemberRole;
  points:     number;
  isFollowed: boolean;
  isMe:       boolean;
}

interface Props {
  initialMembers: Member[];
  organizationId: string;
}

type Filter = "Alle" | "VIP" | "Moderatorer";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function MedlemmerClient({ initialMembers, organizationId }: Props) {
  const [members,  setMembers]  = useState<Member[]>(initialMembers);
  const [filter,   setFilter]   = useState<Filter>("Alle");
  const [search,   setSearch]   = useState("");
  const [, startTransition]     = useTransition();

  function toggleFollow(id: string) {
    const member    = members.find((m) => m.id === id);
    if (!member || member.isMe) return;
    const nowFollow = !member.isFollowed;

    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, isFollowed: nowFollow } : m));

    startTransition(async () => {
      await fetch("/api/follow", {
        method:  nowFollow ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ followingId: id, organizationId }),
      });
    });
  }

  const filtered = members.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "Alle"        ? true :
      filter === "VIP"         ? m.role === "VIP" :
      filter === "Moderatorer" ? (m.role === "MODERATOR" || m.role === "ADMIN") :
      true;
    return matchSearch && matchFilter;
  });

  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Medlemmer</h1>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {(["Alle", "VIP", "Moderatorer"] as Filter[]).map((f) => (
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
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">Ingen medlemmer funnet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((member, i) => (
            <div key={member.id} className="flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-6 text-center">
              <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                {initials(member.name)}
              </div>
              <p className="font-semibold text-white">{member.name}</p>
              <span className={`mt-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[member.role]}`}>
                {ROLE_LABEL[member.role]}
              </span>
              <p className="mt-2 text-xs text-zinc-500">{member.points.toLocaleString("no-NO")} poeng</p>
              {!member.isMe && (
                <button
                  onClick={() => toggleFollow(member.id)}
                  className={`mt-4 w-full rounded-lg py-2 text-sm font-semibold transition-colors ${
                    member.isFollowed
                      ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      : "bg-violet-600 text-white hover:bg-violet-500"
                  }`}
                >
                  {member.isFollowed ? "Følger" : "Følg"}
                </button>
              )}
              {member.isMe && (
                <p className="mt-4 text-xs text-zinc-600">Det er deg</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
