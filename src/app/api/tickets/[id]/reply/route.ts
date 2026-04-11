import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// POST /api/tickets/[id]/reply
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const { content } = await req.json() as { content?: string };
  if (!content?.trim()) return NextResponse.json({ error: "Innhold er påkrevd" }, { status: 400 });

  // For SUPPORT tickets: ticket author can always reply, and so can superadmins/members of the support org
  // For INTERNAL tickets: must be a member of the org
  let isAgent = false;

  if (ticket.source === "SUPPORT") {
    const isAuthor = ticket.authorId === session.user.id;

    // Superadmin er alltid agent på support-tickets
    if (session.user.isSuperAdmin) {
      isAgent = true;
    } else {
      const supportMembership = await db.membership.findUnique({
        where: { userId_organizationId: { userId: session.user.id, organizationId: ticket.orgId } },
      });
      const isSupportAgent = supportMembership !== null && ["OWNER", "ADMIN", "MEMBER"].includes(supportMembership.role);

      if (!isAuthor && !isSupportAgent) {
        return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
      }

      isAgent = isSupportAgent && !isAuthor;
    }
  } else {
    // INTERNAL ticket: must be member of the org
    const membership = await db.membership.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: ticket.orgId } },
    });
    if (!membership) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    isAgent = ["OWNER", "ADMIN"].includes(membership.role) || membership.isAgent;
  }

  const reply = await db.ticketReply.create({
    data: {
      ticketId: id,
      authorId: session.user.id,
      content:  content.trim(),
      isAgent,
    },
    include: { author: { select: { id: true, name: true } } },
  });

  // Auto-reopen if a non-agent replies on a resolved/closed ticket
  let reopened = false;
  if (!isAgent && (ticket.status === "RESOLVED" || ticket.status === "CLOSED")) {
    await db.ticket.update({ where: { id }, data: { status: "OPEN" } });
    await db.ticketReply.create({
      data: {
        ticketId: id,
        authorId: session.user.id,
        content:  "↩ Saken ble automatisk gjenåpnet fordi brukeren sendte et nytt svar.",
        isAgent:  true,
      },
    });
    reopened = true;
  }

  // Notifications
  if (ticket.source === "SUPPORT") {
    if (isAgent) {
      // Intraa support replied — notify the original user via their tenant org
      // Use fromTenantId so the notification appears in their main org context
      const notifOrgId = ticket.fromTenantId ?? ticket.orgId;
      // Only create notification if user has membership in that org
      const userMembership = ticket.fromTenantId
        ? await db.membership.findUnique({
            where: { userId_organizationId: { userId: ticket.authorId, organizationId: ticket.fromTenantId } },
          })
        : null;
      if (userMembership || !ticket.fromTenantId) {
        await db.notification.create({
          data: {
            type:           "TICKET",
            title:          "Svar fra Intraa support",
            body:           `Intraa svarte på: "${ticket.title}"`,
            href:           `/support/${ticket.id}`,
            userId:         ticket.authorId,
            organizationId: notifOrgId,
          },
        }).catch(() => null);
      }
    } else {
      // User added info — notify support org admins
      const admins = await db.membership.findMany({
        where: { organizationId: ticket.orgId, role: { in: ["OWNER", "ADMIN"] }, userId: { not: session.user.id } },
        select: { userId: true },
      });
      if (admins.length > 0) {
        await db.notification.createMany({
          data: admins.map((m) => ({
            type:           "TICKET" as const,
            title:          "Nytt svar på support-sak",
            body:           `${session.user.name ?? "Bruker"} svarte på "${ticket.title}"`,
            href:           `/superadmin/support/${ticket.id}`,
            userId:         m.userId,
            organizationId: ticket.orgId,
          })),
        });
      }
    }
  } else {
    // INTERNAL
    if (isAgent && ticket.authorId !== session.user.id) {
      await db.notification.create({
        data: {
          type:           "TICKET",
          title:          "Svar på din ticket",
          body:           `${session.user.name ?? "En agent"} svarte på "${ticket.title}"`,
          href:           `/tickets/${ticket.id}`,
          userId:         ticket.authorId,
          organizationId: ticket.orgId,
        },
      });
    } else if (!isAgent) {
      // User replied — notify admins + category agents
      const notifyIds = new Set<string>();
      const admins = await db.membership.findMany({
        where: { organizationId: ticket.orgId, role: { in: ["OWNER", "ADMIN"] }, userId: { not: session.user.id } },
        select: { userId: true },
      });
      admins.forEach((m) => notifyIds.add(m.userId));

      if (ticket.categoryId) {
        const categoryAgents = await db.agentCategory.findMany({
          where: { categoryId: ticket.categoryId, organizationId: ticket.orgId },
          select: { userId: true },
        });
        categoryAgents.forEach((a) => { if (a.userId !== session.user.id) notifyIds.add(a.userId); });
      }

      if (notifyIds.size > 0) {
        await db.notification.createMany({
          data: [...notifyIds].map((userId) => ({
            type:           "TICKET" as const,
            title:          "Nytt svar på ticket",
            body:           `${session.user.name ?? "En bruker"} svarte på "${ticket.title}"`,
            href:           `/tickets/${ticket.id}`,
            userId,
            organizationId: ticket.orgId,
          })),
        });
      }
    }

    if (isAgent && ticket.status === "OPEN") {
      await db.ticket.update({ where: { id }, data: { status: "IN_PROGRESS" } });
    }
  }

  return NextResponse.json({ reply, reopened }, { status: 201 });
}
