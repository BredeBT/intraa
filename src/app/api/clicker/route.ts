import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { calcPerkConfig, MAX_OFFLINE_HOURS } from "@/lib/clickerUpgrades";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { db } = await import("@/server/db");

  let profile = await db.clickerProfile.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
  });

  if (!profile) {
    profile = await db.clickerProfile.create({
      data: { userId: session.user.id, organizationId: orgId },
    });
  }

  const upgrades = await db.clickerUpgrade.findMany({
    where: { userId: session.user.id, organizationId: orgId },
    select: { upgradeId: true, level: true },
  });

  // Apply offline_hours perk
  const shop = (profile.prestigeShop ?? {}) as Record<string, number>;
  const perkCfg = calcPerkConfig(shop);
  const maxOfflineHours = MAX_OFFLINE_HOURS + perkCfg.offlineHours;
  const maxOfflineSeconds = maxOfflineHours * 3600;

  const now = new Date();
  const offlineSeconds = Math.min(
    (now.getTime() - profile.lastSeen.getTime()) / 1000,
    maxOfflineSeconds,
  );
  const cps = Number(profile.coinsPerSecond);
  const offlineEarned = offlineSeconds > 5 ? offlineSeconds * cps : 0;
  const safeOffline   = isFinite(offlineEarned) ? offlineEarned : 0;

  const activeEvent = await db.clickerEvent.findFirst({
    where: { organizationId: orgId, active: true, endsAt: { gt: now } },
    orderBy: { startedAt: "desc" },
  });

  const updatedProfile = await db.clickerProfile.update({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    data: {
      coins:    { increment: safeOffline },
      lastSeen: now,
    },
    select: {
      coins:               true,
      coinsPerClick:       true,
      coinsPerSecond:      true,
      totalClicks:         true,
      allTimeHighCoins:    true,
      prestigeWorld:       true,
      prestigeLevel:       true,
      permanentBonus:      true,
      totalPrestige:       true,
      lastSeen:            true,
      id:                  true,
      userId:              true,
      prestigeShop:        true,
      prestigePointsSpent: true,
    },
  });

  return NextResponse.json({
    profile: {
      id:               updatedProfile.id,
      userId:           updatedProfile.userId,
      coins:            Number(updatedProfile.coins),
      coinsPerClick:    Number(updatedProfile.coinsPerClick),
      coinsPerSecond:   Number(updatedProfile.coinsPerSecond),
      totalClicks:      updatedProfile.totalClicks,
      allTimeHighCoins: Number(updatedProfile.allTimeHighCoins),
      prestigeWorld:    updatedProfile.prestigeWorld,
      prestigeLevel:    updatedProfile.prestigeLevel,
      permanentBonus:   Number(updatedProfile.permanentBonus),
      totalPrestige:    updatedProfile.totalPrestige,
      lastSeen:         updatedProfile.lastSeen.toISOString(),
      prestigeShop:     (updatedProfile.prestigeShop ?? {}) as Record<string, number>,
      prestigePointsSpent: updatedProfile.prestigePointsSpent,
    },
    upgrades,
    offlineEarned: Math.floor(safeOffline),
    activeEvent,
  });
}
