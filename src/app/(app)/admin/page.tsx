"use client";

import { useState } from "react";
import { Users, Ticket, FolderOpen, MessageSquare } from "lucide-react";

// Hardkodet rolle — ingen auth ennå
const CURRENT_USER_ROLE = "Admin";

const stats = [
  { label: "Brukere", value: 24, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { label: "Aktive tickets", value: 7, icon: Ticket, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { label: "Lagrede filer", value: 142, icon: FolderOpen, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { label: "Meldinger sendt", value: 1084, icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10" },
];

const initialUsers = [
  { id: 1, name: "Anders Sørensen", role: "Admin", status: "Aktiv" },
  { id: 2, name: "Maria Haugen", role: "Medlem", status: "Aktiv" },
  { id: 3, name: "Thomas Kvam", role: "Medlem", status: "Aktiv" },
  { id: 4, name: "Linn Berg", role: "Medlem", status: "Aktiv" },
  { id: 5, name: "Ole Rønning", role: "Admin", status: "Aktiv" },
];

export default function AdminPage() {
  const [users, setUsers] = useState(initialUsers);

  if (CURRENT_USER_ROLE !== "Admin") {
    return (
      <div className="flex h-full items-center justify-center px-8 py-16">
        <p className="text-zinc-500">Du har ikke tilgang til denne siden.</p>
      </div>
    );
  }

  function deactivate(id: number) {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: u.status === "Aktiv" ? "Inaktiv" : "Aktiv" } : u))
    );
  }

  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Admin — oversikt</h1>

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

      {/* User table */}
      <h2 className="mb-3 text-sm font-semibold text-zinc-400">Brukeradmin</h2>
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Navn</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Rolle</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Status</th>
              <th className="px-5 py-3 text-right font-medium text-zinc-500">Handling</th>
            </tr>
          </thead>
          <tbody className="bg-zinc-950">
            {users.map((user, i) => (
              <tr
                key={user.id}
                className={`transition-colors hover:bg-zinc-900 ${i < users.length - 1 ? "border-b border-zinc-800" : ""}`}
              >
                <td className="px-5 py-4 font-medium text-white">{user.name}</td>
                <td className="px-5 py-4 text-zinc-400">{user.role}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${user.status === "Aktiv" ? "bg-emerald-400" : "bg-zinc-600"}`} />
                    <span className={user.status === "Aktiv" ? "text-zinc-300" : "text-zinc-500"}>{user.status}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => deactivate(user.id)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      user.status === "Aktiv"
                        ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    }`}
                  >
                    {user.status === "Aktiv" ? "Deaktiver" : "Aktiver"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
