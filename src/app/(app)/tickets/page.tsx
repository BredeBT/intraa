import { redirect } from "next/navigation";
import { getUserOrg } from "@/server/getUserOrg";
import { db } from "@/server/db";
import TicketsClient from "./TicketsClient";

export default async function TicketsPage() {
  const ctx = await getUserOrg();
  if (!ctx) redirect("/feed");

  const tickets = await db.ticket.findMany({
    where:   { orgId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    include: { assignee: { select: { name: true } } },
  });

  const members = await db.membership.findMany({
    where:   { organizationId: ctx.organizationId },
    include: { user: { select: { id: true, name: true } } },
  });

  return (
    <TicketsClient
      initialTickets={tickets.map((t) => ({
        id:          t.id,
        title:       t.title,
        status:      t.status,
        category:    t.category,
        assignee:    t.assignee?.name ?? "—",
        description: "",
        comments:    [],
      }))}
      orgId={ctx.organizationId}
      userId={ctx.userId}
      userName={members.find((m) => m.userId === ctx.userId)?.user.name ?? ""}
    />
  );
}
