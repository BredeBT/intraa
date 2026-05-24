import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";
import InnstillingerClient, { type OrgStats } from "./InnstillingerClient";

export default async function InnstillingerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { organizationId, role } = await requireAdmin();
  const { tab } = await searchParams;

  const fiveMinAgo  = new Date(Date.now() - 5 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [org, theme, streamSettings, stats] = await Promise.all([
    db.organization.findUnique({ where: { id: organizationId } }),
    db.tenantTheme.findUnique({ where: { organizationId } }),
    db.streamSettings.findUnique({ where: { organizationId } }),
    loadOrgStats(organizationId, fiveMinAgo, sevenDaysAgo),
  ]);

  if (!org) return null;

  const themeInitial = {
    logoUrl:        theme?.logoUrl        ?? null,
    bannerUrl:      theme?.bannerUrl      ?? null,
    bannerPreset:   theme?.bannerPreset   ?? null,
    avatarPreset:   theme?.avatarPreset   ?? null,
    borderRadius:   theme?.borderRadius   ?? "rounded-lg",
    fontStyle:      theme?.fontStyle      ?? "default",
    welcomeMessage: theme?.welcomeMessage ?? "",
  };

  return (
    <InnstillingerClient
      initialTab={tab ?? "generelt"}
      org={{
        id:          org.id,
        name:        org.name,
        slug:        org.slug,
        type:        org.type,
        plan:        org.plan,
        description: org.description ?? "",
        createdAt:   org.createdAt.toISOString(),
      }}
      theme={themeInitial}
      userRole={role}
      streamSettings={{
        twitchChannel:     streamSettings?.twitchChannel     ?? "",
        youtubeChannel:    streamSettings?.youtubeChannel    ?? "",
        preferredPlatform: streamSettings?.preferredPlatform ?? "twitch",
      }}
      stats={stats}
    />
  );
}

/**
 * Henter alt Statistikk-tab trenger i én rund. Kjøres parallelt med øvrige queries.
 */
async function loadOrgStats(orgId: string, fiveMinAgo: Date, sevenDaysAgo: Date): Promise<OrgStats> {
  const now = new Date();

  const [
    totalMembers, newMembers7d, activeNow, active7d,
    posts7d, messages7d, activeFanpass,
    coinAgg, coinsAwarded7dAgg,
    memberships,
    coinTx14d,
  ] = await Promise.all([
    db.membership.count({ where: { organizationId: orgId } }),
    db.user.count({
      where: { memberships: { some: { organizationId: orgId } }, createdAt: { gte: sevenDaysAgo } },
    }),
    db.user.count({
      where: { memberships: { some: { organizationId: orgId } }, lastActive: { gte: fiveMinAgo } },
    }),
    db.user.count({
      where: { memberships: { some: { organizationId: orgId } }, lastActive: { gte: sevenDaysAgo } },
    }),
    db.post.count({ where: { orgId, createdAt: { gte: sevenDaysAgo } } }),
    db.message.count({
      where: { createdAt: { gte: sevenDaysAgo }, channel: { orgId } },
    }),
    db.fanPass.count({
      where: { organizationId: orgId, status: "ACTIVE", endDate: { gt: now } },
    }),
    // Coins i omløp = sum av Membership.points (shop-saldo).
    // IKKE ClickerProfile.coins — det er klikkerspillets interne valuta som vokser til milliarder.
    db.membership.aggregate({
      where:   { organizationId: orgId },
      _sum:    { points: true },
    }),
    db.coinTransaction.aggregate({
      where:   { organizationId: orgId, amount: { gt: 0 }, createdAt: { gte: sevenDaysAgo } },
      _sum:    { amount: true },
    }),
    db.membership.findMany({
      where:   { organizationId: orgId },
      select:  { user: { select: { createdAt: true } } },
    }),
    db.coinTransaction.findMany({
      where:   { organizationId: orgId, amount: { gt: 0 }, createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      select:  { amount: true, createdAt: true },
    }),
  ]);

  // Memberveskt-array: 8 uker, antall medlemmer ved slutten av hver uke
  const memberGrowth: number[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const count   = memberships.filter((m) => m.user.createdAt <= weekEnd).length;
    memberGrowth.push(count);
  }

  // Coin-flow: 14 dager, sum per dag
  const coinFlow: number[] = Array(14).fill(0);
  for (const tx of coinTx14d) {
    const daysAgo = Math.floor((now.getTime() - tx.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    const idx     = 13 - daysAgo;
    if (idx >= 0 && idx < 14) coinFlow[idx] += tx.amount;
  }

  return {
    totalMembers,
    newMembers7d,
    activeNow,
    active7d,
    posts7d,
    messages7d,
    activeFanpass,
    coinsInCirculation: coinAgg._sum.points ?? 0,
    coinsAwarded7d:     coinsAwarded7dAgg._sum.amount ?? 0,
    memberGrowth,
    coinFlow,
  };
}
