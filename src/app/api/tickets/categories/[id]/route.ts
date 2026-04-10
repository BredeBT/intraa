import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// PATCH /api/tickets/categories/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cat = await db.ticketCategory.findUnique({ where: { id } });
  if (!cat) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const m = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: cat.organizationId } },
  });
  if (!m || !["OWNER", "ADMIN"].includes(m.role)) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  const body = await req.json() as { name?: string; description?: string; color?: string; emoji?: string; enabled?: boolean };

  try {
    const updated = await db.ticketCategory.update({
      where: { id },
      data: {
        ...(body.name        !== undefined && { name:        body.name.trim() }),
        ...(body.description !== undefined && { description: body.description.trim() || null }),
        ...(body.color       !== undefined && { color:       body.color }),
        ...(body.emoji       !== undefined && { emoji:       body.emoji }),
        ...(body.enabled     !== undefined && { enabled:     body.enabled }),
      },
    });
    return NextResponse.json({ category: updated });
  } catch {
    return NextResponse.json({ error: "Navn allerede i bruk" }, { status: 400 });
  }
}

// DELETE /api/tickets/categories/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cat = await db.ticketCategory.findUnique({ where: { id } });
  if (!cat) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const m = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: cat.organizationId } },
  });
  if (!m || !["OWNER", "ADMIN"].includes(m.role)) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  await db.ticketCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
