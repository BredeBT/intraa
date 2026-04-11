import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserOrg } from "@/server/getUserOrg";
import { db } from "@/server/db";
import { getTicketRole, getAgentCategoryIds } from "@/lib/ticketAccess";

// GET /api/tickets
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getUserOrg();
  if (!ctx) return NextResponse.json({ error: "Ingen org" }, { status: 400 });

  const role = await getTicketRole(session.user.id, ctx.organizationId);
  if (!role) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const resolved = req.nextUrl.searchParams.get("resolved") === "1";
  const page     = Math.max(0, parseInt(req.nextUrl.searchParams.get("page") ?? "0", 10));
  const pageSize = 20;

  // Build where clause based on role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    orgId:  ctx.organizationId,
    source: "INTERNAL",
    status: resolved
      ? { in: ["RESOLVED", "CLOSED"] }
      : { in: ["OPEN", "IN_PROGRESS", "WAITING"] },
  };

  if (role === "user") {
    where.authorId = session.user.id;
  } else if (role === "agent") {
    const categoryIds = await getAgentCategoryIds(session.user.id, ctx.organizationId);
    where.categoryId = { in: categoryIds };
    const filter = req.nextUrl.searchParams.get("filter");
    if (filter === "mine") {
      where.assigneeId = session.user.id;
      delete where.categoryId;
    }
  }

  const tickets = await db.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip:    resolved ? page * pageSize : 0,
    take:    resolved ? pageSize : undefined,
    include: {
      author:   { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, emoji: true, color: true } },
      _count:   { select: { replies: true } },
    },
  });

  return NextResponse.json({ tickets, role });
}

// POST /api/tickets
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getUserOrg();
  if (!ctx) return NextResponse.json({ error: "Ingen org" }, { status: 400 });

  const role = await getTicketRole(session.user.id, ctx.organizationId);
  if (!role) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const { title, description, categoryId, priority } = await req.json() as {
    title?:       string;
    description?: string;
    categoryId?:  string;
    priority?:    string;
  };

  if (!title?.trim())       return NextResponse.json({ error: "Tittel er påkrevd" }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "Beskrivelse er påkrevd" }, { status: 400 });

  const validPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
  const safePriority = validPriorities.includes(priority ?? "") ? priority as "LOW" | "NORMAL" | "HIGH" | "URGENT" : "NORMAL";

  // Validate categoryId if provided
  if (categoryId) {
    const cat = await db.ticketCategory.findUnique({ where: { id: categoryId } });
    if (!cat || cat.organizationId !== ctx.organizationId) {
      return NextResponse.json({ error: "Ugyldig kategori" }, { status: 400 });
    }
  }

  const ticket = await db.ticket.create({
    data: {
      orgId:       ctx.organizationId,
      authorId:    session.user.id,
      title:       title.trim(),
      description: description.trim(),
      categoryId:  categoryId || null,
      priority:    safePriority,
      source:      "INTERNAL",
    },
    include: {
      category: { select: { id: true, name: true, emoji: true, color: true } },
    },
  });

  // Notify agents assigned to this category + all admins
  const notifyUserIds = new Set<string>();

  // Admins
  const admins = await db.membership.findMany({
    where: { organizationId: ctx.organizationId, role: { in: ["OWNER", "ADMIN"] }, userId: { not: session.user.id } },
    select: { userId: true },
  });
  admins.forEach((a) => notifyUserIds.add(a.userId));

  // Agents for this category
  if (categoryId) {
    const categoryAgents = await db.agentCategory.findMany({
      where: { categoryId, organizationId: ctx.organizationId },
      select: { userId: true },
    });
    categoryAgents.forEach((a) => {
      if (a.userId !== session.user.id) notifyUserIds.add(a.userId);
    });
  }

  const catName = ticket.category?.name ?? "Generelt";
  if (notifyUserIds.size > 0) {
    await db.notification.createMany({
      data: [...notifyUserIds].map((userId) => ({
        type:           "TICKET" as const,
        title:          `Ny sak i ${catName}`,
        body:           `${session.user.name ?? "En bruker"} åpnet: ${title.trim()}`,
        href:           `/tickets/${ticket.id}`,
        userId,
        organizationId: ctx.organizationId,
      })),
    });
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
