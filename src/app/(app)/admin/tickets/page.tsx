import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserOrg } from "@/server/getUserOrg";
import { db } from "@/server/db";
import AdminTicketsClient from "./AdminTicketsClient";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

export default async function AdminTicketsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const ctx = await getUserOrg();
  if (!ctx) redirect("/feed");

  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: ctx.organizationId } },
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) redirect("/admin");

  const [categories, agentMemberships, allMemberships] = await Promise.all([
    db.ticketCategory.findMany({
      where:   { organizationId: ctx.organizationId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { tickets: { where: { status: { not: "CLOSED" } } } } },
      },
    }),
    db.membership.findMany({
      where:   { organizationId: ctx.organizationId, isAgent: true },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    db.membership.findMany({
      where:   { organizationId: ctx.organizationId },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  // Load category assignments for each agent
  const agentUserIds = agentMemberships.map((m) => m.userId);
  const agentCats = agentUserIds.length > 0
    ? await db.agentCategory.findMany({
        where:   { userId: { in: agentUserIds }, organizationId: ctx.organizationId },
        include: { category: { select: { id: true, name: true, emoji: true, color: true } } },
      })
    : [];

  return (
    <AdminTicketsClient
      orgId={ctx.organizationId}
      initialCategories={categories.map((c) => ({
        id:          c.id,
        name:        c.name,
        description: c.description,
        color:       c.color,
        emoji:       c.emoji,
        enabled:     c.enabled,
        openCount:   c._count.tickets,
      }))}
      initialAgents={agentMemberships.map((m) => ({
        userId:     m.userId,
        name:       m.user.name,
        avatarUrl:  m.user.avatarUrl,
        categories: agentCats
          .filter((ac) => ac.userId === m.userId)
          .map((ac) => ac.category),
      }))}
      allMembers={allMemberships.map((m) => ({ id: m.userId, name: m.user.name }))}
    />
  );
}
