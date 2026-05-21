import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { Globe, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const brand = await db.sponsorProfile.findUnique({
    where: { slug },
    include: {
      user:    { select: { id: true, name: true, username: true } },
      _count:  { select: { stories: true } },
    },
  });
  if (!brand) notFound();

  // Stats: how many creators they've collaborated with, total story views
  const [creatorCount, totalViews] = await Promise.all([
    db.story.groupBy({
      by:    ["authorId"],
      where: { sponsorId: brand.id },
    }).then((g) => g.length),
    db.storyView.count({
      where: { story: { sponsorId: brand.id } },
    }),
  ]);

  return (
    <div className="min-h-screen px-6 py-10" style={{ background: "#050816", color: "#F0F4FF" }}>
      <div className="mx-auto max-w-3xl">

        {/* Hero — aurora gradient backdrop */}
        <div
          className="relative overflow-hidden rounded-3xl p-8 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(96,165,250,0.15), rgba(168,85,247,0.12), rgba(94,234,212,0.10))",
            border:     "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div className="flex items-center gap-5 relative z-10">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-black shadow-2xl"
              style={{
                background: brand.logoUrl ? `url(${brand.logoUrl}) center/cover` : "linear-gradient(135deg, #60A5FA, #A855F7)",
                color:      "#fff",
              }}
            >
              {!brand.logoUrl && brand.brandName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#60A5FA" }}>Sponsor</p>
              <h1 className="text-3xl font-bold mt-0.5">{brand.brandName}</h1>
              {brand.website && (
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {brand.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
          {brand.description && (
            <p className="relative z-10 mt-5 text-base leading-relaxed text-white/80 max-w-2xl">
              {brand.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Stories" value={brand._count.stories} accent="#A855F7" />
          <StatCard label="Creators" value={creatorCount} accent="#5EEAD4" />
          <StatCard label="Total visninger" value={totalViews} accent="#60A5FA" />
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Calendar className="h-3.5 w-3.5" />
          <span>Sponsor på Intraa siden {fmt(brand.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border:     `1px solid ${accent}25`,
      }}
    >
      <p className="text-3xl font-bold" style={{ color: accent }}>
        {value.toLocaleString("nb-NO")}
      </p>
      <p className="mt-1 text-xs text-white/50">{label}</p>
    </div>
  );
}
