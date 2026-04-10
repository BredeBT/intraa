import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { WORLDS } from "@/lib/clickerUpgrades";
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

  const world = profile.prestigeWorld as 1 | 2 | 3;
  const worldDef = WORLDS[world];

  if (profile.coins < worldDef.prestigeCost) {
    return NextResponse.json({ error: "Not enough coins for prestige" }, { status: 400 });
  }

  // Next world (stay on 3 if already there)
  const nextWorld = world < 3 ? world + 1 : 3;
  const newBonus  = Math.round((profile.permanentBonus + 0.10) * 100) / 100;

  // Delete all upgrades for this user/org (reset)
  await db.clickerUpgrade.deleteMany({
    where: { userId: session.user.id, organizationId: orgId },
  });

  // Reset profile + advance world + apply permanent bonus
  const updatedProfile = await db.clickerProfile.update({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    data: {
      coins:          0,
      coinsPerClick:  newBonus,      // base 1 * permanentBonus
      coinsPerSecond: 0,
      prestigeLevel:  { increment: 1 },
      totalPrestige:  { increment: 1 },
      permanentBonus: newBonus,
      prestigeWorld:  nextWorld,
      lastSeen:       new Date(),
    },
  });

  // Award fanpass coins via awardCoins (uses prestige reason — no daily cap for it)
  void awardCoins({
    userId:         session.user.id,
    organizationId: orgId,
    amount:         worldDef.fanpassCoins,
    reason:         "prestige",
    description:    `Prestige fullført — Verden ${world}: ${worldDef.name}`,
  });

  return NextResponse.json({
    profile:        updatedProfile,
    fanpassCoins:   worldDef.fanpassCoins,
    nextWorld,
    permanentBonus: newBonus,
  });
}
