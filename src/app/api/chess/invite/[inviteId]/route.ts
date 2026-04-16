import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

const PLAYER_SELECT = { select: { id: true, name: true, avatarUrl: true } };

// PATCH /api/chess/invite/[inviteId] — accept or decline
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { inviteId } = await params;
  const { action } = await req.json() as { action: "accept" | "decline" | "cancel" };

  const invite = await db.chessInvite.findUnique({ where: { id: inviteId } });
  if (!invite)              return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  if (invite.status !== "pending") return NextResponse.json({ error: "Allerede behandlet" }, { status: 400 });

  const userId = session.user.id;

  if (action === "cancel") {
    if (invite.senderId !== userId) return NextResponse.json({ error: "Ikke tillatt" }, { status: 403 });
    await db.chessInvite.update({ where: { id: inviteId }, data: { status: "cancelled" } });
    return NextResponse.json({ ok: true });
  }

  if (invite.receiverId !== userId) return NextResponse.json({ error: "Ikke tillatt" }, { status: 403 });

  if (action === "decline") {
    await db.chessInvite.update({ where: { id: inviteId }, data: { status: "declined" } });

    // Notify sender
    const receiver = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
    const org = await db.organization.findUnique({ where: { id: invite.orgId }, select: { slug: true } });
    await db.notification.create({
      data: {
        type:           "USER",
        title:          "Sjakkutfordring avslått",
        body:           `${receiver?.name ?? "Noen"} avslo sjakkutfordringen din`,
        href:           `/${org?.slug}/spill/sjakk`,
        userId:         invite.senderId,
        organizationId: invite.orgId,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "accept") {
    // Randomly assign colors
    const [whiteId, blackId] = Math.random() > 0.5
      ? [invite.senderId, invite.receiverId]
      : [invite.receiverId, invite.senderId];

    const game = await db.chessGame.create({
      data:    { orgId: invite.orgId, whiteId, blackId, status: "active" },
      include: { white: PLAYER_SELECT, black: PLAYER_SELECT },
    });

    await db.chessInvite.update({
      where: { id: inviteId },
      data:  { status: "accepted", gameId: game.id },
    });

    // Notify sender
    const receiver = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
    const org = await db.organization.findUnique({ where: { id: invite.orgId }, select: { slug: true } });
    await db.notification.create({
      data: {
        type:           "USER",
        title:          "Sjakkutfordring godtatt!",
        body:           `${receiver?.name ?? "Noen"} godtok sjakkutfordringen din`,
        href:           `/${org?.slug}/spill/sjakk/${game.id}`,
        userId:         invite.senderId,
        organizationId: invite.orgId,
      },
    });

    return NextResponse.json({ game });
  }

  return NextResponse.json({ error: "Ugyldig handling" }, { status: 400 });
}
