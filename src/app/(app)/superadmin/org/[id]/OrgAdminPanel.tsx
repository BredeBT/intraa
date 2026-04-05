"use client";

import { useState, useTransition } from "react";
import { UserPlus, Trash2, ChevronDown } from "lucide-react";

type MemberRole = "OWNER" | "ADMIN" | "MODERATOR" | "VIP" | "MEMBER";

interface Membership {
  id:       string;
  role:     MemberRole;
  userId:   string;
  userName: string;
  email:    string;
  username: string | null;
}

interface User {
  id:       string;
  name:     string;
  email:    string;
  username: string | null;
}

interface Props {
  orgId:       string;
  orgName:     string;
  memberships: Membership[];
  allUsers:    User[];
}

const ROLES: MemberRole[] = ["OWNER", "ADMIN", "MODERATOR", "VIP", "MEMBER"];

const ROLE_STYLES: Record<MemberRole, string> = {
  OWNER:     "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  ADMIN:     "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  MODERATOR: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  VIP:       "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  MEMBER:    "bg-zinc-700/50 text-zinc-400",
};

export default function OrgAdminPanel({ orgId, orgName, memberships: initial, allUsers }: Props) {
  const [memberships, setMemberships] = useState<Membership[]>(initial);
  const [addUserId,   setAddUserId]   = useState("");
  const [addRole,     setAddRole]     = useState<MemberRole>("MEMBER");
  const [error,       setError]       = useState("");
  const [isPending,   startTransition] = useTransition();

  // Non-members only in "add user" dropdown
  const memberIds = new Set(memberships.map((m) => m.userId));
  const nonMembers = allUsers.filter((u) => !memberIds.has(u.id));

  async function callAction(body: object) {
    const res = await fetch("/api/superadmin/org-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, ...body }),
    });
    return res.json() as Promise<{ error?: string; membership?: Membership }>;
  }

  function handleChangeRole(membershipId: string, newRole: MemberRole) {
    startTransition(async () => {
      const data = await callAction({ action: "changeRole", membershipId, role: newRole });
      if (data.error) { setError(data.error); return; }
      setMemberships((prev) => prev.map((m) => m.id === membershipId ? { ...m, role: newRole } : m));
    });
  }

  function handleRemove(membershipId: string) {
    startTransition(async () => {
      const data = await callAction({ action: "remove", membershipId });
      if (data.error) { setError(data.error); return; }
      setMemberships((prev) => prev.filter((m) => m.id !== membershipId));
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addUserId) return;
    setError("");
    startTransition(async () => {
      const data = await callAction({ action: "add", userId: addUserId, role: addRole });
      if (data.error) { setError(data.error); return; }
      const user = allUsers.find((u) => u.id === addUserId)!;
      setMemberships((prev) => [
        ...prev,
        { id: data.membership?.id ?? `opt-${Date.now()}`, role: addRole, userId: addUserId, userName: user.name, email: user.email, username: user.username },
      ]);
      setAddUserId("");
    });
  }

  return (
    <div className="space-y-8">
      {/* Add existing user */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">Legg til bruker direkte</h2>
        {nonMembers.length === 0 ? (
          <p className="text-xs text-zinc-600">Alle brukere er allerede medlemmer av {orgName}.</p>
        ) : (
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Bruker</label>
              <div className="relative">
                <select
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-8 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Velg bruker…</option>
                  {nonMembers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}{u.username ? ` (${u.username})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              </div>
            </div>
            <div className="min-w-[140px]">
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Rolle</label>
              <div className="relative">
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as MemberRole)}
                  className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-8 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              </div>
            </div>
            <button
              type="submit"
              disabled={!addUserId || isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              Legg til
            </button>
          </form>
        )}
        {error && (
          <p className="mt-3 text-xs text-rose-400">{error}</p>
        )}
      </div>

      {/* Members table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400">
          Medlemmer ({memberships.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Bruker</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden sm:table-cell">E-post</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Rolle</th>
                <th className="px-5 py-3 text-right font-medium text-zinc-500"></th>
              </tr>
            </thead>
            <tbody className="bg-zinc-950">
              {memberships.map((m, i) => (
                <tr
                  key={m.id}
                  className={`transition-colors hover:bg-zinc-900 ${i < memberships.length - 1 ? "border-b border-zinc-800" : ""}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-white">
                        {(m.userName || m.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{m.userName || "—"}</p>
                        {m.username && <p className="text-xs text-zinc-500">{m.username}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-400 hidden sm:table-cell">{m.email}</td>
                  <td className="px-5 py-3">
                    <select
                      value={m.role}
                      onChange={(e) => handleChangeRole(m.id, e.target.value as MemberRole)}
                      disabled={isPending}
                      className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 ${ROLE_STYLES[m.role]}`}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleRemove(m.id)}
                      disabled={isPending || m.role === "OWNER"}
                      title={m.role === "OWNER" ? "Kan ikke fjerne eier" : "Fjern fra org"}
                      className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
