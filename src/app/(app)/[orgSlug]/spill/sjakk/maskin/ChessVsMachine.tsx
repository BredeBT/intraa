"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Chess, type Square, type PieceSymbol, type Color, type Move } from "chess.js";
import { ArrowLeft, RotateCcw, Flag } from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = "enkel" | "middels" | "vanskelig" | "umulig";

interface DifficultyConfig {
  label:       string;
  description: string;
  depth:       number;
  color:       string;
  bg:          string;
}

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  enkel:      { label: "Enkel",      description: "Tilfeldig trekk",      depth: 0, color: "#34d399", bg: "rgba(16,185,129,0.15)"   },
  middels:    { label: "Middels",    description: "Grunnleggende strategi", depth: 2, color: "#60a5fa", bg: "rgba(59,130,246,0.15)"   },
  vanskelig:  { label: "Vanskelig",  description: "Sterk motstander",      depth: 3, color: "#f59e0b", bg: "rgba(245,158,11,0.15)"   },
  umulig:     { label: "Umulig",     description: "Maks styrke",           depth: 4, color: "#f87171", bg: "rgba(239,68,68,0.15)"    },
};

// ─── Board theme ──────────────────────────────────────────────────────────────

const THEME = { light: "#f0d9b5", dark: "#b58863", selected: "#7fc97f", moved: { light: "#cdd16e", dark: "#a9a93e" } };

// ─── Piece rendering ──────────────────────────────────────────────────────────

const PIECE_UNICODE: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

function Piece({ color, type }: { color: Color; type: PieceSymbol }) {
  const glyph = PIECE_UNICODE[`${color}${type.toUpperCase()}`] ?? "?";
  return (
    <span
      className="select-none leading-none"
      style={{
        fontSize:         "clamp(20px, 5.5vw, 52px)",
        color:            color === "w" ? "#fff" : "#1c1410",
        filter:           color === "w"
          ? "drop-shadow(0 1px 3px rgba(0,0,0,0.9))"
          : "drop-shadow(0 1px 2px rgba(255,255,255,0.15))",
        WebkitTextStroke: color === "w" ? "0.5px rgba(0,0,0,0.3)" : "none",
      }}
    >
      {glyph}
    </span>
  );
}

// ─── Chess Board ──────────────────────────────────────────────────────────────

function ChessBoard({
  chess,
  disabled,
  lastMove,
  onMove,
}: {
  chess:    Chess;
  disabled: boolean;
  lastMove: { from: Square; to: Square } | null;
  onMove:   (from: Square, to: Square, promotion?: string) => void;
}) {
  const [selected,   setSelected]   = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [promoting,  setPromoting]  = useState<{ from: Square; to: Square } | null>(null);

  const files = ["a","b","c","d","e","f","g","h"];
  const ranks = [8,7,6,5,4,3,2,1];

  function handleSquareClick(sq: Square) {
    if (disabled) return;

    if (selected) {
      if (legalMoves.includes(sq)) {
        const piece  = chess.get(selected);
        const toRank = sq[1];
        if (piece?.type === "p" && (toRank === "8" || toRank === "1")) {
          setPromoting({ from: selected, to: sq });
          setSelected(null);
          setLegalMoves([]);
        } else {
          onMove(selected, sq);
          setSelected(null);
          setLegalMoves([]);
        }
        return;
      }
      setSelected(null);
      setLegalMoves([]);
    }

    const piece = chess.get(sq);
    if (!piece || piece.color !== chess.turn()) return;
    setSelected(sq);
    setLegalMoves(chess.moves({ square: sq, verbose: true }).map((m) => m.to as Square));
  }

  return (
    <>
      <div className="relative w-full" style={{ aspectRatio: "1" }}>
        <div className="absolute -left-5 inset-y-0 flex flex-col justify-around pointer-events-none">
          {ranks.map((r) => (
            <span key={r} className="text-[10px] text-white/30 text-right">{r}</span>
          ))}
        </div>
        <div className="absolute -bottom-5 inset-x-0 flex justify-around pointer-events-none">
          {files.map((f) => (
            <span key={f} className="text-[10px] text-white/30 text-center">{f}</span>
          ))}
        </div>

        <div className="grid grid-cols-8 w-full h-full rounded-lg overflow-hidden shadow-2xl">
          {ranks.map((rank) =>
            files.map((file) => {
              const sq        = `${file}${rank}` as Square;
              const fi        = files.indexOf(file);
              const ri        = ranks.indexOf(rank);
              const isLight   = (fi + ri) % 2 === 0;
              const isSelected  = selected === sq;
              const isLegal     = legalMoves.includes(sq);
              const isLastFrom  = lastMove?.from === sq;
              const isLastTo    = lastMove?.to   === sq;
              const piece = chess.get(sq);

              let bg = isLight ? THEME.light : THEME.dark;
              if (isSelected)                  bg = THEME.selected;
              else if (isLastFrom || isLastTo) bg = isLight ? THEME.moved.light : THEME.moved.dark;

              return (
                <div
                  key={sq}
                  onClick={() => handleSquareClick(sq)}
                  className="relative flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: bg, aspectRatio: "1" }}
                >
                  {isLegal && !piece && (
                    <div className="absolute h-[28%] w-[28%] rounded-full bg-black/20 pointer-events-none" />
                  )}
                  {isLegal && piece && (
                    <div className="absolute inset-0 rounded-sm ring-4 ring-inset ring-black/25 pointer-events-none" />
                  )}
                  {piece && <Piece color={piece.color} type={piece.type} />}
                </div>
              );
            })
          )}
        </div>
      </div>

      {promoting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl">
            <p className="mb-4 text-center text-sm font-semibold text-white">Velg brikke</p>
            <div className="flex gap-3">
              {(["q","r","b","n"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => { onMove(promoting.from, promoting.to, p); setPromoting(null); }}
                  className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Piece color="w" type={p} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── AI: piece values + positional tables ────────────────────────────────────

const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

// Positional bonus tables (white's perspective, index 0 = a8)
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
 50, 50, 50, 50, 50, 50, 50, 50,
 10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_TABLE = [
 -50,-40,-30,-30,-30,-30,-40,-50,
 -40,-20,  0,  0,  0,  0,-20,-40,
 -30,  0, 10, 15, 15, 10,  0,-30,
 -30,  5, 15, 20, 20, 15,  5,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  5, 10, 15, 15, 10,  5,-30,
 -40,-20,  0,  5,  5,  0,-20,-40,
 -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
 -20,-10,-10,-10,-10,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5, 10, 10,  5,  0,-10,
 -10,  5,  5, 10, 10,  5,  5,-10,
 -10,  0, 10, 10, 10, 10,  0,-10,
 -10, 10, 10, 10, 10, 10, 10,-10,
 -10,  5,  0,  0,  0,  0,  5,-10,
 -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_TABLE = [
 -20,-10,-10, -5, -5,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
   0,  0,  5,  5,  5,  5,  0, -5,
 -10,  5,  5,  5,  5,  5,  0,-10,
 -10,  0,  5,  0,  0,  0,  0,-10,
 -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_TABLE_MIDGAME = [
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -20,-30,-30,-40,-40,-30,-30,-20,
 -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20,
];

function squareIndex(sq: Square, color: Color): number {
  const file = sq.charCodeAt(0) - 97; // a=0..h=7
  const rank = parseInt(sq[1]!) - 1;  // 1=0..8=7
  // White: rank 0 = bottom (index 56), black: rank 0 = top (index 0)
  return color === "w" ? (7 - rank) * 8 + file : rank * 8 + file;
}

function pieceBonus(type: PieceSymbol, color: Color, sq: Square): number {
  const idx = squareIndex(sq, color);
  switch (type) {
    case "p": return PAWN_TABLE[idx]   ?? 0;
    case "n": return KNIGHT_TABLE[idx] ?? 0;
    case "b": return BISHOP_TABLE[idx] ?? 0;
    case "r": return ROOK_TABLE[idx]   ?? 0;
    case "q": return QUEEN_TABLE[idx]  ?? 0;
    case "k": return KING_TABLE_MIDGAME[idx] ?? 0;
  }
}

function evaluate(chess: Chess): number {
  if (chess.isCheckmate()) return chess.turn() === "w" ? -99999 : 99999;
  if (chess.isDraw())      return 0;

  let score = 0;
  const board = chess.board();
  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      const val = PIECE_VALUE[sq.type] + pieceBonus(sq.type, sq.color, sq.square);
      score += sq.color === "w" ? val : -val;
    }
  }
  return score; // positive = white advantage, negative = black advantage
}

function minimax(
  chess: Chess,
  depth:         number,
  alpha:         number,
  beta:          number,
  isMaximizing:  boolean,
): number {
  if (depth === 0 || chess.isGameOver()) return evaluate(chess);

  const moves = chess.moves({ verbose: true }) as Move[];

  if (isMaximizing) {
    let best = -Infinity;
    for (const move of moves) {
      chess.move(move);
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta, false));
      chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      chess.move(move);
      best = Math.min(best, minimax(chess, depth - 1, alpha, beta, true));
      chess.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(chess: Chess, depth: number): Move | null {
  const moves = chess.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return null;

  // Depth 0 = random
  if (depth === 0) return moves[Math.floor(Math.random() * moves.length)]!;

  let bestMove = moves[0]!;
  let bestScore = Infinity; // black minimizes (negative = black advantage)

  for (const move of moves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, true);
    chess.undo();
    if (score < bestScore) {
      bestScore = score;
      bestMove  = move;
    }
  }
  return bestMove;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChessVsMachine({
  orgSlug,
  userName,
}: {
  orgSlug:  string;
  userId:   string;
  userName: string;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [chess,      setChess]      = useState<Chess | null>(null);
  const [fen,        setFen]        = useState("");
  const [lastMove,   setLastMove]   = useState<{ from: Square; to: Square } | null>(null);
  const [status,     setStatus]     = useState<"playing" | "white_wins" | "black_wins" | "draw">("playing");
  const [thinking,   setThinking]   = useState(false);
  const [moves,      setMoves]      = useState<string[]>([]);
  const thinkingRef = useRef(false);

  function startGame(diff: Difficulty) {
    const c = new Chess();
    setDifficulty(diff);
    setChess(c);
    setFen(c.fen());
    setStatus("playing");
    setLastMove(null);
    setMoves([]);
  }

  function restartGame() {
    if (!difficulty) return;
    startGame(difficulty);
  }

  const triggerComputerMove = useCallback(
    (currentChess: Chess, diff: Difficulty) => {
      if (thinkingRef.current) return;
      thinkingRef.current = true;
      setThinking(true);

      const delay = diff === "enkel" ? 300 : diff === "middels" ? 600 : 900;
      setTimeout(() => {
        const cloned = new Chess(currentChess.fen());
        const depth  = DIFFICULTIES[diff].depth;
        const move   = getBestMove(cloned, depth);

        if (move) {
          currentChess.move(move);
          setFen(currentChess.fen());
          setMoves((p) => [...p, move.san]);
          setLastMove({ from: move.from as Square, to: move.to as Square });
        }

        if (currentChess.isCheckmate()) {
          setStatus("black_wins");
        } else if (currentChess.isDraw()) {
          setStatus("draw");
        }

        thinkingRef.current = false;
        setThinking(false);
      }, delay);
    },
    [],
  );

  function handlePlayerMove(from: Square, to: Square, promotion?: string) {
    if (!chess || status !== "playing" || thinking) return;

    try {
      const result = chess.move({ from, to, promotion: promotion ?? "q" });
      if (!result) return;

      setFen(chess.fen());
      setMoves((p) => [...p, result.san]);
      setLastMove({ from, to });

      if (chess.isCheckmate()) { setStatus("white_wins"); return; }
      if (chess.isDraw())      { setStatus("draw");        return; }

      triggerComputerMove(chess, difficulty!);
    } catch { /* illegal move */ }
  }

  const isPlayerTurn = chess && chess.turn() === "w" && status === "playing" && !thinking;

  const diffConfig = difficulty ? DIFFICULTIES[difficulty] : null;

  // ── Difficulty selection screen ───────────────────────────────────────────
  if (!difficulty || !chess) {
    return (
      <div className="min-h-screen bg-[#0d0d14] text-white flex flex-col">
        <div className="mx-auto w-full max-w-lg px-4 py-10 flex flex-col gap-8">

          <Link
            href={`/${orgSlug}/spill`}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" /> Tilbake til spill
          </Link>

          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">🤖 Sjakk mot maskin</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Du spiller hvit. Velg vanskelighetsgrad for å starte.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(Object.entries(DIFFICULTIES) as [Difficulty, DifficultyConfig][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => startGame(key)}
                className="group flex flex-col gap-2 rounded-2xl border p-5 text-left transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background:   cfg.bg,
                  borderColor:  cfg.color + "40",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-white">{cfg.label}</span>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }}
                  />
                </div>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{cfg.description}</p>
                <div
                  className="mt-1 text-sm font-semibold transition-colors group-hover:opacity-80"
                  style={{ color: cfg.color }}
                >
                  Velg →
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Game screen ───────────────────────────────────────────────────────────
  const statusMsg =
    status === "white_wins" ? "🏆 Du vant!" :
    status === "black_wins" ? "Maskin vant." :
    status === "draw"       ? "🤝 Remis"    :
    thinking                ? `🤔 ${diffConfig?.label} tenker…` :
    chess.isCheck()         ? "⚠️ Du er i sjakk!" : null;

  const capturedGlyphs: Record<PieceSymbol, string> = { q:"♛", r:"♜", b:"♝", n:"♞", p:"♟", k:"♚" };
  function getCapturedByWhite(): PieceSymbol[] {
    const tmp = new Chess();
    const captured: PieceSymbol[] = [];
    for (const san of moves) {
      const m = tmp.move(san);
      if (m?.captured && tmp.turn() === "b") captured.push(m.captured);
    }
    return captured;
  }
  function getCapturedByBlack(): PieceSymbol[] {
    const tmp = new Chess();
    const captured: PieceSymbol[] = [];
    for (const san of moves) {
      const m = tmp.move(san);
      if (m?.captured && tmp.turn() === "w") captured.push(m.captured);
    }
    return captured;
  }

  return (
    <div className="min-h-screen bg-[#0d0d14] text-white">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-4 px-4 py-4 md:flex-row md:items-start md:gap-6 md:py-8">

        {/* ── Board column ── */}
        <div className="flex flex-col items-center gap-3 md:flex-1 min-w-0">

          {/* Computer (black) */}
          <div
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{
              background: chess.turn() === "b" && status === "playing"
                ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
              maxWidth: "min(100vw - 2rem, 540px)",
            }}
          >
            <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-xl shrink-0">🤖</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{diffConfig?.label ?? "Maskin"}</span>
                {chess.turn() === "b" && status === "playing" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
              {getCapturedByBlack().length > 0 && (
                <div className="text-[11px] opacity-60">
                  {getCapturedByBlack().map((p, i) => <span key={i}>{capturedGlyphs[p]}</span>)}
                </div>
              )}
            </div>
            <span className="text-xs text-white/30 font-medium">Svart</span>
          </div>

          {/* Board */}
          <div className="pl-5 pb-5 w-full" style={{ maxWidth: "calc(min(100vw - 2rem, 540px) + 1.25rem)" }}>
            <ChessBoard
              chess={new Chess(fen)}
              disabled={!isPlayerTurn}
              lastMove={lastMove}
              onMove={handlePlayerMove}
            />
          </div>

          {/* Player (white) */}
          <div
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{
              background: chess.turn() === "w" && status === "playing"
                ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
              maxWidth: "min(100vw - 2rem, 540px)",
            }}
          >
            <div className="h-9 w-9 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{userName}</span>
                {chess.turn() === "w" && status === "playing" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
              {getCapturedByWhite().length > 0 && (
                <div className="text-[11px] opacity-60">
                  {getCapturedByWhite().map((p, i) => <span key={i}>{capturedGlyphs[p]}</span>)}
                </div>
              )}
            </div>
            <span className="text-xs text-white/30 font-medium">Hvit</span>
          </div>

          {/* Status banner */}
          {statusMsg && (
            <div
              className="w-full text-center rounded-xl py-3 px-4 text-sm font-semibold"
              style={{
                maxWidth: "min(100vw - 2rem, 540px)",
                background: status !== "playing" ? "rgba(255,255,255,0.08)" : "rgba(59,130,246,0.1)",
              }}
            >
              {statusMsg}
            </div>
          )}

          {/* Mobile controls */}
          <div className="flex w-full gap-2 md:hidden" style={{ maxWidth: "min(100vw - 2rem, 540px)" }}>
            <Link
              href={`/${orgSlug}/spill`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Tilbake
            </Link>
            <button
              onClick={restartGame}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Ny kamp
            </button>
            {status === "playing" && (
              <button
                onClick={() => setStatus("black_wins")}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/30 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Flag className="h-4 w-4" /> Gi opp
              </button>
            )}
          </div>
        </div>

        {/* ── Sidebar — desktop only ── */}
        <aside className="hidden md:flex flex-col gap-3 w-72 shrink-0 pt-8">
          <Link
            href={`/${orgSlug}/spill`}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Tilbake til spill
          </Link>

          {/* Difficulty badge */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">Vanskelighetsgrad</p>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: diffConfig!.color, boxShadow: `0 0 6px ${diffConfig!.color}` }}
              />
              <span className="text-sm font-semibold text-white">{diffConfig?.label}</span>
              <span className="text-xs text-white/40">{diffConfig?.description}</span>
            </div>
          </div>

          {/* Turn */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">Tur</p>
            <div className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded-full border-2 ${chess.turn() === "w" ? "bg-white border-white" : "bg-zinc-800 border-zinc-600"}`} />
              <span className="text-sm font-semibold text-white">
                {chess.turn() === "w" ? userName : (diffConfig?.label ?? "Maskin")}
              </span>
            </div>
            {chess.isCheck() && status === "playing" && (
              <p className="mt-2 text-xs font-bold text-amber-400">⚠️ Sjakk!</p>
            )}
          </div>

          {/* Move history */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">Trekk</p>
            {moves.length === 0
              ? <p className="text-xs text-white/30">Ingen trekk ennå</p>
              : (
                <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                  {Array.from({ length: Math.ceil(moves.length / 2) }).map((_, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="text-white/30 w-5 shrink-0">{i + 1}.</span>
                      <span className="text-white/80 w-12">{moves[i * 2]}</span>
                      {moves[i * 2 + 1] && <span className="text-white/80">{moves[i * 2 + 1]}</span>}
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Result / restart */}
          {status !== "playing" ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
              <p className="font-bold text-white">{statusMsg}</p>
              <button
                onClick={restartGame}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> Ny kamp
              </button>
              <button
                onClick={() => setDifficulty(null)}
                className="mt-2 w-full text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Bytt vanskelighetsgrad
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={restartGame}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> Ny kamp
              </button>
              <button
                onClick={() => setStatus("black_wins")}
                className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Flag className="h-4 w-4" /> Gi opp
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
