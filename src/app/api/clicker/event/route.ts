import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, type, multiplier, bonusCoins, durationMinutes } =
    await req.json() as {
      orgId:           string;
      type:            string;
      multiplier?:     number;
      bonusCoins?:     number;
      durationMinutes: number;
    };

  if (!orgId || !type || !durationMinutes) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const { db } = await import("@/server/db");

  // Only OWNER or ADMIN
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
    select: { role: true },
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Deactivate old active events of same type
  await db.clickerEvent.updateMany({
    where: { organizationId: orgId, type, active: true },
    data:  { active: false },
  });

  const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  // If coin drop: distribute to all members
  if (type === "drop" && bonusCoins) {
    const profiles = await db.clickerProfile.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    await db.clickerProfile.updateMany({
      where: { organizationId: orgId },
      data:  { coins: { increment: bonusCoins } },
    });
    const event = await db.clickerEvent.create({
      data: {
        organizationId: orgId,
        type,
        bonusCoins:     bonusCoins ?? 0,
        multiplier:     1,
        endsAt,
        createdBy:      session.user.id,
        active:         false, // drop is instant
      },
    });
    return NextResponse.json({ event, affected: profiles.length });
  }

  const event = await db.clickerEvent.create({
    data: {
      organizationId: orgId,
      type,
      multiplier:     multiplier ?? 1,
      bonusCoins:     bonusCoins ?? 0,
      endsAt,
      createdBy:      session.user.id,
    },
  });

  return NextResponse.json({ event });
}
