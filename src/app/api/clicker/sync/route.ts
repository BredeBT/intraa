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

  const safeClicks = Math.max(0, Math.floor(clicks ?? 0));

  const { db } = await import("@/server/db");

  console.log("[Sync API] userId:", session.user.id, "orgId:", orgId, "delta:", delta, "clicks:", safeClicks);

  const existing = await db.clickerProfile.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
  });

  console.log("[Sync API] existing profile found:", !!existing, "existing.coins:", existing ? Number(existing.coins) : "N/A");

  if (!existing) {
    console.error("[Sync API] INGEN PROFIL FUNNET for userId:", session.user.id, "orgId:", orgId);
    const created = await db.clickerProfile.create({
      data: {
        userId:         session.user.id,
        organizationId: orgId,
        coins:          Math.max(0, Math.floor(delta)),
        totalClicks:    safeClicks,
      },
      select: { coins: true },
    });
    console.log("[Sync API] Opprettet ny profil, coins:", Number(created.coins));
    return NextResponse.json({ coins: Number(created.coins) });
  }

  // Dynamic cap — 5 minutes of passive + all claimed clicks + small buffer
  const cps      = Number(existing.coinsPerSecond);
  const cpc      = Number(existing.coinsPerClick);
  const maxDelta = (cps * 300) + (safeClicks * cpc) + 10_000;
  const safeCoins = Math.min(maxDelta, Math.max(0, Math.floor(delta)));

  console.log("[Sync API] delta:", delta, "safeCoins:", safeCoins, "maxDelta:", maxDelta, "currentCoins:", Number(existing.coins));

  const currentCoins  = Number(existing.coins) || 0;
  const currentClicks = existing.totalClicks    || 0;
  const newCoins      = currentCoins  + safeCoins;
  const newClicks     = currentClicks + safeClicks;

  const currentHigh = Number(existing.allTimeHighCoins) || 0;
  const updated = await db.clickerProfile.update({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    data: {
      coins:            newCoins,
      allTimeHighCoins: Math.max(currentHigh, newCoins),
      totalClicks:      newClicks,
      lastSeen:         new Date(),
    },
    select: { coins: true },
  });

  const returnedCoins = Number(updated.coins);
  console.log("[Sync API] Oppdatert coins:", returnedCoins);

  return NextResponse.json({ coins: returnedCoins });
}
