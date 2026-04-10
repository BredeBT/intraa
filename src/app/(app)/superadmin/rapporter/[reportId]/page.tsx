import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import ReportDetailClient from "./ReportDetailClient";

export const dynamic = "force-dynamic";

const REASON_FULL: Record<string, string> = {
  HARASSMENT:    "😤 Trakassering eller mobbing",
  HATE_SPEECH:   "🤬 Hat og diskriminering",
  SPAM:          "📢 Spam eller reklame",
  INAPPROPRIATE: "🔞 Upassende innhold",
  THREATS:       "⚡ Trusler",
  IMPERSONATION: "🎭 Utgir seg for å være noen andre",
  CHEATING:      "🎮 Juks i spill eller konkurranser",
  OTHER:         "📋 Annet",
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/feed");

  const { reportId } = await params;

  const report = await db.userReport.findUnique({
    where:   { id: reportId },
    include: {
      reportedUser: { select: { id: true, name: true, username: true, email: true, createdAt: true, avatarUrl: true } },
      reportedBy:   { select: { id: true, name: true } },
      organization: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!report) notFound();

  const [totalReports, lastPost, lastMessage] = await Promise.all([
    db.userReport.count({ where: { reportedUserId: report.reportedUserId } }),
    db.post.findFirst({
      where:   { authorId: report.reportedUserId },
      orderBy: { createdAt: "desc" },
      select:  { createdAt: true },
    }),
    db.message.findFirst({
      where:   { authorId: report.reportedUserId },
      orderBy: { createdAt: "desc" },
      select:  { createdAt: true },
    }),
  ]);

  const lastActivity = [lastPost?.createdAt, lastMessage?.createdAt]
    .filter(Boolean)
    .sort((a, b) => (b! > a! ? 1 : -1))[0] ?? null;

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/superadmin/rapporter" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Tilbake til rapporter
        </Link>
      </div>

      <ReportDetailClient
        report={{
          id:          report.id,
          reason:      REASON_FULL[report.reason] ?? report.reason,
          description: report.description,
          status:      report.status,
          reviewNote:  report.reviewNote,
          createdAt:   report.createdAt.toISOString(),
          reportedBy:  report.reportedBy.name ?? "—",
          orgName:     report.organization.name,
        }}
        reportedUser={{
          id:           report.reportedUser.id,
          name:         report.reportedUser.name ?? "Ukjent",
          username:     report.reportedUser.username,
          email:        report.reportedUser.email,
          createdAt:    report.reportedUser.createdAt.toISOString(),
          avatarUrl:    report.reportedUser.avatarUrl,
          totalReports,
          lastActivity: lastActivity?.toISOString() ?? null,
        }}
      />
    </div>
  );
}
