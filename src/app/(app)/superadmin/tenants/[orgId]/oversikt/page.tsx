import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { Users, FileText, MessageSquare, Calendar } from "lucide-react";

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
}

const PLAN_STYLES: Record<string, string> = {
  FREE:       "bg-zinc-700/50 text-zinc-400",
  PRO:        "bg-indigo-500/10 text-indigo-400",
  ENTERPRISE: "bg-amber-500/15 text-amber-400",
};

export default async function OversiktPage({ params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const { orgId } = await params;

  const org = await db.organization.findUnique({
    where:   { id: orgId },
    include: {
      _count: {
        select: { memberships: true, posts: true, channels: true },
      },
    },
  });
  if (!org) notFound();

  const messageCount = await db.message.count({
    where: { channel: { orgId } },
  });

  const stats = [
    { label: "Medlemmer",  value: org._count.memberships, icon: Users,          color: "text-indigo-400",  bg: "bg-indigo-500/10" },
    { label: "Innlegg",    value: org._count.posts,        icon: FileText,       color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Meldinger",  value: messageCount,             icon: MessageSquare,  color: "text-blue-400",    bg: "bg-blue-500/10" },
    { label: "Kanaler",    value: org._count.channels,      icon: Calendar,       color: "text-amber-400",   bg: "bg-amber-500/10" },
  ];

  return (
    <div className="px-8 py-8">
      <h2 className="mb-1 text-lg font-semibold text-white">Oversikt</h2>
      <p className="mb-6 text-sm text-zinc-500">Nøkkelinformasjon om organisasjonen.</p>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{value.toLocaleString("nb-NO")}</p>
            <p className="mt-0.5 text-sm text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="mb-4 text-sm font-semibold text-zinc-400">Detaljer</h3>
        <dl className="space-y-3">
          {[
            { label: "Navn",       value: org.name },
            { label: "Slug",       value: `/${org.slug}` },
            { label: "Type",       value: org.type === "COMMUNITY" ? "Community" : "Bedrift" },
            { label: "Plan",       value: (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_STYLES[org.plan] ?? PLAN_STYLES.FREE}`}>
                {org.plan}
              </span>
            )},
            { label: "Opprettet", value: formatDate(org.createdAt) },
            { label: "ID",         value: <span className="font-mono text-xs text-zinc-500">{org.id}</span> },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
              <dt className="text-sm text-zinc-500">{label}</dt>
              <dd className="text-sm text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
