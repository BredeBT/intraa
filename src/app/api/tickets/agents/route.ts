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

// GET /api/tickets/agents?orgId=...
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const agents = await db.membership.findMany({
    where:   { organizationId: orgId, isAgent: true },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  const agentIds = agents.map((a) => a.userId);
  const agentCats = await db.agentCategory.findMany({
    where:   { userId: { in: agentIds }, organizationId: orgId },
    include: { category: { select: { id: true, name: true, emoji: true, color: true } } },
  });

  const result = agents.map((a) => ({
    userId:     a.userId,
    name:       a.user.name,
    avatarUrl:  a.user.avatarUrl,
    categories: agentCats.filter((ac) => ac.userId === a.userId).map((ac) => ac.category),
  }));

  return NextResponse.json({ agents: result });
}

// POST /api/tickets/agents — add or update agent
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getUserOrg();
  if (!ctx) return NextResponse.json({ error: "Ingen org" }, { status: 400 });

  const membership = await requireAdminOrg(session.user.id, ctx.organizationId);
  if (!membership) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  const { userId, categoryIds } = await req.json() as { userId: string; categoryIds: string[] };
  if (!userId || !Array.isArray(categoryIds)) return NextResponse.json({ error: "Ugyldig" }, { status: 400 });

  // Set isAgent = true
  await db.membership.update({
    where: { userId_organizationId: { userId, organizationId: ctx.organizationId } },
    data:  { isAgent: true },
  });

  // Replace category assignments
  await db.agentCategory.deleteMany({ where: { userId, organizationId: ctx.organizationId } });
  if (categoryIds.length > 0) {
    await db.agentCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        userId,
        organizationId: ctx.organizationId,
        categoryId,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/tickets/agents?userId=...
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getUserOrg();
  if (!ctx) return NextResponse.json({ error: "Ingen org" }, { status: 400 });

  const membership = await requireAdminOrg(session.user.id, ctx.organizationId);
  if (!membership) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await db.agentCategory.deleteMany({ where: { userId, organizationId: ctx.organizationId } });
  await db.membership.update({
    where: { userId_organizationId: { userId, organizationId: ctx.organizationId } },
    data:  { isAgent: false },
  });

  return NextResponse.json({ ok: true });
}
