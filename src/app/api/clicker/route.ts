import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { calcCoinsPerClick, calcCoinsPerSecond, MAX_OFFLINE_HOURS } from "@/lib/clickerUpgrades";

const MAX_OFFLINE_SECONDS = MAX_OFFLINE_HOURS * 3600;

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

  const now = new Date();
  const offlineSeconds = Math.min(
    (now.getTime() - profile.lastSeen.getTime()) / 1000,
    MAX_OFFLINE_SECONDS,
  );
  const offlineEarned = offlineSeconds > 5
    ? offlineSeconds * profile.coinsPerSecond * profile.permanentBonus
    : 0;

  const activeEvent = await db.clickerEvent.findFirst({
    where: { organizationId: orgId, active: true, endsAt: { gt: now } },
    orderBy: { startedAt: "desc" },
  });

  const updatedProfile = await db.clickerProfile.update({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    data: {
      coins:    { increment: offlineEarned },
      lastSeen: now,
    },
  });

  return NextResponse.json({
    profile:       updatedProfile,
    upgrades,
    offlineEarned: Math.floor(offlineEarned),
    activeEvent,
  });
}
