import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  let orgId: string, delta: number, clicks: number;
  try {
    const raw = contentType.includes("application/json")
      ? await req.json() as { orgId: string; delta: number; clicks?: number }
      : JSON.parse(await req.text()) as { orgId: string; delta: number; clicks?: number };
    orgId  = raw.orgId;
    delta  = raw.delta;
    clicks = raw.clicks ?? 0;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!orgId || delta == null) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const MAX_COINS_PER_SYNC = 10_000;
  const safeCoins  = Math.min(MAX_COINS_PER_SYNC, Math.max(0, Math.floor(delta)));
  const safeClicks = Math.max(0, Math.floor(clicks ?? 0));

  const { db } = await import("@/server/db");

  console.log("[SYNC] Request:", { userId: session.user.id, orgId, safeCoins, safeClicks });

  // Check profile exists
  const existing = await db.clickerProfile.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
  });
  console.log("[SYNC] Existing profile:", existing ? { coins: existing.coins, id: existing.id } : null);

  if (!existing) {
    const created = await db.clickerProfile.create({
      data: {
        userId:         session.user.id,
        organizationId: orgId,
        coins:          safeCoins,
        totalClicks:    safeClicks,
      },
    });
    console.log("[SYNC] Created new profile with coins:", created.coins);
    return NextResponse.json({ coins: created.coins ?? 0 });
  }

  // Use explicit value to avoid NULL + increment = NULL in PostgreSQL
  const currentCoins  = existing.coins        ?? 0;
  const currentClicks = existing.totalClicks  ?? 0;
  const newCoins      = currentCoins  + safeCoins;
  const newClicks     = currentClicks + safeClicks;

  const currentHigh = existing.allTimeHighCoins ?? 0;
  const updated = await db.clickerProfile.update({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    data: {
      coins:            newCoins,
      allTimeHighCoins: Math.max(currentHigh, newCoins),
      totalClicks:      newClicks,
      lastSeen:         new Date(),
    },
  });

  console.log("[SYNC] Updated profile:", { coins: updated.coins, id: updated.id });

  return NextResponse.json({ coins: updated.coins ?? newCoins });
}
