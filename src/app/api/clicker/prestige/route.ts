import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { WORLDS, MAX_WORLD, calcPerkConfig } from "@/lib/clickerUpgrades";
import { awardCoins } from "@/lib/awardCoins";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await req.json() as { orgId: string };
  if (!orgId) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { db } = await import("@/server/db");

  const profile = await db.clickerProfile.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
  });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const world    = profile.prestigeWorld;
  const worldDef = WORLDS[world];
  if (!worldDef || worldDef.prestigeCost === 0) {
    return NextResponse.json({ error: "Kan ikke prestige i siste verden" }, { status: 400 });
  }

  if (Number(profile.coins) < worldDef.prestigeCost) {
    return NextResponse.json({ error: "Not enough coins for prestige" }, { status: 400 });
  }

  // Apply prestige_bonus perk: base +10% + extra per stack
  const shop    = (profile.prestigeShop ?? {}) as Record<string, number>;
  const perkCfg = calcPerkConfig(shop);
  const bonusPerPrestige = 0.10 + perkCfg.prestigeExtraBonus;
  const newBonus = Math.round((Number(profile.permanentBonus) + bonusPerPrestige) * 1000) / 1000;

  // Quick start perk: begin with extra coins
  const startCoins = perkCfg.quickStartCoins;

  const nextWorld = Math.min(world + 1, MAX_WORLD);

  // Delete all upgrades (reset)
  await db.clickerUpgrade.deleteMany({
    where: { userId: session.user.id, organizationId: orgId },
  });

  const updatedProfile = await db.clickerProfile.update({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    data: {
      coins:          startCoins,
      coinsPerClick:  newBonus,
      coinsPerSecond: 0,
      prestigeLevel:  { increment: 1 },
      totalPrestige:  { increment: 1 },
      permanentBonus: newBonus,
      prestigeWorld:  nextWorld,
      lastSeen:       new Date(),
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
      prestigeShop:        true,
      prestigePointsSpent: true,
    },
  });

  // Award fanpass coins
  if (worldDef.fanpassCoins > 0) {
    void awardCoins({
      userId:         session.user.id,
      organizationId: orgId,
      amount:         worldDef.fanpassCoins,
      reason:         "prestige",
      description:    `Prestige fullført — Verden ${world}: ${worldDef.name}`,
    });
  }

  return NextResponse.json({
    profile: {
      coins:               Number(updatedProfile.coins),
      coinsPerClick:       Number(updatedProfile.coinsPerClick),
      coinsPerSecond:      Number(updatedProfile.coinsPerSecond),
      totalClicks:         updatedProfile.totalClicks,
      allTimeHighCoins:    Number(updatedProfile.allTimeHighCoins),
      prestigeWorld:       updatedProfile.prestigeWorld,
      prestigeLevel:       updatedProfile.prestigeLevel,
      permanentBonus:      Number(updatedProfile.permanentBonus),
      totalPrestige:       updatedProfile.totalPrestige,
      prestigeShop:        (updatedProfile.prestigeShop ?? {}) as Record<string, number>,
      prestigePointsSpent: updatedProfile.prestigePointsSpent,
    },
    fanpassCoins:    worldDef.fanpassCoins,
    nextWorld,
    permanentBonus:  newBonus,
    bonusPerPrestige,
  });
}
