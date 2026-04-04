"use server";

import { db } from "@/server/db";
import type { TicketWithAssignee, TicketStatus, TicketCategory } from "@/lib/types";

const MOCK_TICKETS: TicketWithAssignee[] = [
  {
    id: "mock-t1",
    title: "Kan ikke logge inn på Teams",
    status: "OPEN",
    category: "IT",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    orgId: "mock-org",
    assigneeId: "mock-user-3",
    assignee: { id: "mock-user-3", name: "Thomas Kvam", email: "thomas@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
  {
    id: "mock-t2",
    title: "Oppdater ansattkontrakt",
    status: "IN_PROGRESS",
    category: "HR",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    orgId: "mock-org",
    assigneeId: "mock-user-2",
    assignee: { id: "mock-user-2", name: "Maria Haugen", email: "maria@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
  {
    id: "mock-t3",
    title: "Ny laptop til nyansatt",
    status: "IN_PROGRESS",
    category: "IT",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
    orgId: "mock-org",
    assigneeId: "mock-user-3",
    assignee: { id: "mock-user-3", name: "Thomas Kvam", email: "thomas@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
  {
    id: "mock-t4",
    title: "Spørsmål om feriepenger",
    status: "RESOLVED",
    category: "HR",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    orgId: "mock-org",
    assigneeId: "mock-user-2",
    assignee: { id: "mock-user-2", name: "Maria Haugen", email: "maria@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
];

export async function getTickets(orgId: string): Promise<TicketWithAssignee[]> {
  
  try {
    return await db.ticket.findMany({
      where: { orgId },
      include: { assignee: true },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return MOCK_TICKETS;
  }
}

export async function createTicket(
  orgId: string,
  title: string,
  category: TicketCategory
): Promise<TicketWithAssignee> {

  return db.ticket.create({
    data: { orgId, title, category },
    include: { assignee: true },
  });
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
): Promise<TicketWithAssignee> {

  return db.ticket.update({
    where: { id: ticketId },
    data: { status },
    include: { assignee: true },
  });
}
