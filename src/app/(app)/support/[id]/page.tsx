import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { ArrowLeft } from "lucide-react";
import UserSupportTicket from "./UserSupportTicket";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

export default async function UserSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where:   { id },
    include: {
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });

  // Only the author can view their own support ticket
  if (!ticket || ticket.authorId !== session.user.id || ticket.source !== "SUPPORT") {
    redirect("/support");
  }

  return (
    <div className="px-8 py-8">
      <Link href="/support" className="mb-6 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Tilbake til mine saker
      </Link>

      <UserSupportTicket
        ticket={{
          id:          ticket.id,
          title:       ticket.title,
          description: ticket.description,
          status:      ticket.status,
          priority:    ticket.priority,
          category:    ticket.categoryId,
          createdAt:   ticket.createdAt.toISOString(),
          replies:     ticket.replies.map((r) => ({
            id:        r.id,
            content:   r.content,
            isAgent:   r.isAgent,
            createdAt: r.createdAt.toISOString(),
            author:    r.author,
          })),
        }}
        userId={session.user.id}
      />
    </div>
  );
}
