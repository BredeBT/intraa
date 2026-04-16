import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

type Params = { params: Promise<{ gameId: string }> };

// GET /api/chess/[gameId]/chat — fetch messages
export async function GET(
  _req: NextRequest,
  { params }: Params,
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { gameId } = await params;

  const messages = await db.chessMessage.findMany({
    where:   { gameId },
    orderBy: { createdAt: "asc" },
    take:    100,
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json({ messages });
}

// POST /api/chess/[gameId]/chat — send a message
export async function POST(
  req: NextRequest,
  { params }: Params,
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { gameId } = await params;
  const { content } = await req.json() as { content?: string };
  if (!content?.trim()) return NextResponse.json({ error: "Tomt innhold" }, { status: 400 });

  // Only game participants can chat
  const game = await db.chessGame.findUnique({ where: { id: gameId } });
  if (!game) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  if (game.whiteId !== session.user.id && game.blackId !== session.user.id)
    return NextResponse.json({ error: "Ikke tillatt" }, { status: 403 });

  const message = await db.chessMessage.create({
    data:    { gameId, authorId: session.user.id, content: content.trim() },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json({ message }, { status: 201 });
}
