import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUpgradeCost, calcCoinsPerClick, calcCoinsPerSecond, UPGRADES } from "@/lib/clickerUpgrades";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, upgradeId, delta, clicks } = await req.json() as {
    orgId:     string;
    upgradeId: string;
    delta?:    number;
    clicks?:   number;
  };
  if (!orgId || !upgradeId) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const upgradeDef = UPGRADES.find((u) => u.id === upgradeId);
  if (!upgradeDef) return NextResponse.json({ error: "Unknown upgrade" }, { status: 400 });

  const { db } = await import("@/server/db");

  const profile = await db.clickerProfile.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
  });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  // Upgrades must belong to current world
  if (upgradeDef.world !== profile.prestigeWorld) {
    return NextResponse.json({ error: "Wrong world" }, { status: 400 });
  }

  const existing = await db.clickerUpgrade.findUnique({
    where: { userId_organizationId_upgradeId: { userId: session.user.id, organizationId: orgId, upgradeId } },
  });

  const currentLevel = existing?.level ?? 0;
  if (currentLevel >= upgradeDef.maxLevel) {
    return NextResponse.json({ error: "Max level reached" }, { status: 400 });
  }

  // Apply pending delta atomically (cap: 5 min of passive income + clicks)
  const safeClicks = Math.max(0, Math.floor(clicks ?? 0));
  const maxDelta   = (profile.coinsPerSecond * 300) + (safeClicks * profile.coinsPerClick) + 10_000;
  const safeDelta  = Math.min(maxDelta, Math.max(0, Math.floor(delta ?? 0)));

  const cost          = getUpgradeCost(upgradeId, currentLevel);
  const currentCoins  = (profile.coins ?? 0) + safeDelta;

  if (currentCoins < cost) {
    return NextResponse.json({ error: "Not enough coins" }, { status: 400 });
  }

  await db.clickerUpgrade.upsert({
    where: { userId_organizationId_upgradeId: { userId: session.user.id, organizationId: orgId, upgradeId } },
    create: { userId: session.user.id, organizationId: orgId, upgradeId, level: 1 },
    update: { level: { increment: 1 } },
  });

  const allUpgrades = await db.clickerUpgrade.findMany({
    where:  { userId: session.user.id, organizationId: orgId },
    select: { upgradeId: true, level: true },
  });

  const newCoinsPerClick  = calcCoinsPerClick(allUpgrades, profile.prestigeWorld, profile.permanentBonus);
  const newCoinsPerSecond = calcCoinsPerSecond(allUpgrades, profile.prestigeWorld, profile.permanentBonus);
  const newCoins          = Math.max(0, currentCoins - cost);
  const currentHigh       = profile.allTimeHighCoins ?? 0;

  const updatedProfile = await db.clickerProfile.update({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    data: {
      coins:            newCoins,
      allTimeHighCoins: Math.max(currentHigh, currentCoins), // record before purchase deduction
      coinsPerClick:    newCoinsPerClick,
      coinsPerSecond:   newCoinsPerSecond,
      totalClicks:      { increment: safeClicks },
      lastSeen:         new Date(),
    },
  });

  return NextResponse.json({
    profile:  { ...updatedProfile, coins: Number(updatedProfile.coins) },
    upgrades: allUpgrades,
  });
}
