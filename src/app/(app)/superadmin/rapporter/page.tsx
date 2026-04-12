import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ArrowRight, Flag } from "lucide-react";
import BackButton from "../BackButton";

export const dynamic  = "force-dynamic";
export const revalidate = 0;

type ReportStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED";

const STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING:   "Venter",
  REVIEWED:  "Vurdert",
  RESOLVED:  "Løst",
  DISMISSED: "Avvist",
};

const STATUS_STYLES: Record<ReportStatus, string> = {
  PENDING:   "bg-yellow-500/10 text-yellow-400",
  REVIEWED:  "bg-blue-500/10 text-blue-400",
  RESOLVED:  "bg-emerald-500/10 text-emerald-400",
  DISMISSED: "bg-zinc-700/50 text-zinc-500",
};

const REASON_LABEL: Record<string, string> = {
  HARASSMENT:    "😤 Trakassering",
  HATE_SPEECH:   "🤬 Hat/diskriminering",
  SPAM:          "📢 Spam",
  INAPPROPRIATE: "🔞 Upassende innhold",
  THREATS:       "⚡ Trusler",
  IMPERSONATION: "🎭 Falsk identitet",
  CHEATING:      "🎮 Juks",
  OTHER:         "📋 Annet",
};

const FILTER_TABS: { label: string; value: string }[] = [
  { label: "Alle",    value: "ALL" },
  { label: "Venter",  value: "PENDING" },
  { label: "Vurdert", value: "REVIEWED" },
  { label: "Løst",    value: "RESOLVED" },
  { label: "Avvist",  value: "DISMISSED" },
];

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export default async function RapporterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/feed");

  const { status } = await searchParams;
  const activeFilter = status ?? "ALL";

  const reports = await db.userReport.findMany({
    where: activeFilter !== "ALL" ? { status: activeFilter as ReportStatus } : {},
    orderBy: { createdAt: "desc" },
    include: {
      reportedUser: { select: { id: true, name: true, username: true } },
      reportedBy:   { select: { id: true, name: true } },
      organization: { select: { name: true, slug: true } },
    },
  });

  return (
    <div className="px-8 py-8">
      <BackButton />
      <div className="mb-1 flex items-center gap-2">
        <Flag className="h-5 w-5 text-rose-400" />
        <h1 className="text-xl font-semibold text-white">Brukerrapporter</h1>
      </div>
      <p className="mb-6 text-sm text-zinc-500">Rapporter sendt inn av admins i organisasjoner.</p>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-1.5">
        {FILTER_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "ALL" ? "/superadmin/rapporter" : `?status=${tab.value}`}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === tab.value
                ? "bg-violet-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center">
          <p className="text-sm text-zinc-500">Ingen rapporter funnet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Rapportert bruker</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 hidden md:table-cell">Rapportert av</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 hidden md:table-cell">Org</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Årsak</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 hidden lg:table-cell">Dato</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="bg-zinc-950">
              {reports.map((r, i) => (
                <tr
                  key={r.id}
                  className={`transition-colors hover:bg-zinc-900 ${i < reports.length - 1 ? "border-b border-zinc-800" : ""}`}
                >
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status as ReportStatus]}`}>
                      {STATUS_LABEL[r.status as ReportStatus]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{r.reportedUser.name ?? "—"}</p>
                    {r.reportedUser.username && (
                      <p className="text-xs text-zinc-500">@{r.reportedUser.username}</p>
                    )}
                  </td>
                  <td className="hidden px-5 py-4 text-xs text-zinc-400 md:table-cell">
                    {r.reportedBy.name ?? "—"}
                  </td>
                  <td className="hidden px-5 py-4 text-xs text-zinc-400 md:table-cell">
                    {r.organization.name}
                  </td>
                  <td className="px-5 py-4 text-xs text-zinc-300">
                    {REASON_LABEL[r.reason] ?? r.reason}
                  </td>
                  <td className="hidden px-5 py-4 text-xs text-zinc-500 lg:table-cell">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/superadmin/rapporter/${r.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
                    >
                      Se <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
