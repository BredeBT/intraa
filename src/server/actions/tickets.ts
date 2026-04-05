"use server";

import { auth } from "@/auth";
import { db } from "@/server/db";
import type { TicketWithAssignee, TicketStatus, TicketCategory } from "@/lib/types";

export async function getTickets(orgId: string): Promise<TicketWithAssignee[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  // Verify user is a member of this org
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) throw new Error("Ikke autorisert");

  return db.ticket.findMany({
    where:   { orgId },
    include: { assignee: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTicket(
  orgId: string,
  title: string,
  category: TicketCategory,
): Promise<TicketWithAssignee> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) throw new Error("Ikke autorisert");

  return db.ticket.create({
    data:    { orgId, title, category },
    include: { assignee: true },
  });
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<TicketWithAssignee> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  // Verify ticket belongs to user's org
  const ticket = await db.ticket.findFirst({
    where: {
      id:           ticketId,
      organization: { memberships: { some: { userId: session.user.id } } },
    },
  });
  if (!ticket) throw new Error("Ikke autorisert");

  return db.ticket.update({
    where:   { id: ticketId },
    data:    { status },
    include: { assignee: true },
  });
}
