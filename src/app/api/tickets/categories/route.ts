import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { getUserOrg } from "@/server/getUserOrg";

async function requireAdminOrg(userId: string, orgId: string) {
  const m = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
  return m && ["OWNER", "ADMIN"].includes(m.role) ? m : null;
}

// GET /api/tickets/categories?orgId=...
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const categories = await db.ticketCategory.findMany({
    where:   { organizationId: orgId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { tickets: { where: { status: { not: "CLOSED" } } } } } },
  });

  return NextResponse.json({ categories });
}

// POST /api/tickets/categories
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, name, description, color, emoji } = await req.json() as {
    orgId: string; name: string; description?: string; color?: string; emoji?: string;
  };

  if (!orgId || !name?.trim()) return NextResponse.json({ error: "orgId og navn er påkrevd" }, { status: 400 });

  const membership = await requireAdminOrg(session.user.id, orgId);
  if (!membership) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  try {
    const category = await db.ticketCategory.create({
      data: {
        organizationId: orgId,
        name:           name.trim(),
        description:    description?.trim() || null,
        color:          color ?? "#6366f1",
        emoji:          emoji ?? "📋",
      },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Kategorinavn allerede i bruk" }, { status: 400 });
  }
}
