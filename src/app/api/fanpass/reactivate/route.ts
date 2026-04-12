import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { orgId } = await req.json() as { orgId?: string };
  if (!orgId) return NextResponse.json({ error: "Mangler orgId" }, { status: 400 });

  const { db } = await import("@/server/db");

  const fanpass = await db.fanPass.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
  });

  if (!fanpass || !fanpass.cancelledAt) {
    return NextResponse.json({ error: "Ingen kansellert Fanpass" }, { status: 404 });
  }

  const updated = await db.fanPass.update({
    where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    data:  { cancelledAt: null },
  });

  // TODO: når Stripe er konfigurert:
  // await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false })

  return NextResponse.json({ ok: true, endDate: updated.endDate });
}
