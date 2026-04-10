import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/** GET /api/loyalty/stats?orgId=X */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "Mangler orgId" }, { status: 400 });

  const userId = session.user.id;

  const [membership, fanpass, transactions, shopItems, purchases] = await Promise.all([
    db.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    }),
    db.fanPass.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    }),
    db.coinTransaction.findMany({
      where:   { userId, organizationId: orgId },
      orderBy: { createdAt: "desc" },
    }),
    db.shopItem.findMany({
      where:   { organizationId: orgId, enabled: true },
      orderBy: { coinCost: "asc" },
    }),
    db.shopPurchase.findMany({
      where:  { userId, organizationId: orgId },
      select: { shopItemId: true },
    }),
  ]);

  if (!membership) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  // Stats this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thisMonthTx = transactions.filter((t) => t.createdAt >= startOfMonth);
  const coinsEarnedThisMonth = thisMonthTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const loginsThisMonth      = thisMonthTx.filter((t) => t.reason === "login").length;
  const postsThisMonth       = thisMonthTx.filter((t) => t.reason === "post").length;
  const commentsThisMonth    = thisMonthTx.filter((t) => t.reason === "comment").length;

  const purchasedIds = new Set(purchases.map((p) => p.shopItemId));

  const hasFanpass =
    fanpass?.status === "ACTIVE" && (fanpass.endDate > new Date());

  return NextResponse.json({
    coins:       membership.points,
    fanpass:  hasFanpass ? { endDate: fanpass!.endDate, status: fanpass!.status } : null,
    thisMonth: {
      earned:   coinsEarnedThisMonth,
      logins:   loginsThisMonth,
      posts:    postsThisMonth,
      comments: commentsThisMonth,
    },
    recentTransactions: transactions.slice(0, 10),
    allTransactions:    transactions,
    shopItems:          shopItems.map((i) => ({ ...i, purchased: purchasedIds.has(i.id) })),
  });
}
