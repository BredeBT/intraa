import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { Chess } from "chess.js";

const PLAYER_SELECT = { select: { id: true, name: true, avatarUrl: true } };

// ─── Elo helpers ──────────────────────────────────────────────────────────────

function kFactor(games: number) {
  if (games < 30)  return 32;
  if (games < 100) return 24;
  return 16;
}

function calcNewRating(rA: number, rB: number, scoreA: number, gamesA: number): number {
  const expected = 1 / (1 + Math.pow(10, (rB - rA) / 400));
  return Math.max(100, Math.round(rA + kFactor(gamesA) * (scoreA - expected)));
}

async function getOrCreateProfile(userId: string, orgId: string) {
  return db.chessProfile.upsert({
    where:  { userId_orgId: { userId, orgId } },
    create: { userId, orgId },
    update: {},
  });
}

/**
 * Update both players' Elo and win/loss/draw counts after a game ends.
 * scoreWhite: 1 = white wins, 0 = black wins, 0.5 = draw
 */
async function settleRatings(
  orgId: string,
  whiteId: string,
  blackId: string,
  scoreWhite: number,
) {
  const [wp, bp] = await Promise.all([
    getOrCreateProfile(whiteId, orgId),
    getOrCreateProfile(blackId, orgId),
  ]);

  const newWhiteRating = calcNewRating(wp.rating, bp.rating, scoreWhite,       wp.wins + wp.losses + wp.draws);
  const newBlackRating = calcNewRating(bp.rating, wp.rating, 1 - scoreWhite,   bp.wins + bp.losses + bp.draws);

  const isDraw = scoreWhite === 0.5;
  await Promise.all([
    db.chessProfile.update({
      where: { userId_orgId: { userId: whiteId, orgId } },
      data:  {
        rating: newWhiteRating,
        wins:   { increment: scoreWhite === 1 ? 1 : 0 },
        losses: { increment: scoreWhite === 0 ? 1 : 0 },
        draws:  { increment: isDraw ? 1 : 0 },
      },
    }),
    db.chessProfile.update({
      where: { userId_orgId: { userId: blackId, orgId } },
      data:  {
        rating: newBlackRating,
        wins:   { increment: scoreWhite === 0 ? 1 : 0 },
        losses: { increment: scoreWhite === 1 ? 1 : 0 },
        draws:  { increment: isDraw ? 1 : 0 },
      },
    }),
  ]);

  return { newWhiteRating, newBlackRating };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

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
  const body = await req.json() as { move: string | { from: string; to: string; promotion?: string } };

  const game = await db.chessGame.findUnique({ where: { id: gameId } });
  if (!game)                   return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    // white resigns → scoreWhite = 0; black resigns → scoreWhite = 1
    await settleRatings(game.orgId, game.whiteId, game.blackId, isWhite ? 0 : 1);
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

  const newFen = chess.fen();
  const moves  = [...(game.moves as string[]), result.san];

  let status    = "active";
  let scoreWhite: number | null = null;
  if (chess.isCheckmate()) {
    status     = chess.turn() === "b" ? "white_wins" : "black_wins";
    scoreWhite = status === "white_wins" ? 1 : 0;
  } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
    status     = "draw";
    scoreWhite = 0.5;
  }

  const updated = await db.chessGame.update({
    where:   { id: gameId },
    data:    { fen: newFen, moves, status },
    include: { white: PLAYER_SELECT, black: PLAYER_SELECT },
  });

  if (scoreWhite !== null) {
    await settleRatings(game.orgId, game.whiteId, game.blackId, scoreWhite);
  }

  return NextResponse.json({ game: updated, move: result });
}
