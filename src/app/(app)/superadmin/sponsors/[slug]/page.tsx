import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Mail, Globe, Calendar, Eye, Image as ImageIcon, Users } from "lucide-react";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

function fmt(d: Date) {
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
}
function fmtShort(d: Date) {
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

export default async function SponsorAdminDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const { slug } = await params;

  const sponsor = await db.sponsorProfile.findUnique({
    where: { slug },
    include: {
      user:    { select: { id: true, name: true, email: true, username: true, createdAt: true } },
      stories: {
        orderBy: { createdAt: "desc" },
        include: {
          author:  { select: { id: true, name: true, username: true } },
          channel: { select: { name: true, organization: { select: { slug: true, name: true } } } },
          _count:  { select: { views: true } },
        },
      },
    },
  });
  if (!sponsor) notFound();

  const now = new Date();
  const activeStories = sponsor.stories.filter((s) => s.expiresAt > now);
  const expiredStories = sponsor.stories.filter((s) => s.expiresAt <= now);

  const totalViews = sponsor.stories.reduce((acc, s) => acc + s._count.views, 0);
  const uniqueCreators = new Set(sponsor.stories.map((s) => s.authorId)).size;

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Back */}
      <Link
        href="/superadmin/sponsors"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Alle sponsors
      </Link>

      {/* Header */}
      <div
        className="relative overflow-hidden rounded-3xl p-7 mb-8"
        style={{
          background: "linear-gradient(135deg, rgba(96,165,250,0.15), rgba(168,85,247,0.10))",
          border:     "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black"
              style={{
                background: sponsor.logoUrl ? `url(${sponsor.logoUrl}) center/cover` : "linear-gradient(135deg, #60A5FA, #A855F7)",
                color:      "#fff",
              }}
            >
              {!sponsor.logoUrl && sponsor.brandName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{sponsor.brandName}</h1>
              <p className="text-sm text-white/50">@{sponsor.slug}</p>
            </div>
          </div>
          <Link
            href={`/brand/${sponsor.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:text-white hover:border-white/20"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Offentlig profil
          </Link>
        </div>

        {sponsor.description && (
          <p className="mt-4 text-sm text-white/70 leading-relaxed">{sponsor.description}</p>
        )}

        {/* Brand info row */}
        <div className="mt-5 flex flex-wrap gap-4 text-xs text-white/50">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Registrert {fmt(sponsor.createdAt)}
          </div>
          {sponsor.website && (
            <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white">
              <Globe className="h-3.5 w-3.5" />
              {sponsor.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          <a href={`mailto:${sponsor.user.email}`} className="flex items-center gap-1.5 hover:text-white">
            <Mail className="h-3.5 w-3.5" />
            {sponsor.user.email}
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<ImageIcon className="h-4 w-4" />} label="Aktive stories"  value={activeStories.length}  accent="#5EEAD4" />
        <StatCard icon={<ImageIcon className="h-4 w-4" />} label="Stories totalt"  value={sponsor.stories.length} accent="#A855F7" />
        <StatCard icon={<Users     className="h-4 w-4" />} label="Creators"        value={uniqueCreators}         accent="#F472B6" />
        <StatCard icon={<Eye       className="h-4 w-4" />} label="Total visninger" value={totalViews}             accent="#60A5FA" />
      </div>

      {/* Kontaktperson */}
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Kontaktperson</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{sponsor.user.name}</p>
            <p className="text-xs text-zinc-500">@{sponsor.user.username} · {sponsor.user.email}</p>
          </div>
          <Link
            href={`/superadmin/users?search=${encodeURIComponent(sponsor.user.email)}`}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Administrer →
          </Link>
        </div>
      </div>

      {/* Active stories */}
      {activeStories.length > 0 && (
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Aktive stories ({activeStories.length})</p>
          <StoryGrid stories={activeStories} now={now} />
        </div>
      )}

      {/* Expired stories */}
      {expiredStories.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Utløpte stories ({expiredStories.length})</p>
          <StoryGrid stories={expiredStories} now={now} />
        </div>
      )}

      {sponsor.stories.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 py-16 text-center">
          <ImageIcon className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Ingen sponsorede stories enda</p>
        </div>
      )}
    </div>
  );
}

interface StoryRow {
  id:        string;
  imageUrl:  string;
  caption:   string | null;
  createdAt: Date;
  expiresAt: Date;
  author:    { name: string | null; username: string };
  channel:   { name: string; organization: { name: string; slug: string } };
  _count:    { views: number };
}

function StoryGrid({ stories, now }: { stories: StoryRow[]; now: Date }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {stories.map((s) => {
        const expired = s.expiresAt <= now;
        return (
          <div
            key={s.id}
            className="relative overflow-hidden rounded-xl aspect-[9/16]"
            style={{ background: `url(${s.imageUrl}) center/cover, var(--bg-tertiary)`, opacity: expired ? 0.55 : 1 }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
              {expired ? (
                <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-white/60">Utløpt</span>
              ) : (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(94,234,212,0.25)", color: "#5EEAD4" }}>
                  Live
                </span>
              )}
              <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white flex items-center gap-1">
                <Eye className="h-2.5 w-2.5" /> {s._count.views}
              </span>
            </div>
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-[11px] font-semibold text-white truncate">{s.author.name ?? s.author.username}</p>
              <p className="text-[10px] text-white/60 truncate">{s.channel.organization.name} · {fmtShort(s.createdAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-glass)", border: `1px solid ${accent}25` }}>
      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${accent}15`, color: accent }}>
        {icon}
      </div>
      <p className="text-2xl font-bold" style={{ color: accent }}>{value.toLocaleString("nb-NO")}</p>
      <p className="mt-1 text-xs text-white/50">{label}</p>
    </div>
  );
}
