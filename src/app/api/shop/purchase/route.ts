import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/** POST /api/shop/purchase — { shopItemId, orgId } */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { shopItemId, orgId } = await request.json() as { shopItemId?: string; orgId?: string };
  if (!shopItemId || !orgId) return NextResponse.json({ error: "Mangler felt" }, { status: 400 });

  const userId = session.user.id;

  // Verify membership
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
  if (!membership) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  // Get item
  const item = await db.shopItem.findFirst({
    where: { id: shopItemId, organizationId: orgId, enabled: true },
  });
  if (!item) return NextResponse.json({ error: "Item ikke funnet" }, { status: 404 });

  // Check already purchased
  const existing = await db.shopPurchase.findUnique({
    where: { userId_shopItemId: { userId, shopItemId } },
  });
  if (existing) return NextResponse.json({ error: "Allerede kjøpt" }, { status: 409 });

  // Check fanpass requirement
  if (item.fanpassOnly) {
    const bp = await db.fanPass.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!bp || bp.status !== "ACTIVE" || bp.endDate <= new Date()) {
      return NextResponse.json({ error: "Dette krever Fanpass" }, { status: 403 });
    }
  }

  // Check balance
  if (membership.points < item.coinCost) {
    return NextResponse.json({ error: "Ikke nok coins" }, { status: 402 });
  }

  // Deduct coins and create purchase + transaction
  await db.$transaction([
    db.membership.update({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      data:  { points: { decrement: item.coinCost } },
    }),
    db.shopPurchase.create({
      data: { userId, organizationId: orgId, shopItemId, coinsPaid: item.coinCost },
    }),
    db.coinTransaction.create({
      data: {
        userId,
        organizationId: orgId,
        amount:      -item.coinCost,
        reason:      "purchase",
        description: `Kjøpte ${item.name} fra shop`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, item: item.name }, { status: 201 });
}
