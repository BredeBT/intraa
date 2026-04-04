"use client";

import { useState } from "react";
import { Search } from "lucide-react";

const initialUsers = [
  { id: 1, name: "Anders Sørensen", email: "anders@intraa.no", role: "Admin", lastActive: "I dag", status: "Aktiv" },
  { id: 2, name: "Maria Haugen", email: "maria@intraa.no", role: "Medlem", lastActive: "I dag", status: "Aktiv" },
  { id: 3, name: "Thomas Kvam", email: "thomas@intraa.no", role: "Medlem", lastActive: "I går", status: "Aktiv" },
  { id: 4, name: "Linn Berg", email: "linn@intraa.no", role: "Medlem", lastActive: "14.03.2026", status: "Inaktiv" },
  { id: 5, name: "Ole Rønning", email: "ole@intraa.no", role: "Admin", lastActive: "I dag", status: "Aktiv" },
  { id: 6, name: "Kari Moe", email: "kari@intraa.no", role: "Medlem", lastActive: "02.04.2026", status: "Aktiv" },
];

const roles = ["Admin", "Medlem"];

export default function BrukerePage() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [editingRole, setEditingRole] = useState<number | null>(null);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  function toggleStatus(id: number) {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: u.status === "Aktiv" ? "Inaktiv" : "Aktiv" } : u))
    );
  }

  function setRole(id: number, role: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    setEditingRole(null);
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Brukere</h1>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500">
          + Inviter bruker
        </button>
      </div>

      {/* Search */}
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
              <th className="px-5 py-3 text-left font-medium text-zinc-500">E-post</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Rolle</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Sist aktiv</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Status</th>
              <th className="px-5 py-3 text-right font-medium text-zinc-500">Handlinger</th>
            </tr>
          </thead>
          <tbody className="bg-zinc-950">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-zinc-500">
                  Ingen brukere funnet.
                </td>
              </tr>
            )}
            {filtered.map((user, i) => (
              <tr
                key={user.id}
                className={`transition-colors hover:bg-zinc-900 ${i < filtered.length - 1 ? "border-b border-zinc-800" : ""}`}
              >
                <td className="px-5 py-4 font-medium text-white">{user.name}</td>
                <td className="px-5 py-4 text-zinc-400">{user.email}</td>
                <td className="px-5 py-4">
                  {editingRole === user.id ? (
                    <select
                      autoFocus
                      value={user.role}
                      onChange={(e) => setRole(user.id, e.target.value)}
                      onBlur={() => setEditingRole(null)}
                      className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white outline-none"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.role === "Admin"
                          ? "bg-indigo-500/10 text-indigo-400"
                          : "bg-zinc-500/10 text-zinc-400"
                      }`}
                    >
                      {user.role}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-zinc-500">{user.lastActive}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${user.status === "Aktiv" ? "bg-emerald-400" : "bg-zinc-600"}`} />
                    <span className={user.status === "Aktiv" ? "text-zinc-300" : "text-zinc-500"}>{user.status}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingRole(user.id)}
                      className="rounded-md bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                    >
                      Rediger rolle
                    </button>
                    <button
                      onClick={() => toggleStatus(user.id)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        user.status === "Aktiv"
                          ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                    >
                      {user.status === "Aktiv" ? "Deaktiver" : "Aktiver"}
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
