const members = [
  { id: 1, initials: "AS", name: "Anders Sørensen", role: "Admin", status: "Aktiv" },
  { id: 2, initials: "MH", name: "Maria Haugen", role: "Medlem", status: "Aktiv" },
  { id: 3, initials: "TK", name: "Thomas Kvam", role: "Medlem", status: "Aktiv" },
  { id: 4, initials: "LB", name: "Linn Berg", role: "Medlem", status: "Inaktiv" },
  { id: 5, initials: "OR", name: "Ole Rønning", role: "Admin", status: "Aktiv" },
];

const roleStyles: Record<string, string> = {
  Admin: "bg-indigo-500/10 text-indigo-400",
  Medlem: "bg-zinc-500/10 text-zinc-400",
};

export default function MedlemmerPage() {
  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Medlemmer</h1>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Navn</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Rolle</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Status</th>
            </tr>
          </thead>
          <tbody className="bg-zinc-950">
            {members.map((member, i) => (
              <tr
                key={member.id}
                className={`transition-colors hover:bg-zinc-900 ${
                  i < members.length - 1 ? "border-b border-zinc-800" : ""
                }`}
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
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleStyles[member.role]}`}>
                    {member.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        member.status === "Aktiv" ? "bg-emerald-400" : "bg-zinc-600"
                      }`}
                    />
                    <span className={member.status === "Aktiv" ? "text-zinc-300" : "text-zinc-500"}>
                      {member.status}
                    </span>
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
