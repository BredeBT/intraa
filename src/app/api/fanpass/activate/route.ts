import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { awardCoins } from "@/lib/awardCoins";

export const dynamic = "force-dynamic";

/** POST /api/fanpass/activate — { orgId } */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { orgId } = await request.json() as { orgId?: string };
  if (!orgId) return NextResponse.json({ error: "Mangler orgId" }, { status: 400 });

  const userId = session.user.id;

  // Verify membership
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
  if (!membership) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  // Check if already active
  const existing = await db.fanPass.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });

  if (existing && existing.status === "ACTIVE" && existing.endDate > new Date()) {
    return NextResponse.json({ error: "Fanpass allerede aktivt" }, { status: 409 });
  }

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const fanpass = await db.fanPass.upsert({
    where:  { userId_organizationId: { userId, organizationId: orgId } },
    create: { userId, organizationId: orgId, status: "ACTIVE", endDate, paidAmount: 59 },
    update: { status: "ACTIVE", startDate: new Date(), endDate, paidAmount: 59 },
  });

  // Grant activation bonus
  void awardCoins({
    userId,
    organizationId: orgId,
    amount:      50,
    reason:      "fanpass_bonus",
    description: "Fanpass aktivert — velkomstbonus",
  });

  return NextResponse.json({ ok: true, fanpass }, { status: 201 });
}
