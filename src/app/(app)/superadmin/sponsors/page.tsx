import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import Link from "next/link";
import { Briefcase, ExternalLink, ChevronLeft, ChevronRight, Eye, Image as ImageIcon, Users } from "lucide-react";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

function fmtDate(d: Date) {
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export default async function SponsorsAdminPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const sponsors = await db.sponsorProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user:    { select: { id: true, name: true, email: true, username: true } },
      stories: { select: { id: true, expiresAt: true } },
    },
  });

  const now = new Date();

  // Batch-fetch total views per sponsor
  const sponsorIds = sponsors.map((s) => s.id);
  const viewCounts = sponsorIds.length > 0
    ? await db.storyView.groupBy({
        by:    ["storyId"],
        where: { story: { sponsorId: { in: sponsorIds } } },
        _count: { storyId: true },
      })
    : [];

  // Map storyId → count, then aggregate per sponsor via stories list
  const storyIdToSponsor = new Map<string, string>();
  sponsors.forEach((s) => s.stories.forEach((st) => storyIdToSponsor.set(st.id, s.id)));
  const viewsBySponsor = new Map<string, number>();
  for (const v of viewCounts) {
    const sId = storyIdToSponsor.get(v.storyId);
    if (sId) viewsBySponsor.set(sId, (viewsBySponsor.get(sId) ?? 0) + v._count.storyId);
  }

  // Unique creator counts
  const creatorCounts = sponsorIds.length > 0
    ? await db.story.groupBy({
        by:    ["sponsorId", "authorId"],
        where: { sponsorId: { in: sponsorIds } },
      })
    : [];
  const creatorsBySponsor = new Map<string, number>();
  for (const c of creatorCounts) {
    if (!c.sponsorId) continue;
    creatorsBySponsor.set(c.sponsorId, (creatorsBySponsor.get(c.sponsorId) ?? 0) + 1);
  }

  return (
    <div className="px-8 py-8">
      {/* Back */}
      <Link
        href="/superadmin"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Tilbake
      </Link>

      {/* Header */}
      <div className="mb-1 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-zinc-400" />
        <h1 className="text-xl font-semibold text-white">Sponsors</h1>
      </div>
      <p className="mb-8 text-sm text-zinc-500">{sponsors.length} registrert</p>

      {sponsors.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 py-16 text-center">
          <Briefcase className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Ingen sponsors registrert ennå.</p>
          <p className="mt-1 text-xs text-zinc-600">Sponsors signer opp via /registrer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sponsors.map((s) => {
            const activeStories = s.stories.filter((st) => st.expiresAt > now).length;
            const totalViews    = viewsBySponsor.get(s.id) ?? 0;
            const creators      = creatorsBySponsor.get(s.id) ?? 0;
            return (
              <Link
                key={s.id}
                href={`/superadmin/sponsors/${s.slug}`}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-800/40"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
                    style={{
                      background: s.logoUrl ? `url(${s.logoUrl}) center/cover` : "linear-gradient(135deg, #60A5FA, #A855F7)",
                      color:      "#fff",
                    }}
                  >
                    {!s.logoUrl && s.brandName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white truncate">{s.brandName}</p>
                      <ChevronRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                    </div>
                    <p className="text-xs text-zinc-500 truncate">@{s.slug}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {s.user.name} · {fmtDate(s.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-2">
                  <Stat icon={<ImageIcon className="h-3 w-3" />} value={s.stories.length} label="Stories" />
                  <Stat icon={<Users      className="h-3 w-3" />} value={creators}        label="Creators" />
                  <Stat icon={<Eye        className="h-3 w-3" />} value={totalViews}      label="Views" />
                </div>

                {activeStories > 0 && (
                  <p className="mt-3 text-[10px]" style={{ color: "#5EEAD4" }}>
                    ● {activeStories} aktive nå
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-lg bg-zinc-800/60 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-zinc-500">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white mt-0.5">{value.toLocaleString("nb-NO")}</p>
    </div>
  );
}
