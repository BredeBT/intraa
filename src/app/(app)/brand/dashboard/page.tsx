import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import Link from "next/link";
import { Globe, Edit, Eye, Heart, Image as ImageIcon, ExternalLink, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

export default async function BrandDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where:   { id: session.user.id },
    select:  {
      id:       true,
      userType: true,
      sponsorProfile: {
        include: {
          stories: {
            orderBy: { createdAt: "desc" },
            take:    20,
            include: {
              author:  { select: { id: true, name: true, username: true } },
              channel: { select: { name: true, organization: { select: { slug: true, name: true } } } },
              _count:  { select: { views: true } },
            },
          },
          _count: { select: { stories: true } },
        },
      },
    },
  });

  if (!user || user.userType !== "SPONSOR" || !user.sponsorProfile) {
    redirect("/home");
  }

  const brand = user.sponsorProfile;

  // Stats
  const [activeStoriesCount, totalViews, uniqueCreators] = await Promise.all([
    db.story.count({ where: { sponsorId: brand.id, expiresAt: { gt: new Date() } } }),
    db.storyView.count({ where: { story: { sponsorId: brand.id } } }),
    db.story.groupBy({ by: ["authorId"], where: { sponsorId: brand.id } }).then((g) => g.length),
  ]);

  return (
    <div className="min-h-screen px-6 py-10" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="mx-auto max-w-5xl">

        {/* Brand header */}
        <div
          className="relative overflow-hidden rounded-3xl p-7 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(96,165,250,0.15), rgba(168,85,247,0.12))",
            border:     "1px solid var(--border-default)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black"
                style={{
                  background: brand.logoUrl ? `url(${brand.logoUrl}) center/cover` : "linear-gradient(135deg, #60A5FA, #A855F7)",
                  color:      "#fff",
                  boxShadow:  "0 8px 24px rgba(96,165,250,0.4)",
                }}
              >
                {!brand.logoUrl && brand.brandName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#60A5FA" }}>Sponsor-dashboard</p>
                <h1 className="text-2xl font-bold mt-0.5">{brand.brandName}</h1>
                {brand.website && (
                  <a href={brand.website} target="_blank" rel="noopener noreferrer"
                     className="mt-1 inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
                    <Globe className="h-3 w-3" />
                    {brand.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/brand/${brand.slug}`}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:text-white hover:border-white/20 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Offentlig profil
              </Link>
              <Link
                href="/brand/dashboard/innstillinger"
                className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:text-white hover:border-white/20 transition-colors"
              >
                <Edit className="h-3.5 w-3.5" />
                Rediger
              </Link>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<ImageIcon className="h-4 w-4" />} label="Aktive stories"  value={activeStoriesCount} accent="#A855F7" />
          <StatCard icon={<ImageIcon className="h-4 w-4" />} label="Stories totalt"  value={brand._count.stories} accent="#60A5FA" />
          <StatCard icon={<Eye        className="h-4 w-4" />} label="Visninger"       value={totalViews}          accent="#5EEAD4" />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Creators"        value={uniqueCreators}      accent="#F472B6" />
        </div>

        {/* Recent stories */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40 mb-3">Siste stories med ditt brand</h2>
        </div>

        {brand.stories.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: "var(--bg-glass)", border: "1px solid var(--border-default)" }}
          >
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA" }}
            >
              <ImageIcon className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-white mb-1">Ingen sponsorede stories enda</p>
            <p className="text-sm text-white/50 max-w-md mx-auto">
              Når en creator du samarbeider med tagger en story med ditt brand,
              vil den dukke opp her med visninger og statistikk.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {brand.stories.map((s) => {
              const expired = new Date(s.expiresAt) < new Date();
              return (
                <div
                  key={s.id}
                  className="relative overflow-hidden rounded-2xl aspect-[9/16]"
                  style={{ background: `url(${s.imageUrl}) center/cover, var(--bg-tertiary)`, opacity: expired ? 0.5 : 1 }}
                >
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

                  {/* Top: status pill */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                    {expired ? (
                      <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-white/60">
                        Utløpt
                      </span>
                    ) : (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{ background: "rgba(94,234,212,0.25)", color: "#5EEAD4" }}>
                        Live
                      </span>
                    )}
                    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white flex items-center gap-1">
                      <Eye className="h-2.5 w-2.5" /> {s._count.views}
                    </span>
                  </div>

                  {/* Bottom: creator + date */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-[11px] font-semibold text-white truncate">{s.author.name ?? "Ukjent"}</p>
                    <p className="text-[10px] text-white/60 truncate">
                      {s.channel.organization.name} · {fmt(s.createdAt)}
                    </p>
                    {s.caption && (
                      <p className="mt-1 text-[10px] text-white/80 line-clamp-2">{s.caption}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {brand.stories.length === 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Kom i gang</p>
            <p className="text-sm text-white/70 leading-relaxed">
              Be en creator du samarbeider med om å tagge stories med brandet ditt
              <span className="font-mono text-white/90"> @{brand.slug}</span>.
              De finner brandet via Stories-komposeren når de poster ny story.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--bg-glass)", border: `1px solid ${accent}25` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${accent}15`, color: accent }}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: accent }}>
        {value.toLocaleString("nb-NO")}
      </p>
      <p className="mt-1 text-xs text-white/50">{label}</p>
    </div>
  );
}
