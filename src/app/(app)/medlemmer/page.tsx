import { redirect } from "next/navigation";
import { getUserOrg } from "@/server/getUserOrg";
import { db } from "@/server/db";

const ROLE_STYLES: Record<string, string> = {
  OWNER:     "bg-amber-500/10 text-amber-400",
  ADMIN:     "bg-indigo-500/10 text-indigo-400",
  MODERATOR: "bg-violet-500/10 text-violet-400",
  VIP:       "bg-emerald-500/10 text-emerald-400",
  MEMBER:    "bg-zinc-500/10 text-zinc-400",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER:     "Eier",
  ADMIN:     "Admin",
  MODERATOR: "Moderator",
  VIP:       "VIP",
  MEMBER:    "Medlem",
};

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function MedlemmerPage() {
  const ctx = await getUserOrg();
  if (!ctx) redirect("/feed");

  const memberships = await db.membership.findMany({
    where:   { organizationId: ctx.organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { role: "asc" },
  });

  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Medlemmer</h1>

      {memberships.length === 0 ? (
        <p className="text-sm text-zinc-600">Ingen medlemmer i denne organisasjonen ennå.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Navn</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden sm:table-cell">E-post</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Rolle</th>
              </tr>
            </thead>
            <tbody className="bg-zinc-950">
              {memberships.map((m, i) => {
                const name = m.user.name ?? m.user.email;
                return (
                  <tr
                    key={m.id}
                    className={`transition-colors hover:bg-zinc-900 ${i < memberships.length - 1 ? "border-b border-zinc-800" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
                          {initials(name)}
                        </div>
                        <span className="font-medium text-white">{name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-400 hidden sm:table-cell">{m.user.email}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[m.role] ?? ROLE_STYLES.MEMBER}`}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
