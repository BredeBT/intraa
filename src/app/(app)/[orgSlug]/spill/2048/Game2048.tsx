"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Board = number[][];
type Direction = "left" | "right" | "up" | "down";
interface Toast { id: number; text: string }

// ─── Game logic ───────────────────────────────────────────────────────────────

function empty(): Board {
  return Array.from({ length: 4 }, () => [0, 0, 0, 0]);
}

function slideRow(row: number[]): { result: number[]; score: number } {
  const tiles = row.filter((x) => x !== 0);
  let score = 0;
  const merged: number[] = [];
  let i = 0;
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const val = tiles[i]! * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(tiles[i]!);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { result: merged, score };
}

function transpose(b: Board): Board {
  return b[0]!.map((_, i) => b.map((row) => row[i]!));
}

function applyMove(board: Board, dir: Direction): { board: Board; score: number; moved: boolean } {
  let b = board.map((row) => [...row]);

  if (dir === "right")        b = b.map((row) => [...row].reverse());
  else if (dir === "up")      b = transpose(b);
  else if (dir === "down")    b = transpose(b).map((row) => [...row].reverse());

  let totalScore = 0;
  let moved = false;
  const newB = b.map((row) => {
    const orig = [...row];
    const { result, score } = slideRow(row);
    totalScore += score;
    if (orig.join() !== result.join()) moved = true;
    return result;
  });

  let finalB = newB;
  if (dir === "right")        finalB = finalB.map((row) => [...row].reverse());
  else if (dir === "up")      finalB = transpose(finalB);
  else if (dir === "down")    { finalB = finalB.map((row) => [...row].reverse()); finalB = transpose(finalB); }

  return { board: finalB, score: totalScore, moved };
}

function spawnTile(board: Board): Board {
  const empty: [number, number][] = [];
  board.forEach((row, r) => row.forEach((cell, c) => { if (cell === 0) empty.push([r, c]); }));
  if (empty.length === 0) return board;
  const pick = empty[Math.floor(Math.random() * empty.length)]!;
  const [r, c] = pick;
  const nb = board.map((row) => [...row]);
  nb[r]![c] = Math.random() < 0.9 ? 2 : 4;
  return nb;
}

function initBoard(): Board {
  return spawnTile(spawnTile(empty()));
}

function isGameOver(board: Board): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r]![c] === 0) return false;
      if (c + 1 < 4 && board[r]![c] === board[r]![c + 1]) return false;
      if (r + 1 < 4 && board[r]![c] === board[r + 1]![c]) return false;
    }
  }
  return true;
}

function maxTile(board: Board): number {
  return Math.max(...board.flat());
}

// ─── Colors ───────────────────────────────────────────────────────────────────

function tileStyle(value: number): { bg: string; color: string; fontSize: string } {
  const map: Record<number, { bg: string; color: string }> = {
    2:    { bg: "#1a1a2e", color: "#e8e8f0" },
    4:    { bg: "#16213e", color: "#e8e8f0" },
    8:    { bg: "#0f3460", color: "#ffffff" },
    16:   { bg: "#533483", color: "#ffffff" },
    32:   { bg: "#6c47ff", color: "#ffffff" },
    64:   { bg: "#7c5cbf", color: "#ffffff" },
    128:  { bg: "#9b59b6", color: "#ffffff" },
    256:  { bg: "#8e44ad", color: "#ffffff" },
    512:  { bg: "#6c3483", color: "#ffd700" },
    1024: { bg: "#4a235a", color: "#ffd700" },
    2048: { bg: "#f9c74f", color: "#1a1a2e" },
  };
  const c = map[value] ?? { bg: "#f9c74f", color: "#1a1a2e" };
  const len = String(value).length;
  const fontSize = len <= 2 ? "1.6rem" : len === 3 ? "1.25rem" : len === 4 ? "1rem" : "0.8rem";
  return { ...c, fontSize };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Game2048({ orgSlug }: { orgSlug: string }) {
  const [board,     setBoard]     = useState<Board>(initBoard);
  const [score,     setScore]     = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver,  setGameOver]  = useState(false);
  const [won,       setWon]       = useState(false);
  const [orgId,     setOrgId]     = useState<string | null>(null);
  const [toasts,    setToasts]    = useState<Toast[]>([]);

  const scoreRef      = useRef(0);
  const wonRef        = useRef(false);
  const milestonesRef = useRef(new Set<number>());
  const pendingRef    = useRef(0);
  const touchRef      = useRef<{ x: number; y: number } | null>(null);
  const toastId       = useRef(0);

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const hs = parseInt(localStorage.getItem("2048_hs") ?? "0", 10);
    if (isFinite(hs) && hs > 0) setHighScore(hs);
    fetch("/api/user/org")
      .then((r) => r.json())
      .then((d: { id: string }) => setOrgId(d.id))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("2048_hs", String(score));
    }
  }, [score, highScore]);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const toast = useCallback((text: string) => {
    const id = toastId.current++;
    setToasts((t) => [...t.slice(-3), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }, []);

  // ── Award coins ───────────────────────────────────────────────────────────
  const award = useCallback((reason: string) => {
    if (!orgId) return;
    void fetch("/api/games/award", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId, game: "2048", reason }),
    });
  }, [orgId]);

  // ── Move ──────────────────────────────────────────────────────────────────
  const move = useCallback((dir: Direction) => {
    if (gameOver) return;
    setBoard((prev) => {
      const { board: nb, score: gained, moved } = applyMove(prev, dir);
      if (!moved) return prev;

      scoreRef.current += gained;
      setScore(scoreRef.current);

      const withNew = spawnTile(nb);
      const top     = maxTile(withNew);

      // Milestones
      ([512, 1024, 2048] as const).forEach((ms) => {
        if (top >= ms && !milestonesRef.current.has(ms)) {
          milestonesRef.current.add(ms);
          toast(`🎉 ${ms}! +50 🪙`);
          award("game_2048_bonus");
        }
      });

      if (gained > 0) pendingRef.current += 1; // track merge events

      if (top >= 2048 && !wonRef.current) {
        wonRef.current = true;
        setWon(true);
        toast("🏆 Du klarte 2048!");
      }

      if (isGameOver(withNew)) {
        setGameOver(true);
        if (pendingRef.current > 0) {
          const calls = Math.min(pendingRef.current, 10);
          for (let i = 0; i < calls; i++) award("game_2048");
          toast(`Spill over! +${calls * 10} 🪙`);
        }
      }

      return withNew;
    });
  }, [gameOver, toast, award]);

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map: Record<string, Direction> = {
      ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
    };
    const handler = (e: KeyboardEvent) => {
      const dir = map[e.key];
      if (dir) { e.preventDefault(); move(dir); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move]);

  // ── Touch ─────────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touchRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    touchRef.current = null;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx < 20 && ady < 20) return;
    if (adx > ady) move(dx > 0 ? "right" : "left");
    else           move(dy > 0 ? "down"  : "up");
  }, [move]);

  // ── Restart ───────────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    setBoard(initBoard());
    scoreRef.current      = 0;
    wonRef.current        = false;
    milestonesRef.current = new Set();
    pendingRef.current    = 0;
    setScore(0);
    setGameOver(false);
    setWon(false);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes tile-pop {
          0%   { transform: scale(0.6); }
          60%  { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .tile-enter { animation: tile-pop 0.15s ease-out; }
      `}</style>

      <div
        className="flex min-h-screen flex-col items-center px-4 py-6"
        style={{ background: "#0d0d14" }}
      >
        {/* Back link */}
        <div className="mb-4 w-full max-w-[420px]">
          <Link href={`/${orgSlug}/spill`} className="text-sm transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.4)" }}>
            ← Tilbake til spill
          </Link>
        </div>

        {/* Header */}
        <div className="mb-4 flex w-full max-w-[420px] items-center justify-between">
          <h1 className="text-3xl font-black text-white tracking-tight">2048</h1>
          <div className="flex gap-2">
            {[
              { label: "SCORE",    value: score },
              { label: "REKORD",   value: highScore },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl px-3 py-2 text-center"
                style={{ background: "rgba(108,71,255,0.15)", border: "1px solid rgba(108,71,255,0.2)", minWidth: 72 }}
              >
                <p className="text-[9px] font-bold tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
                <p className="text-sm font-bold text-white">{value.toLocaleString("no-NO")}</p>
              </div>
            ))}
            <button
              onClick={restart}
              className="rounded-xl px-3 py-2 text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: "rgba(108,71,255,0.2)", color: "#a78bfa", border: "1px solid rgba(108,71,255,0.25)" }}
            >
              Ny
            </button>
          </div>
        </div>

        {/* Board */}
        <div
          className="relative select-none"
          style={{
            width: "min(420px, calc(100vw - 2rem))",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 14,
            padding: 8,
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
            }}
          >
            {board.map((row, r) =>
              row.map((val, c) => {
                const ts = val ? tileStyle(val) : null;
                return (
                  <div
                    key={`${r}-${c}-${val}`}
                    className={val ? "tile-enter" : ""}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: ts?.fontSize ?? "0",
                      background: ts?.bg ?? "rgba(255,255,255,0.04)",
                      color: ts?.color ?? "transparent",
                      transition: "background 0.1s",
                      userSelect: "none",
                    }}
                  >
                    {val || ""}
                  </div>
                );
              })
            )}
          </div>

          {/* Game-over overlay */}
          {gameOver && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
              style={{ background: "rgba(13,13,20,0.88)", backdropFilter: "blur(4px)" }}
            >
              <p className="mb-1 text-2xl font-black text-white">Spill over!</p>
              <p className="mb-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                Score: <span className="font-bold text-white">{score.toLocaleString("no-NO")}</span>
              </p>
              {score >= highScore && score > 0 && (
                <p className="mb-3 text-xs font-semibold" style={{ color: "#fbbf24" }}>🏆 Ny rekord!</p>
              )}
              <button
                onClick={restart}
                className="rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110"
                style={{ background: "#6c47ff" }}
              >
                Spill igjen
              </button>
            </div>
          )}

          {/* Won banner */}
          {won && !gameOver && (
            <div
              className="absolute left-2 right-2 top-2 flex items-center justify-between rounded-xl px-3 py-2"
              style={{ background: "rgba(249,199,79,0.15)", border: "1px solid rgba(249,199,79,0.4)" }}
            >
              <span className="text-sm font-bold" style={{ color: "#f9c74f" }}>🏆 Du klarte 2048! Fortsett!</span>
              <button
                onClick={() => setWon(false)}
                className="text-xs"
                style={{ color: "rgba(249,199,79,0.6)" }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Hint */}
        <p className="mt-4 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          Bruk piltaster eller sveip for å spille
        </p>

        {/* Toasts */}
        <div className="fixed right-4 top-20 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg"
              style={{ background: "rgba(108,71,255,0.9)", backdropFilter: "blur(8px)" }}
            >
              {t.text}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
