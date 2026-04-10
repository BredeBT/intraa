"use server";

import { auth } from "@/auth";
import { db } from "@/server/db";
import type { TicketWithAssignee, TicketStatus } from "@/lib/types";

export async function getTickets(orgId: string): Promise<TicketWithAssignee[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) throw new Error("Ikke autorisert");

  const tickets = await db.ticket.findMany({
    where:   { orgId, source: "INTERNAL" },
    include: {
      assignee: { select: { id: true, name: true } },
      author:   { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return tickets as unknown as TicketWithAssignee[];
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<TicketWithAssignee> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke innlogget");

  const ticket = await db.ticket.findFirst({
    where: {
      id:           ticketId,
      organization: { memberships: { some: { userId: session.user.id } } },
    },
  });
  if (!ticket) throw new Error("Ikke autorisert");

  const updated = await db.ticket.update({
    where:   { id: ticketId },
    data:    { status },
    include: {
      assignee: { select: { id: true, name: true } },
      author:   { select: { id: true, name: true } },
    },
  });

  return updated as unknown as TicketWithAssignee;
}
