import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ArrowLeft } from "lucide-react";
import SupportTicketDetail from "./SupportTicketDetail";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/feed");

  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where:   { id },
    include: {
      author:   { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true } },
      replies:  {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });

  if (!ticket || ticket.source !== "SUPPORT") redirect("/superadmin/support");

  const tenant = ticket.fromTenantId
    ? await db.organization.findUnique({ where: { id: ticket.fromTenantId }, select: { name: true, slug: true } })
    : null;

  return (
    <div className="px-8 py-8">
      <Link href="/superadmin/support" className="mb-6 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Tilbake til innboks
      </Link>

      <SupportTicketDetail
        ticket={{
          id:          ticket.id,
          title:       ticket.title,
          description: ticket.description,
          status:      ticket.status,
          priority:    ticket.priority,
          category:    ticket.categoryId,
          createdAt:   ticket.createdAt.toISOString(),
          author:      { ...ticket.author, email: ticket.author.email },
          assignee:    ticket.assignee,
          replies:     ticket.replies.map((r) => ({
            id:        r.id,
            content:   r.content,
            isAgent:   r.isAgent,
            createdAt: r.createdAt.toISOString(),
            author:    r.author,
          })),
        }}
        tenant={tenant}
        userId={session.user.id}
        userName={session.user.name ?? ""}
      />
    </div>
  );
}
