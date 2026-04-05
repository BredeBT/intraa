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
  OWNER:     "bg-amber-500/10 text-amber-400",
  ADMIN:     "bg-indigo-500/10 text-indigo-400",
  MODERATOR: "bg-violet-500/10 text-violet-400",
  VIP:       "bg-emerald-500/10 text-emerald-400",
  MEMBER:    "bg-zinc-500/10 text-zinc-400",
};

const ASSIGNABLE_ROLES: MemberRole[] = ["ADMIN", "MODERATOR", "VIP", "MEMBER"];

interface Member {
  userId: string;
  name:   string;
  email:  string;
  role:   MemberRole;
  isMe:   boolean;
}

interface Props {
  members:        Member[];
  organizationId: string;
}

export default function BrukereClient({ members: initial, organizationId }: Props) {
  const [members,     setMembers]     = useState<Member[]>(initial);
  const [search,      setSearch]      = useState("");
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [, startTransition]           = useTransition();

  const filtered = members.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  function changeRole(userId: string, role: MemberRole) {
    setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role } : m));
    setEditingId(null);
    startTransition(async () => {
      await fetch("/api/superadmin/org-members", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "changeRole", organizationId, userId, role }),
      });
    });
  }

  function removeMember(userId: string) {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
    startTransition(async () => {
      await fetch("/api/superadmin/org-members", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "remove", organizationId, userId }),
      });
    });
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Brukere</h1>
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          type="text"
          placeholder="Søk etter navn eller e-post…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Navn</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden sm:table-cell">E-post</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Rolle</th>
              <th className="px-5 py-3 text-right font-medium text-zinc-500">Handlinger</th>
            </tr>
          </thead>
          <tbody className="bg-zinc-950">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-zinc-500">
                  Ingen brukere funnet.
                </td>
              </tr>
            )}
            {filtered.map((user, i) => (
              <tr
                key={user.userId}
                className={`transition-colors hover:bg-zinc-900 ${i < filtered.length - 1 ? "border-b border-zinc-800" : ""}`}
              >
                <td className="px-5 py-4 font-medium text-white">{user.name}</td>
                <td className="px-5 py-4 text-zinc-400 hidden sm:table-cell">{user.email}</td>
                <td className="px-5 py-4">
                  {editingId === user.userId && !user.isMe ? (
                    <select
                      autoFocus
                      value={user.role}
                      onChange={(e) => changeRole(user.userId, e.target.value as MemberRole)}
                      onBlur={() => setEditingId(null)}
                      className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white outline-none"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[user.role]}`}>
                      {ROLE_LABEL[user.role]}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {!user.isMe && user.role !== "OWNER" && (
                      <>
                        <button
                          onClick={() => setEditingId(user.userId)}
                          className="rounded-md bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                        >
                          Rediger rolle
                        </button>
                        <button
                          onClick={() => removeMember(user.userId)}
                          className="rounded-md bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
                        >
                          Fjern
                        </button>
                      </>
                    )}
                    {user.isMe && (
                      <span className="text-xs text-zinc-600">Det er deg</span>
                    )}
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
