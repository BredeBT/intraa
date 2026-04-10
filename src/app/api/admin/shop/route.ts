import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

async function requireAdmin(orgId: string, userId: string) {
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) return null;
  return membership;
}

/** GET /api/admin/shop?orgId=X */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "Mangler orgId" }, { status: 400 });

  const membership = await requireAdmin(orgId, session.user.id);
  if (!membership) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const items = await db.shopItem.findMany({
    where:   { organizationId: orgId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(items);
}

/** POST /api/admin/shop — create a custom badge */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const body = await request.json() as {
    orgId: string; name: string; value: string; coinCost: number; fanpassOnly: boolean; type: string;
  };
  const { orgId, name, value, coinCost, fanpassOnly, type } = body;

  const membership = await requireAdmin(orgId, session.user.id);
  if (!membership) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const item = await db.shopItem.create({
    data: { organizationId: orgId, name, value, coinCost, fanpassOnly, type: type as "BADGE" },
  });

  return NextResponse.json(item, { status: 201 });
}

/** PATCH /api/admin/shop — update enabled or coinCost */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const body = await request.json() as { id: string; enabled?: boolean; coinCost?: number };
  const { id, enabled, coinCost } = body;

  const item = await db.shopItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const membership = await requireAdmin(item.organizationId, session.user.id);
  if (!membership) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const updated = await db.shopItem.update({
    where: { id },
    data:  {
      ...(enabled  !== undefined ? { enabled }  : {}),
      ...(coinCost !== undefined ? { coinCost } : {}),
    },
  });

  return NextResponse.json(updated);
}
