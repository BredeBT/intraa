import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { getTicketRole, getAgentCategoryIds } from "@/lib/ticketAccess";

// GET /api/tickets/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      author:   { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, emoji: true, color: true } },
      replies:  {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  // Superadmin can always see
  if (session.user.isSuperAdmin) return NextResponse.json({ ticket });

  // Support ticket: only author sees it here; superadmin handled above
  if (ticket.source === "SUPPORT") {
    if (ticket.authorId === session.user.id) return NextResponse.json({ ticket });
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const role = await getTicketRole(session.user.id, ticket.orgId);
  if (!role) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  if (role === "admin") return NextResponse.json({ ticket });

  if (role === "agent") {
    const categoryIds = await getAgentCategoryIds(session.user.id, ticket.orgId);
    const inCategory  = ticket.categoryId != null && categoryIds.includes(ticket.categoryId);
    const isAssignee  = ticket.assigneeId === session.user.id;
    if (!inCategory && !isAssignee) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    return NextResponse.json({ ticket });
  }

  // user: only own tickets
  if (ticket.authorId !== session.user.id) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  return NextResponse.json({ ticket });
}

// PATCH /api/tickets/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const role = session.user.isSuperAdmin
    ? "admin"
    : await getTicketRole(session.user.id, ticket.orgId);

  if (!role || role === "user") return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  if (role === "agent") {
    const categoryIds = await getAgentCategoryIds(session.user.id, ticket.orgId);
    const inCategory  = ticket.categoryId != null && categoryIds.includes(ticket.categoryId);
    const isAssignee  = ticket.assigneeId === session.user.id;
    if (!inCategory && !isAssignee) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const body = await req.json() as { status?: string; priority?: string; assigneeId?: string | null };

  const validStatuses   = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"];
  const validPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"];

  // Agents can only update status/priority, not assignee
  const isAdmin = role === "admin";

  const updated = await db.ticket.update({
    where: { id },
    data: {
      ...(body.status && validStatuses.includes(body.status)
        ? { status: body.status as "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED" }
        : {}),
      ...(body.priority && validPriorities.includes(body.priority)
        ? { priority: body.priority as "LOW" | "NORMAL" | "HIGH" | "URGENT" }
        : {}),
      ...(isAdmin && "assigneeId" in body ? { assigneeId: body.assigneeId } : {}),
    },
  });

  return NextResponse.json({ ticket: updated });
}
