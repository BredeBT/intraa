import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserOrg } from "@/server/getUserOrg";
import { db } from "@/server/db";
import { checkFeature } from "@/server/checkFeature";
import { getTicketRole, getAgentCategoryIds } from "@/lib/ticketAccess";
import TicketsClient from "./TicketsClient";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

export default async function TicketsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await checkFeature("tickets");

  const ctx = await getUserOrg();
  if (!ctx) redirect("/feed");

  const role = await getTicketRole(session.user.id, ctx.organizationId);
  if (!role) redirect("/feed");

  // Build ticket where clause based on role — only active statuses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    orgId:  ctx.organizationId,
    source: "INTERNAL",
    status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] },
  };
  if (role === "user") {
    where.authorId = session.user.id;
  } else if (role === "agent") {
    const categoryIds = await getAgentCategoryIds(session.user.id, ctx.organizationId);
    where.categoryId = { in: categoryIds };
  }

  const STATUS_ORDER: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, WAITING: 2 };

  const [tickets, categories, memberships] = await Promise.all([
    db.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        author:   { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, emoji: true, color: true } },
        _count:   { select: { replies: true } },
      },
    }),
    db.ticketCategory.findMany({
      where:   { organizationId: ctx.organizationId, enabled: true },
      orderBy: { createdAt: "asc" },
      select:  { id: true, name: true, emoji: true, color: true },
    }),
    role === "admin"
      ? db.membership.findMany({
          where:   { organizationId: ctx.organizationId },
          include: { user: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const membership = await db.membership.findUnique({
    where:   { userId_organizationId: { userId: session.user.id, organizationId: ctx.organizationId } },
    include: { user: { select: { name: true } } },
  });

  const members = memberships.map((m) => ({ id: m.userId, name: (m as typeof m & { user: { name: string | null } }).user.name }));

  const mappedTickets = tickets
    .map((t) => ({
      id:          t.id,
      title:       t.title,
      description: t.description,
      status:      t.status as "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED",
      priority:    t.priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
      category:    t.category,
      createdAt:   t.createdAt.toISOString(),
      author:      t.author,
      assignee:    t.assignee,
      replyCount:  t._count.replies,
    }))
    .sort((a, b) => {
      const diff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      if (diff !== 0) return diff;
      return b.createdAt.localeCompare(a.createdAt);
    });

  return (
    <TicketsClient
      initialTickets={mappedTickets}
      orgId={ctx.organizationId}
      userId={session.user.id}
      userName={membership?.user.name ?? ""}
      ticketRole={role}
      categories={categories}
      members={members}
    />
  );
}
