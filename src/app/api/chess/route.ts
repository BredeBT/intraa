import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

const PLAYER_SELECT = { select: { id: true, name: true, avatarUrl: true } };

// GET /api/chess?orgId=xxx — list active games for org
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const games = await db.chessGame.findMany({
    where:   { orgId, status: "active" },
    orderBy: { createdAt: "desc" },
    take:    20,
    include: { white: PLAYER_SELECT, black: PLAYER_SELECT },
  });

  return NextResponse.json({ games });
}

// POST /api/chess — send a chess invite
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, opponentId } = await req.json() as { orgId?: string; opponentId?: string };
  if (!orgId || !opponentId) return NextResponse.json({ error: "orgId + opponentId required" }, { status: 400 });
  if (opponentId === session.user.id) return NextResponse.json({ error: "Kan ikke utfordre deg selv" }, { status: 400 });

  // Check for existing pending invite between these two in this org
  const existing = await db.chessInvite.findFirst({
    where: {
      orgId,
      status: "pending",
      OR: [
        { senderId: session.user.id, receiverId: opponentId },
        { senderId: opponentId, receiverId: session.user.id },
      ],
    },
  });
  if (existing) return NextResponse.json({ error: "Det finnes allerede en ventende utfordring" }, { status: 409 });

  // Create invite
  const invite = await db.chessInvite.create({
    data: { orgId, senderId: session.user.id, receiverId: opponentId },
    include: { sender: PLAYER_SELECT, receiver: PLAYER_SELECT },
  });

  // Notify receiver
  const sender = await db.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
  await db.notification.create({
    data: {
      type:           "USER",
      title:          "Sjakkutfordring",
      body:           `${sender?.name ?? "Noen"} vil spille sjakk mot deg`,
      href:           `/${(await db.organization.findUnique({ where: { id: orgId }, select: { slug: true } }))?.slug}/spill/sjakk`,
      userId:         opponentId,
      organizationId: orgId,
    },
  });

  return NextResponse.json({ invite }, { status: 201 });
}
