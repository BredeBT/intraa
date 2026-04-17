"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Chess, type Square, type PieceSymbol, type Color } from "chess.js";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { ArrowLeft, Flag, RotateCcw, Send, Palette } from "lucide-react";
import { FanpassBadge } from "@/components/FanpassBadge";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player { id: string; name: string | null; avatarUrl: string | null; hasFanpass?: boolean }

// ─── Board themes ─────────────────────────────────────────────────────────────

type BoardThemeDef = { light: string; dark: string; selected: string; moved: { light: string; dark: string }; name: string; fanpassOnly: boolean };

const BOARD_THEMES: Record<string, BoardThemeDef> = {
  classic:  { light: "#f0d9b5", dark: "#b58863", selected: "#7fc97f", moved: { light: "#cdd16e", dark: "#a9a93e" }, name: "Klassisk",  fanpassOnly: false },
  midnight: { light: "#aec6e8", dark: "#4a6fa5", selected: "#7fc9c9", moved: { light: "#7cb8d4", dark: "#3d7fa5" }, name: "Midnatt",   fanpassOnly: true  },
  emerald:  { light: "#dcefdc", dark: "#4d8c57", selected: "#a8d8a8", moved: { light: "#b8d8b8", dark: "#3d7c47" }, name: "Smaragd",   fanpassOnly: true  },
  gold:     { light: "#fef3c7", dark: "#d97706", selected: "#fde68a", moved: { light: "#fcd34d", dark: "#b45309" }, name: "Gull",      fanpassOnly: true  },
};

type BoardTheme = keyof typeof BOARD_THEMES;

interface GameData {
  id:      string;
  fen:     string;
  status:  string;
  moves:   string[];
  white:   Player;
  black:   Player;
  orgSlug: string;
}

interface RealtimeMove {
  type:   "move";
  fen:    string;
  move:   string;
  moves:  string[];
  status: string;
}

interface ChatMessage {
  id:        string;
  content:   string;
  createdAt: string;
  author:    Player;
}

interface RealtimeChat {
  type:    "chat";
  message: ChatMessage;
}

// ─── Piece rendering ──────────────────────────────────────────────────────────

const PIECE_UNICODE: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

function Piece({ color, type }: { color: Color; type: PieceSymbol }) {
  const key   = `${color}${type.toUpperCase()}`;
  const glyph = PIECE_UNICODE[key] ?? "?";
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

// ─── Board ────────────────────────────────────────────────────────────────────

function ChessBoard({
  chess,
  flipped,
  disabled,
  lastMove,
  onMove,
  theme = "classic",
}: {
  chess:    Chess;
  flipped:  boolean;
  disabled: boolean;
  lastMove: { from: Square; to: Square } | null;
  onMove:   (from: Square, to: Square, promotion?: string) => void;
  theme?:   BoardTheme;
}) {
  const [selected,   setSelected]   = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [promoting,  setPromoting]  = useState<{ from: Square; to: Square } | null>(null);

  const files = flipped ? ["h","g","f","e","d","c","b","a"] : ["a","b","c","d","e","f","g","h"];
  const ranks = flipped ? [1,2,3,4,5,6,7,8]                : [8,7,6,5,4,3,2,1];

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
    const moves = chess.moves({ square: sq, verbose: true });
    setLegalMoves(moves.map((m) => m.to as Square));
  }

  return (
    <>
      <div className="relative w-full" style={{ aspectRatio: "1" }}>
        {/* Rank labels */}
        <div className="absolute -left-5 inset-y-0 flex flex-col justify-around pointer-events-none">
          {ranks.map((r) => (
            <span key={r} className="text-[10px] text-white/30 text-right">{r}</span>
          ))}
        </div>
        {/* File labels */}
        <div className="absolute -bottom-5 inset-x-0 flex justify-around pointer-events-none">
          {files.map((f) => (
            <span key={f} className="text-[10px] text-white/30 text-center">{f}</span>
          ))}
        </div>

        {/* Grid */}
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

              const t  = BOARD_THEMES[theme];
              let bg = isLight ? t.light : t.dark;
              if (isSelected)                  bg = t.selected;
              else if (isLastFrom || isLastTo) bg = isLight ? t.moved.light : t.moved.dark;

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

      {/* Promotion modal */}
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
                  <Piece color={chess.turn()} type={p} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({
  player, color, isActive, isYou, captured, rating,
}: {
  player:   Player;
  color:    "white" | "black";
  isActive: boolean;
  isYou:    boolean;
  captured: PieceSymbol[];
  rating:   number;
}) {
  const capturedGlyphs: Record<PieceSymbol, string> = {
    q: color === "white" ? "♛" : "♕",
    r: color === "white" ? "♜" : "♖",
    b: color === "white" ? "♝" : "♗",
    n: color === "white" ? "♞" : "♘",
    p: color === "white" ? "♟" : "♙",
    k: color === "white" ? "♚" : "♔",
  };
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${isActive ? "bg-white/10 ring-1 ring-white/20" : "bg-white/5"}`}>
      <div className="relative shrink-0">
        {player.avatarUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={player.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          : <div className="h-9 w-9 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white">{(player.name ?? "?").charAt(0).toUpperCase()}</div>
        }
        <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#1a1a2e] ${color === "white" ? "bg-white" : "bg-zinc-800"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-white truncate">{player.name ?? "Ukjent"}</span>
          {player.hasFanpass && <FanpassBadge size={12} />}
          {isYou && <span className="text-[10px] text-white/40">(deg)</span>}
          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          <span className="text-[11px] text-white/40 font-medium">♟ {rating}</span>
        </div>
        {captured.length > 0 && (
          <div className="flex flex-wrap gap-0 text-[11px] leading-tight opacity-60">
            {captured.map((p, i) => <span key={i}>{capturedGlyphs[p]}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({
  gameId,
  userId,
  white,
  black,
  status,
  initialMessages,
  newMessage,
  onBroadcastChat,
}: {
  gameId:          string;
  userId:          string;
  white:           Player;
  black:           Player;
  status:          string;
  initialMessages: ChatMessage[];
  newMessage:      ChatMessage | null;
  onBroadcastChat: (msg: ChatMessage) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Append incoming real-time message
  useEffect(() => {
    if (!newMessage) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMessage.id)) return prev;
      return [...prev, newMessage];
    });
  }, [newMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      const res  = await fetch(`/api/chess/${gameId}/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: text }),
      });
      const data = await res.json() as { message: ChatMessage };
      if (res.ok) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        onBroadcastChat(data.message);
      }
    } finally {
      setSending(false);
    }
  }

  function getPlayerName(authorId: string) {
    if (authorId === white.id) return white.name ?? "Hvit";
    if (authorId === black.id) return black.name ?? "Svart";
    return "Ukjent";
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider shrink-0">Spillchat</p>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0 pr-1">
        {messages.length === 0 && (
          <p className="text-xs text-white/20 text-center mt-4">Ingen meldinger ennå</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.author.id === userId;
          return (
            <div key={msg.id} className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
              <span className="text-[10px] text-white/30 px-1">{getPlayerName(msg.author.id)}</span>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${isMe ? "bg-emerald-600/80 text-white" : "bg-white/10 text-white/90"}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {status === "active" && (
        <div className="flex gap-2 mt-2 shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="Skriv en melding…"
            className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-white/20"
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || sending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChessGame({
  game: initialGame,
  userId,
  isPlayer,
  whiteRating,
  blackRating,
}: {
  game:        GameData;
  userId:      string;
  isPlayer:    boolean;
  whiteRating: number;
  blackRating: number;
}) {
  const router = useRouter();

  const [fen,         setFen]         = useState(initialGame.fen);
  const [moves,       setMoves]       = useState<string[]>(initialGame.moves);
  const [status,      setStatus]      = useState(initialGame.status);
  const [lastMove,    setLastMove]    = useState<{ from: Square; to: Square } | null>(null);
  const [boardTheme,  setBoardTheme]  = useState<BoardTheme>("classic");

  // Chat
  const [chatMessages,  setChatMessages]  = useState<ChatMessage[]>([]);
  const [newChatMsg,    setNewChatMsg]    = useState<ChatMessage | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const hasFanpass = initialGame.white.hasFanpass || initialGame.black.hasFanpass;

  const chess    = new Chess(fen);
  const myColor  = initialGame.white.id === userId ? "w" : initialGame.black.id === userId ? "b" : null;
  const flipped  = myColor === "b";
  const isMyTurn = isPlayer && chess.turn() === myColor && status === "active";

  // Fetch initial chat messages
  useEffect(() => {
    void fetch(`/api/chess/${initialGame.id}/chat`)
      .then((r) => r.json())
      .then((d: { messages: ChatMessage[] }) => setChatMessages(d.messages));
  }, [initialGame.id]);

  // Realtime: moves and chat on the same channel
  const { broadcast } = useRealtimeChannel<RealtimeMove | RealtimeChat>(`chess:${initialGame.id}`, (payload) => {
    if (payload.type === "move") {
      setFen(payload.fen);
      setMoves(payload.moves);
      setStatus(payload.status);
    } else if (payload.type === "chat") {
      setNewChatMsg(payload.message);
    }
  });

  function broadcastChat(msg: ChatMessage) {
    void broadcast({ type: "chat", message: msg });
  }

  async function handleMove(from: Square, to: Square, promotion?: string) {
    if (!isMyTurn) return;

    const tempChess = new Chess(fen);
    let result;
    try {
      result = tempChess.move({ from, to, promotion: promotion ?? "q" });
    } catch { return; }
    if (!result) return;

    setFen(tempChess.fen());
    setMoves((p) => [...p, result.san]);
    setLastMove({ from, to });

    try {
      const res  = await fetch(`/api/chess/${initialGame.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ move: { from, to, promotion: promotion ?? "q" } }),
      });
      const data = await res.json() as { game: { fen: string; moves: string[]; status: string } };
      if (res.ok) {
        setFen(data.game.fen);
        setMoves(data.game.moves);
        setStatus(data.game.status);
        void broadcast({ type: "move", fen: data.game.fen, move: result.san, moves: data.game.moves, status: data.game.status });
      } else {
        setFen(fen);
        setMoves(moves);
        setLastMove(null);
      }
    } catch {
      setFen(fen);
      setMoves(moves);
      setLastMove(null);
    }
  }

  async function resign() {
    if (!confirm("Er du sikker på at du vil gi opp?")) return;
    await fetch(`/api/chess/${initialGame.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ move: "__resign__" }),
    });
    router.refresh();
  }

  function getCaptured(forColor: "w" | "b"): PieceSymbol[] {
    const tempChess = new Chess();
    const captured: PieceSymbol[] = [];
    for (const san of moves) {
      const m = tempChess.move(san);
      if (m?.captured && tempChess.turn() !== forColor) captured.push(m.captured);
    }
    return captured;
  }

  const statusMsg = useCallback(() => {
    if (status === "active") {
      if (chess.isCheck()) return chess.turn() === myColor ? "⚠️ Du er i sjakk!" : "Sjakk!";
      return null;
    }
    if (status === "white_wins") return initialGame.white.id === userId ? "🏆 Du vant!" : "Du tapte.";
    if (status === "black_wins") return initialGame.black.id === userId ? "🏆 Du vant!" : "Du tapte.";
    if (status === "draw") return "🤝 Remis";
    return "Spillet er avsluttet";
  }, [status, chess, myColor, userId, initialGame]);

  const topPlayer    = flipped ? initialGame.white : initialGame.black;
  const bottomPlayer = flipped ? initialGame.black : initialGame.white;
  const topColor     = flipped ? "white"           : "black";
  const bottomColor  = flipped ? "black"           : "white";

  // Max board size: use CSS clamp to adapt to available space
  const boardMaxW = "min(100vw - 2rem, 660px)";

  return (
    <div className="min-h-screen bg-[#0d0d14] text-white">
      <div className="mx-auto flex max-w-[1300px] flex-col gap-4 px-4 py-4 md:flex-row md:items-start md:gap-6 md:py-8">

        {/* ── Board column ── */}
        <div className="flex flex-col items-center gap-3 md:flex-1 min-w-0">
          {/* Top player */}
          <div className="w-full" style={{ maxWidth: boardMaxW }}>
            <PlayerCard
              player={topPlayer}
              color={topColor}
              isActive={chess.turn() === (flipped ? "w" : "b") && status === "active"}
              isYou={topPlayer.id === userId}
              captured={getCaptured(flipped ? "b" : "w")}
              rating={flipped ? whiteRating : blackRating}
            />
          </div>

          {/* Board */}
          <div className="pl-5 pb-5 w-full" style={{ maxWidth: `calc(${boardMaxW} + 1.25rem)` }}>
            <ChessBoard
              chess={chess}
              flipped={flipped}
              disabled={!isMyTurn}
              lastMove={lastMove}
              onMove={handleMove}
              theme={boardTheme}
            />
          </div>

          {/* Board theme picker — only shown if either player has fanpass */}
          {hasFanpass && (
            <div className="w-full" style={{ maxWidth: boardMaxW }}>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2">
                <Palette className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-400 mr-1">Tema</span>
                <div className="flex gap-1.5">
                  {(Object.entries(BOARD_THEMES) as [BoardTheme, typeof BOARD_THEMES[BoardTheme]][]).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => setBoardTheme(key)}
                      title={t.name}
                      className="relative flex items-center overflow-hidden rounded transition-all"
                      style={{
                        width: 28,
                        height: 20,
                        outline: boardTheme === key ? "2px solid #a78bfa" : "1px solid rgba(255,255,255,0.1)",
                        outlineOffset: 1,
                      }}
                    >
                      <span className="flex-1 h-full" style={{ background: t.light }} />
                      <span className="flex-1 h-full" style={{ background: t.dark }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bottom player */}
          <div className="w-full" style={{ maxWidth: boardMaxW }}>
            <PlayerCard
              player={bottomPlayer}
              color={bottomColor}
              isActive={chess.turn() === (flipped ? "b" : "w") && status === "active"}
              isYou={bottomPlayer.id === userId}
              captured={getCaptured(flipped ? "w" : "b")}
              rating={flipped ? blackRating : whiteRating}
            />
          </div>

          {/* Status message */}
          {statusMsg() && (
            <div className="w-full text-center rounded-xl bg-white/10 py-3 px-4 text-sm font-semibold" style={{ maxWidth: boardMaxW }}>
              {statusMsg()}
            </div>
          )}

          {/* Mobile controls */}
          <div className="flex w-full gap-2 md:hidden" style={{ maxWidth: boardMaxW }}>
            <Link href={`/${initialGame.orgSlug}/spill/sjakk`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Tilbake
            </Link>
            {isPlayer && (
              <button
                onClick={() => setShowMobileChat((v) => !v)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors"
              >
                💬 Chat
              </button>
            )}
            {isPlayer && status === "active" && (
              <button onClick={() => void resign()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/30 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors">
                <Flag className="h-4 w-4" /> Gi opp
              </button>
            )}
          </div>

          {/* Mobile chat */}
          {showMobileChat && (
            <div className="w-full rounded-xl border border-white/10 bg-white/5 p-4 md:hidden" style={{ maxWidth: boardMaxW, height: "320px", display: "flex", flexDirection: "column" }}>
              <ChatPanel
                gameId={initialGame.id}
                userId={userId}
                white={initialGame.white}
                black={initialGame.black}
                status={status}
                initialMessages={chatMessages}
                newMessage={newChatMsg}
                onBroadcastChat={broadcastChat}
              />
            </div>
          )}
        </div>

        {/* ── Sidebar — desktop only ── */}
        <aside className="hidden md:flex flex-col gap-3 w-80 shrink-0 pt-12" style={{ minHeight: "calc(100vh - 8rem)" }}>
          {/* Nav */}
          <Link href={`/${initialGame.orgSlug}/spill/sjakk`}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Tilbake til lobby
          </Link>

          {/* Turn indicator */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 shrink-0">
            <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">Tur</p>
            <div className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded-full border-2 ${chess.turn() === "w" ? "bg-white border-white" : "bg-zinc-800 border-zinc-600"}`} />
              <span className="text-sm font-semibold text-white">
                {chess.turn() === "w" ? initialGame.white.name : initialGame.black.name}
                {chess.turn() === myColor && status === "active" && <span className="ml-1 text-emerald-400">(deg)</span>}
              </span>
            </div>
            {chess.isCheck() && <p className="mt-2 text-xs font-bold text-amber-400">⚠️ Sjakk!</p>}
          </div>

          {/* Move history */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 shrink-0">
            <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">Trekk</p>
            {moves.length === 0
              ? <p className="text-xs text-white/30">Ingen trekk ennå</p>
              : (
                <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
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

          {/* Chat panel — takes remaining space */}
          {isPlayer && (
            <div className="flex-1 rounded-xl border border-white/10 bg-white/5 p-4 min-h-0">
              <ChatPanel
                gameId={initialGame.id}
                userId={userId}
                white={initialGame.white}
                black={initialGame.black}
                status={status}
                initialMessages={chatMessages}
                newMessage={newChatMsg}
                onBroadcastChat={broadcastChat}
              />
            </div>
          )}

          {/* Game result */}
          {status !== "active" && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center shrink-0">
              <p className="font-bold text-white">{statusMsg()}</p>
              <button
                onClick={() => router.push(`/${initialGame.orgSlug}/spill/sjakk`)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> Ny kamp
              </button>
            </div>
          )}

          {/* Resign */}
          {isPlayer && status === "active" && (
            <button onClick={() => void resign()}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-500/30 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors">
              <Flag className="h-4 w-4" /> Gi opp
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
