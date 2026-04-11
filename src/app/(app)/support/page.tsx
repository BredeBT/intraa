import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import SupportClient from "./SupportClient";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const supportOrg = await db.organization.findUnique({ where: { slug: "intraa-support" } });

  const allTickets = supportOrg
    ? await db.ticket.findMany({
        where:   { orgId: supportOrg.id, authorId: session.user.id, source: "SUPPORT" },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { replies: true } } },
      })
    : [];

  const activeTickets   = allTickets.filter((t) => ["OPEN", "IN_PROGRESS", "WAITING"].includes(t.status));
  const resolvedTickets = allTickets.filter((t) => ["RESOLVED", "CLOSED"].includes(t.status));

  function map(t: typeof allTickets[number]) {
    return {
      id:         t.id,
      title:      t.title,
      status:     t.status as "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED",
      replyCount: t._count.replies,
      createdAt:  t.createdAt.toISOString(),
    };
  }

  return (
    <SupportClient
      activeTickets={activeTickets.map(map)}
      resolvedTickets={resolvedTickets.map(map)}
    />
  );
}
