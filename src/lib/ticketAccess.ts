import { db } from "@/server/db";

export type TicketRole = "admin" | "agent" | "user";

export async function getTicketRole(
  userId: string,
  organizationId: string,
): Promise<TicketRole | null> {
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!membership) return null;
  if (["OWNER", "ADMIN"].includes(membership.role)) return "admin";
  if (membership.isAgent) return "agent";
  return "user";
}

export async function getAgentCategoryIds(
  userId: string,
  organizationId: string,
): Promise<string[]> {
  const rows = await db.agentCategory.findMany({
    where: { userId, organizationId },
    select: { categoryId: true },
  });
  return rows.map((r) => r.categoryId);
}
