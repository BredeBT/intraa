import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PRESTIGE_PERKS } from "@/lib/clickerUpgrades";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, action, perkId } = await req.json() as {
    orgId:   string;
    action:  "buy" | "reset";
    perkId?: string;
  };
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { db } = await import("@/server/db");

  const profile = await db.clickerProfile.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    select: { totalPrestige: true, prestigeShop: true, prestigePointsSpent: true },
  });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const shop   = (profile.prestigeShop ?? {}) as Record<string, number>;
  const spent  = profile.prestigePointsSpent;
  const avail  = profile.totalPrestige - spent;

  if (action === "reset") {
    const updated = await db.clickerProfile.update({
      where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
      data:  { prestigeShop: {}, prestigePointsSpent: 0 },
      select: { prestigeShop: true, prestigePointsSpent: true, totalPrestige: true },
    });
    return NextResponse.json({
      prestigeShop:        {} as Record<string, number>,
      prestigePointsSpent: 0,
      pointsAvailable:     updated.totalPrestige,
    });
  }

  if (action === "buy") {
    if (!perkId) return NextResponse.json({ error: "perkId required" }, { status: 400 });

    const perk = PRESTIGE_PERKS.find((p) => p.id === perkId);
    if (!perk) return NextResponse.json({ error: "Unknown perk" }, { status: 400 });

    const currentOwned = shop[perkId] ?? 0;
    if (currentOwned >= perk.maxPurchases)
      return NextResponse.json({ error: "Maks antall kjøp nådd" }, { status: 400 });
    if (avail < perk.cost)
      return NextResponse.json({ error: "Ikke nok prestisjepoeng" }, { status: 400 });

    const newShop  = { ...shop, [perkId]: currentOwned + 1 };
    const newSpent = spent + perk.cost;

    const updated = await db.clickerProfile.update({
      where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
      data:  { prestigeShop: newShop, prestigePointsSpent: newSpent },
      select: { prestigeShop: true, prestigePointsSpent: true, totalPrestige: true },
    });

    return NextResponse.json({
      prestigeShop:        (updated.prestigeShop ?? {}) as Record<string, number>,
      prestigePointsSpent: updated.prestigePointsSpent,
      pointsAvailable:     updated.totalPrestige - updated.prestigePointsSpent,
    });
  }

  return NextResponse.json({ error: "Ugyldig handling" }, { status: 400 });
}
