import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ArrowRight, Inbox } from "lucide-react";
import SupportFilters from "./SupportFilters";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

type Status = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";

const STATUS_LABELS: Record<Status, string> = {
  OPEN:        "Åpen",
  IN_PROGRESS: "Under arbeid",
  WAITING:     "Venter",
  RESOLVED:    "Løst",
  CLOSED:      "Lukket",
};

const STATUS_STYLES: Record<Status, string> = {
  OPEN:        "bg-yellow-500/10 text-yellow-400",
  IN_PROGRESS: "bg-blue-500/10 text-blue-400",
  WAITING:     "bg-orange-500/10 text-orange-400",
  RESOLVED:    "bg-emerald-500/10 text-emerald-400",
  CLOSED:      "bg-zinc-700/50 text-zinc-500",
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export default async function SupportInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tenant?: string; category?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/feed");

  const params = await searchParams;

  const supportOrg = await db.organization.findUnique({ where: { slug: "intraa-support" } });
  if (!supportOrg) {
    return (
      <div className="px-8 py-8">
        <p className="text-sm text-zinc-500">Support-org er ikke opprettet ennå. Kjør <code className="text-indigo-400">npx ts-node src/scripts/seed-support-org.ts</code></p>
      </div>
    );
  }

  const tickets = await db.ticket.findMany({
    where: {
      orgId:    supportOrg.id,
      source:   "SUPPORT",
      ...(params.status && params.status !== "ALL" ? { status: params.status as Status } : {}),
      ...(params.category && params.category !== "ALL" ? { categoryId: params.category } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      author:      { select: { id: true, name: true, email: true } },
      assignee:    { select: { id: true, name: true } },
      _count:      { select: { replies: true } },
    },
  });

  // Enrich with tenant name
  const tenantIds = [...new Set(tickets.map((t) => t.fromTenantId).filter(Boolean) as string[])];
  const tenants   = await db.organization.findMany({
    where:  { id: { in: tenantIds } },
    select: { id: true, name: true, slug: true },
  });
  const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t]));

  return (
    <div className="px-8 py-8">
      <div className="mb-1 flex items-center gap-2">
        <Inbox className="h-5 w-5 text-indigo-400" />
        <h1 className="text-xl font-semibold text-white">Support-innboks</h1>
      </div>
      <p className="mb-6 text-sm text-zinc-500">Alle support-henvendelser fra tenants.</p>

      <SupportFilters />

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center">
          <p className="text-sm text-zinc-500">Ingen support-henvendelser ennå.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Tittel</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Fra tenant</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Bruker</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 hidden md:table-cell">Kategori</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 hidden md:table-cell">Dato</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="bg-zinc-950">
              {tickets.map((ticket, i) => {
                const tenant = ticket.fromTenantId ? tenantMap[ticket.fromTenantId] : null;
                const status = ticket.status as Status;
                return (
                  <tr
                    key={ticket.id}
                    className={`transition-colors hover:bg-zinc-900 ${i < tickets.length - 1 ? "border-b border-zinc-800" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-white line-clamp-1">{ticket.title}</p>
                      {ticket._count.replies > 0 && (
                        <p className="text-xs text-zinc-500">{ticket._count.replies} svar</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-zinc-400">
                      {tenant ? (
                        <span className="text-xs">{tenant.name} <span className="text-zinc-600">/{tenant.slug}</span></span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-zinc-300">{ticket.author.name ?? "—"}</p>
                      <p className="text-xs text-zinc-600">{ticket.author.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="hidden px-5 py-4 text-xs text-zinc-400 md:table-cell">{ticket.categoryId ?? "—"}</td>
                    <td className="hidden px-5 py-4 text-xs text-zinc-500 md:table-cell">{formatDate(ticket.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/superadmin/support/${ticket.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
                      >
                        Åpne <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
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
