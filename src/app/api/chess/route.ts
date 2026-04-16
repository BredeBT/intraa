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
    where:   { orgId, status: { in: ["active", "pending"] } },
    orderBy: { createdAt: "desc" },
    take:    20,
    include: { white: PLAYER_SELECT, black: PLAYER_SELECT },
  });

  return NextResponse.json({ games });
}

// POST /api/chess — create a new game
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, opponentId } = await req.json() as { orgId?: string; opponentId?: string };
  if (!orgId || !opponentId) return NextResponse.json({ error: "orgId + opponentId required" }, { status: 400 });

  // Randomly assign colors
  const [whiteId, blackId] = Math.random() > 0.5
    ? [session.user.id, opponentId]
    : [opponentId, session.user.id];

  const game = await db.chessGame.create({
    data:    { orgId, whiteId, blackId, status: "active" },
    include: { white: PLAYER_SELECT, black: PLAYER_SELECT },
  });

  return NextResponse.json({ game }, { status: 201 });
}
