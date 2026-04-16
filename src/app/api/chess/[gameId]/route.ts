import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { Chess } from "chess.js";

const PLAYER_SELECT = { select: { id: true, name: true, avatarUrl: true } };

// GET /api/chess/[gameId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { gameId } = await params;
  const game = await db.chessGame.findUnique({
    where:   { id: gameId },
    include: { white: PLAYER_SELECT, black: PLAYER_SELECT },
  });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ game });
}

// PATCH /api/chess/[gameId] — submit a move
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { gameId } = await params;
  const body = await req.json() as { move: string | { from: string; to: string; promotion?: string }; loserColor?: string };

  const game = await db.chessGame.findUnique({ where: { id: gameId } });
  if (!game)              return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (game.status !== "active") return NextResponse.json({ error: "Spillet er avsluttet" }, { status: 400 });

  const isWhite = game.whiteId === session.user.id;
  const isBlack = game.blackId === session.user.id;
  if (!isWhite && !isBlack) return NextResponse.json({ error: "Du er ikke med i dette spillet" }, { status: 403 });

  // Handle resignation
  if (body.move === "__resign__") {
    const status = isWhite ? "black_wins" : "white_wins";
    const updated = await db.chessGame.update({
      where:   { id: gameId },
      data:    { status },
      include: { white: PLAYER_SELECT, black: PLAYER_SELECT },
    });
    return NextResponse.json({ game: updated });
  }

  const chess   = new Chess(game.fen);
  const myColor = isWhite ? "w" : "b";
  if (chess.turn() !== myColor) return NextResponse.json({ error: "Ikke din tur" }, { status: 400 });

  // Validate and apply move
  let result;
  try {
    result = chess.move(body.move as string | { from: string; to: string; promotion?: string });
  } catch {
    return NextResponse.json({ error: "Ugyldig trekk" }, { status: 400 });
  }
  if (!result) return NextResponse.json({ error: "Ugyldig trekk" }, { status: 400 });

  const newFen  = chess.fen();
  const moves   = [...(game.moves as string[]), result.san];

  let status = "active";
  if (chess.isCheckmate())            status = chess.turn() === "b" ? "white_wins" : "black_wins";
  else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) status = "draw";

  const updated = await db.chessGame.update({
    where:   { id: gameId },
    data:    { fen: newFen, moves, status },
    include: { white: PLAYER_SELECT, black: PLAYER_SELECT },
  });

  return NextResponse.json({ game: updated, move: result });
}
