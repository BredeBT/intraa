import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  const rawBody = contentType.includes("application/json")
    ? await req.json()
    : JSON.parse(await req.text());
  const { orgId, clicks } = rawBody as { orgId: string; clicks: number };
  const MAX_CLICKS_PER_BATCH = 500;
  if (!orgId || !clicks || clicks < 1 || clicks > MAX_CLICKS_PER_BATCH) {
    return NextResponse.json({ error: "Ugyldig antall klikk" }, { status: 400 });
  }

  const { db } = await import("@/server/db");

  const profile = await db.clickerProfile.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
  });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  // Check active multiplier event
  const activeEvent = await db.clickerEvent.findFirst({
    where: { organizationId: orgId, active: true, type: "multiplier", endsAt: { gt: new Date() } },
  });
  const multiplier = activeEvent?.multiplier ?? 1;

  const earned = clicks * profile.coinsPerClick * multiplier;

  const updated = await db.clickerProfile.update({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    data: {
      coins:       { increment: earned },
      totalClicks: { increment: clicks },
      lastSeen:    new Date(),
    },
  });

  return NextResponse.json({ coins: updated.coins, totalClicks: updated.totalClicks });
}
