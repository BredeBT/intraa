import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import Link from "next/link";
import { Users, Radio, Lock, Globe, UserCheck } from "lucide-react";
import { JoinButton, RequestToJoinButton } from "./JoinButtons";
import { BANNER_PRESETS, AVATAR_PRESETS } from "@/lib/themePresets";

export const dynamic = "force-dynamic";

export default async function CommunityLandingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session     = await auth();

  const org = await db.organization.findUnique({
    where:   { slug: orgSlug },
    include: {
      theme:          true,
      streamSessions: { where: { endedAt: null }, select: { id: true }, take: 1 },
      features:       { select: { feature: true } },
      memberships: {
        where:   { role: "OWNER" },
        include: { user: { select: { name: true, username: true, avatarUrl: true, bio: true, website: true } } },
        take:    1,
      },
    },
  });

  if (!org || org.type !== "COMMUNITY") notFound();

  const now        = new Date();
  const weekAgo    = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [memberCount, recentMembers, weekPostCount, activeMembersToday] = await Promise.all([
    db.membership.count({ where: { organizationId: org.id } }),
    db.membership.findMany({
      where:   { organizationId: org.id },
      take:    6,
      orderBy: { id: "desc" },
      include: { user: { select: { name: true, avatarUrl: true } } },
    }),
    db.post.count({ where: { orgId: org.id, createdAt: { gte: weekAgo } } }),
    db.userActivity.count({ where: { organizationId: org.id, createdAt: { gte: todayStart } } }),
  ]);

  const isLive          = org.streamSessions.length > 0;
  const enabledFeatures = org.features.map((f) => f.feature);
  const owner           = org.memberships[0] ?? null;

  let memberStatus: "not_member" | "member" | "owner" = "not_member";
  if (session?.user?.id) {
    const m = await db.membership.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: org.id } },
    });
    if (m) memberStatus = m.role === "OWNER" ? "owner" : "member";
  }

  // Show all features if none are configured (no restrictions), otherwise filter
  const hasFeature = (key: string) =>
    enabledFeatures.length === 0 || enabledFeatures.includes(key);

  const ALL_FEATURES = [
    { icon: "💬", label: "Chat med medlemmer",           key: "chat" },
    { icon: "📝", label: "Feed og innlegg",               key: "community_feed" },
    { icon: "🏆", label: "Rangeringer og konkurranser",   key: "community_leaderboard" },
    { icon: "🎮", label: "Spill og coins",                key: "community_loyalty" },
    { icon: "🎫", label: "Fanpass og eksklusive fordeler", key: "fanpass" },
  ];
  const featureItems = ALL_FEATURES.filter((f) => hasFeature(f.key));

  const joinTypeLabel: Record<string, string> = {
    OPEN:    "Åpent for alle",
    CLOSED:  "Godkjenning kreves",
    PRIVATE: "Kun invitasjon",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── BANNER ───────────────────────────────────────────────────────────── */}
      <div className="relative h-48 w-full overflow-hidden">
        {org.theme?.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.theme.bannerUrl} alt="" className="h-full w-full object-cover" />
        ) : org.theme?.bannerPreset ? (
          <div
            className="h-full w-full"
            style={{ background: BANNER_PRESETS.find((p) => p.id === org.theme?.bannerPreset)?.css }}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-violet-900 via-violet-800 to-indigo-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-950" />
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {/* Logo + org name — overlaps banner slightly */}
        <div className="-mt-10 mb-6 flex items-end gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border-4 border-zinc-950 bg-zinc-800 shadow-xl">
            {org.theme?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.theme.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : org.theme?.avatarPreset ? (
              (() => {
                const ap = AVATAR_PRESETS.find((p) => p.id === org.theme?.avatarPreset);
                return (
                  <div
                    className="flex h-full w-full items-center justify-center text-3xl"
                    style={{ background: ap?.bg }}
                  >
                    {ap?.emoji ?? org.name[0].toUpperCase()}
                  </div>
                );
              })()
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-violet-600 text-3xl font-bold text-white">
                {org.name[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-2xl font-bold text-white">{org.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {memberCount.toLocaleString("nb-NO")} medlemmer
              </span>
              <span className="flex items-center gap-1.5">
                {org.joinType === "OPEN"
                  ? <Globe className="h-4 w-4" />
                  : org.joinType === "CLOSED"
                    ? <UserCheck className="h-4 w-4" />
                    : <Lock className="h-4 w-4" />}
                {joinTypeLabel[org.joinType] ?? org.joinType}
              </span>
              {isLive && (
                <span className="flex items-center gap-1.5 font-medium text-rose-400">
                  <Radio className="h-4 w-4" /> Live nå
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── TWO-COLUMN ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

          {/* LEFT — 65% */}
          <div className="min-w-0 flex-1 space-y-6">

            {/* Om community */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Om community</h2>
              <p className="leading-relaxed text-zinc-300">
                {org.theme?.welcomeMessage ??
                  org.description ??
                  `Bli en del av ${org.name} sitt community. Her finner du fellesskap, engasjerende innhold og mye mer.`}
              </p>
            </div>

            {/* Siste aktivitet — låst/blurred preview */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Siste aktivitet</h2>
              <div className="mb-4 flex flex-wrap gap-4 text-sm text-zinc-400">
                <span>
                  📅 <strong className="text-white">{weekPostCount}</strong> innlegg denne uken
                </span>
                <span>
                  👥 <strong className="text-white">{activeMembersToday}</strong> aktive i dag
                </span>
              </div>

              {/* Blurred post skeletons */}
              <div className="relative select-none space-y-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-zinc-700/40 bg-zinc-800/60 p-4 blur-sm"
                    style={{ opacity: 1 - i * 0.2 }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-violet-600/50" />
                      <div className="h-2.5 w-28 rounded-full bg-zinc-600/80" />
                      <div className="ml-auto h-2 w-16 rounded-full bg-zinc-700/60" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-full rounded-full bg-zinc-600/70" />
                      <div className="h-2.5 w-5/6 rounded-full bg-zinc-600/70" />
                      <div className="h-2.5 w-3/5 rounded-full bg-zinc-600/50" />
                    </div>
                  </div>
                ))}

                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/95 shadow-lg">
                    <Lock className="h-6 w-6 text-zinc-400" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-300">Bli med for å se innhold</p>
                </div>
              </div>
            </div>

            {/* Hva får du tilgang til? */}
            {featureItems.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Hva får du tilgang til?
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {featureItems.map((f) => (
                    <div
                      key={f.key}
                      className="flex items-center gap-3 rounded-xl border border-zinc-700/50 bg-zinc-800/40 px-4 py-3"
                    >
                      <span className="text-xl">{f.icon}</span>
                      <span className="text-sm text-zinc-300">{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — 35% */}
          <div className="w-full shrink-0 space-y-4 lg:w-80">

            {/* Bli med-kort (sticky) */}
            <div className="sticky top-6 rounded-2xl border border-violet-600/30 bg-violet-950/20 p-6">
              <p className="mb-1 text-lg font-bold text-white">Bli med i {org.name}</p>
              <p className="mb-4 text-sm text-zinc-400">
                {org.joinType === "OPEN"
                  ? "Åpent for alle — bli med nå!"
                  : org.joinType === "CLOSED"
                    ? "Send en forespørsel for å bli med"
                    : "Kun tilgjengelig via invitasjon"}
              </p>

              {/* Member avatars */}
              <div className="mb-4 flex -space-x-2">
                {recentMembers.slice(0, 5).map((m) =>
                  m.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={m.id}
                      src={m.user.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full border-2 border-zinc-950 object-cover"
                    />
                  ) : (
                    <div
                      key={m.id}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-950 bg-violet-600 text-xs font-bold text-white"
                    >
                      {(m.user.name ?? "?")[0].toUpperCase()}
                    </div>
                  )
                )}
                {memberCount > 5 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-800 text-xs text-zinc-400">
                    +{memberCount - 5}
                  </div>
                )}
              </div>

              {/* CTA */}
              {memberStatus !== "not_member" ? (
                <Link
                  href={`/${org.slug}/feed`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500"
                >
                  Gå til community →
                </Link>
              ) : !session ? (
                <>
                  <Link
                    href={`/registrer?next=/c/${org.slug}`}
                    className="flex w-full items-center justify-center rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500"
                  >
                    Registrer deg for å bli med →
                  </Link>
                  <p className="mt-3 text-center text-xs text-zinc-500">
                    Har du konto?{" "}
                    <Link href="/login" className="text-violet-400 transition-colors hover:text-violet-300">
                      Logg inn
                    </Link>
                  </p>
                </>
              ) : org.joinType === "PRIVATE" ? (
                <span className="flex w-full items-center justify-center rounded-xl border border-zinc-700 py-3 text-sm text-zinc-500">
                  Kun via invitasjon
                </span>
              ) : org.joinType === "CLOSED" ? (
                <RequestToJoinButton orgId={org.id} />
              ) : (
                <JoinButton orgId={org.id} slug={org.slug} />
              )}

              {/* Stats */}
              <div className="mt-4 space-y-2 border-t border-zinc-800/60 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Medlemmer</span>
                  <span className="font-medium text-white">{memberCount.toLocaleString("nb-NO")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Type</span>
                  <span className="font-medium text-white">
                    {org.joinType === "OPEN" ? "🌐 Åpent" : org.joinType === "CLOSED" ? "🔒 Lukket" : "🔑 Privat"}
                  </span>
                </div>
                {isLive && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Status</span>
                    <span className="flex items-center gap-1.5 font-medium text-rose-400">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                      </span>
                      LIVE nå
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Eier-info */}
            {owner && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Eier</p>
                <div className="flex items-center gap-3">
                  {owner.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={owner.user.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-white">
                      {(owner.user.name ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{owner.user.name ?? "Ukjent"}</p>
                    {owner.user.username && (
                      <Link
                        href={`/u/${owner.user.username}`}
                        className="text-xs text-zinc-500 transition-colors hover:text-violet-400"
                      >
                        @{owner.user.username}
                      </Link>
                    )}
                  </div>
                </div>
                {owner.user.bio && (
                  <p className="mt-3 text-xs leading-relaxed text-zinc-400">{owner.user.bio}</p>
                )}
                {owner.user.website && (
                  <a
                    href={owner.user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block truncate text-xs text-violet-400 transition-colors hover:text-violet-300"
                  >
                    🔗 {owner.user.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
