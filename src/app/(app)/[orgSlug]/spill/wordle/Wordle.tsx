"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ─── Word list (5-letter Norwegian words, all caps) ──────────────────────────

const WORDS = [
  'HUSET','BILEN','FJELL','NORSK','SKOLE','SOLEN','MÅNEN','GRØNN','BRUKE','SPISE',
  'DRIKK','LØPER','BØKER','ÅPNER','DAGER','SNART','GJØRE','KJØPE','KJØRE','BESTE',
  'STORE','ANDRE','ETTER','UNDER','INGEN','IGJEN','NESTE','FORAN','SIDEN','BLANT',
  'HVILE','VENTE','SETTE','REKKE','VINNE','MISTE','HENTE','FINNE','SENDE','RINGE',
  'SYNGE','DANSE','TRENE','KASTE','LØFTE','TENKE','HUSKE','TELLE','KRAFT','GLEDE',
  'PRØVE','DRIVE','FORME','KRONE','GJEST','SVANE','FLOTT','SVART','RUNDE','SKYTE',
  'FARGE','KLART','SPILL','VERRE','BURDE','HØYRE','FRONT','PUNKT','GRUNN','TRINN',
  'SØKER','TIMER','EVNER','LOVER','REISE','PLASS','FRITT','MENTE','VISTE','SISTE',
  'SJØEN','ELVEN','SAKEN','BOKEN','LIVET','VEIEN','ORDEN','KORTE','LANGE','VOKSE',
  'FALLE','STUPE','SEILE','GANGE','TUREN','LYSET','MØRKT','TRYGG','KAFFE','BORTE',
  'FORBI','LIKNE','MINNE','LØVEN','ULVEN','BJØRN','ØRNEN','HAREN','EPLER','SUPPE',
  'PASTA','PIZZA','KJØTT','SMØRE','SUKKE','VASKE','PYNTE','SPØKE','SMILE','GRINE',
  'ROPER','SATTE','FIKSE','BRYTE','SAMLE','LENKE','TANKE','BANKE','BLANK','KLANG',
  'ØNSKE','VERDI','VALGT','ANGST','FRIST','SJANS','SMART','KRAGE','KJOLE','JAKKE',
  'KODEN','TREKK','TRYKK','KNEKK','SJOKK','FRYKT','GLATT','BRATT','KALDT','VARMT',
  'TØRRE','TENNE','BRANN','VANNE','BYGGE','RIVER','KNUSE','SKAPE','TEGNE','LESER',
  'SAKTE','RASKT','SPARE','FLYTT','RYDDE','KJENN','MERKE','KJENT','KJÆRE','ÆRLIG',
  'ANNET','FLINK','TRIST','MODIG','ROLIG','REDDE','GLADE','SINTE','GREIT','FEILE',
  'SKADE','HJELP','BERGE','PASSE','STOPP','START','KLAPP','TRAMP','STAMP','RAMME',
  'BARNA','HANEN','HYTTE','FJORD','SNØEN','DALEN','STIEN','BØLGE','KLIPP','DRØMT',
  'VUGGE','HOSTE','KUTTE','BRØLE','SKRIK','KLAGE','GRÅTE','HOLDE','TIGER','PANDA',
  'ZEBRA','SVIKE','HEVNE','JUBLE','BOBLE','SPYLE','KJØNN','SØYLE','FLYTE','FISKE',
  'JAKTE','SPORE','TROPP','SKILT','SVETT','BUKSE','SKUFF','STERK','SLANG','FLANK',
  'SLUKK','PURRE','GUBBE','MØTET','STØTE','NØLER','MALTE','VINDE','FLOTA','RINGEN',
] as const;

// Valid guesses also accepted (superset — same list for simplicity)
const VALID_GUESSES = new Set<string>(WORDS);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDailyWord(): string {
  const now   = new Date();
  const day   = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const epoch = Date.UTC(2024, 0, 1);
  const idx   = Math.floor((day - epoch) / 86_400_000) % WORDS.length;
  return WORDS[Math.abs(idx)]!;
}

function todayKey(): string {
  const d = new Date();
  return `wordle_${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

type LetterState = "correct" | "present" | "absent";

function evaluate(guess: string, target: string): LetterState[] {
  const result: LetterState[] = Array(5).fill("absent");
  const tArr = [...target];
  const gArr = [...guess];

  // Pass 1: correct
  gArr.forEach((ch, i) => {
    if (ch === tArr[i]) {
      result[i] = "correct";
      tArr[i]   = "#";
      gArr[i]   = "_";
    }
  });

  // Pass 2: present
  gArr.forEach((ch, i) => {
    if (ch === "_") return;
    const j = tArr.indexOf(ch);
    if (j !== -1) {
      result[i] = "present";
      tArr[j]   = "#";
    }
  });

  return result;
}

// ─── Keyboard layout ─────────────────────────────────────────────────────────

const KB_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P","Å"],
  ["A","S","D","F","G","H","J","K","L","Ø","Æ"],
  ["SLETT","Z","X","C","V","B","N","M","ENTER"],
];

// ─── State persistence ───────────────────────────────────────────────────────

interface SavedState {
  guesses:  string[];
  evals:    LetterState[][];
  status:   "playing" | "won" | "lost";
  coinDone: boolean;
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(todayKey());
    if (!raw) return null;
    return JSON.parse(raw) as SavedState;
  } catch { return null; }
}

function saveState(s: SavedState) {
  try { localStorage.setItem(todayKey(), JSON.stringify(s)); } catch { /* quota */ }
}

// ─── Streak ──────────────────────────────────────────────────────────────────

function loadStreak(): number {
  try { return parseInt(localStorage.getItem("wordle_streak") ?? "0", 10) || 0; } catch { return 0; }
}

function bumpStreak() {
  const yesterday = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return `wordle_${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  })();
  const lastWon = localStorage.getItem("wordle_last_won");
  const prev    = loadStreak();
  // If won yesterday, increment; else reset to 1
  const next = lastWon === yesterday ? prev + 1 : 1;
  localStorage.setItem("wordle_streak", String(next));
  localStorage.setItem("wordle_last_won", todayKey());
  return next;
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const STATE_COLORS: Record<LetterState | "empty" | "filled", string> = {
  correct: "#1d9e75",
  present: "#f9c74f",
  absent:  "rgba(255,255,255,0.12)",
  empty:   "rgba(255,255,255,0.04)",
  filled:  "rgba(255,255,255,0.12)",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Wordle({ orgSlug }: { orgSlug: string }) {
  const target = useRef(getDailyWord());

  const [guesses,     setGuesses]     = useState<string[]>([]);
  const [evals,       setEvals]       = useState<LetterState[][]>([]);
  const [current,     setCurrent]     = useState<string[]>([]);
  const [status,      setStatus]      = useState<"playing" | "won" | "lost">("playing");
  const [shake,       setShake]       = useState(false);
  const [error,       setError]       = useState("");
  const [orgId,       setOrgId]       = useState<string | null>(null);
  const [streak,      setStreak]      = useState(0);
  const [coinDone,    setCoinDone]    = useState(false);
  const [flipping,    setFlipping]    = useState<number | null>(null); // row index being revealed
  const [copied,      setCopied]      = useState(false);

  // ── Init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setGuesses(saved.guesses);
      setEvals(saved.evals);
      setStatus(saved.status);
      setCoinDone(saved.coinDone);
    }
    setStreak(loadStreak());
    fetch("/api/user/org")
      .then((r) => r.json())
      .then((d: { id: string }) => setOrgId(d.id))
      .catch(() => null);
  }, []);

  // ── Derived: letter statuses for keyboard ──────────────────────────────
  const letterStatus = useRef<Record<string, LetterState>>({});
  useEffect(() => {
    const map: Record<string, LetterState> = {};
    evals.forEach((ev, gi) => {
      ev.forEach((st, li) => {
        const ch = guesses[gi]?.[li];
        if (!ch) return;
        const prev = map[ch];
        if (!prev || (prev !== "correct" && st === "correct") || (prev === "absent" && st === "present"))
          map[ch] = st;
      });
    });
    letterStatus.current = map;
  }, [evals, guesses]);

  // ── Award coins ────────────────────────────────────────────────────────
  const awardWin = useCallback(async (newStreak: number) => {
    if (!orgId || coinDone) return;
    setCoinDone(true);
    await fetch("/api/games/award", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId, game: "wordle", reason: "wordle" }),
    }).catch(() => null);
    // Update saved state
    const saved = loadState();
    if (saved) saveState({ ...saved, coinDone: true });
    setStreak(newStreak);
  }, [orgId, coinDone]);

  // ── Submit guess ───────────────────────────────────────────────────────
  const submit = useCallback(() => {
    if (status !== "playing") return;
    const word = current.join("");
    if (word.length !== 5) {
      setShake(true);
      setError("For kort!");
      setTimeout(() => { setShake(false); setError(""); }, 600);
      return;
    }
    if (!VALID_GUESSES.has(word)) {
      setShake(true);
      setError("Ukjent ord");
      setTimeout(() => { setShake(false); setError(""); }, 600);
      return;
    }

    const ev        = evaluate(word, target.current);
    const newGuesses = [...guesses, word];
    const newEvals   = [...evals, ev];
    const row        = newGuesses.length - 1;

    // Flip animation
    setFlipping(row);
    setTimeout(() => setFlipping(null), 500);

    const won  = ev.every((s) => s === "correct");
    const lost = !won && newGuesses.length >= 6;
    const newStatus: "playing" | "won" | "lost" = won ? "won" : lost ? "lost" : "playing";

    setGuesses(newGuesses);
    setEvals(newEvals);
    setCurrent([]);
    setStatus(newStatus);

    const savedCoinDone = coinDone;
    saveState({ guesses: newGuesses, evals: newEvals, status: newStatus, coinDone: savedCoinDone });

    if (won && !savedCoinDone) {
      const ns = bumpStreak();
      void awardWin(ns);
    }
  }, [status, current, guesses, evals, coinDone, awardWin]);

  // ── Key handler ────────────────────────────────────────────────────────
  const handleKey = useCallback((key: string) => {
    if (status !== "playing") return;
    if (key === "ENTER") { submit(); return; }
    if (key === "SLETT" || key === "BACKSPACE") {
      setCurrent((c) => c.slice(0, -1));
      return;
    }
    if (/^[A-ZÆØÅ]$/.test(key) && current.length < 5) {
      setCurrent((c) => [...c, key]);
    }
  }, [status, current, submit]);

  // ── Physical keyboard ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter")     { handleKey("ENTER");     return; }
      if (e.key === "Backspace") { handleKey("BACKSPACE");  return; }
      const ch = e.key.toUpperCase();
      if (/^[A-ZÆØÅ]$/.test(ch)) handleKey(ch);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  // ── Share ──────────────────────────────────────────────────────────────
  const share = useCallback(() => {
    const EMOJI: Record<LetterState, string> = { correct: "🟩", present: "🟨", absent: "⬛" };
    const rows = evals.map((ev) => ev.map((s) => EMOJI[s]).join("")).join("\n");
    const text = `Wordle ${todayKey()}\n${status === "won" ? `${guesses.length}/6` : "X/6"}\n\n${rows}`;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [evals, guesses, status]);

  // ── Render ────────────────────────────────────────────────────────────
  const allRows = Array.from({ length: 6 }, (_, i) => {
    const submitted = i < guesses.length;
    const active    = i === guesses.length;
    const letters   = submitted
      ? guesses[i]!.split("")
      : active
      ? [...current, ...Array(5 - current.length).fill("")]
      : Array(5).fill("");
    const ev = submitted ? evals[i]! : null;
    return { letters, ev, submitted, active };
  });

  return (
    <>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)}
        }
        @keyframes flip {
          0%   {transform:rotateX(0deg)}
          50%  {transform:rotateX(-90deg)}
          100% {transform:rotateX(0deg)}
        }
        .row-shake { animation: shake 0.4s ease; }
        .tile-flip { animation: flip 0.5s ease; }
      `}</style>

      <div className="flex min-h-screen flex-col items-center px-4 py-6" style={{ background: "#0d0d14" }}>
        {/* Back link */}
        <div className="mb-4 w-full max-w-[420px]">
          <Link href={`/${orgSlug}/spill`} className="text-sm transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.4)" }}>
            ← Tilbake til spill
          </Link>
        </div>

        {/* Header */}
        <div className="mb-4 flex w-full max-w-[420px] items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Wordle</h1>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>Daglig norsk ord</p>
          </div>
          <div className="flex items-center gap-3">
            {streak > 1 && (
              <span className="text-sm font-semibold" style={{ color: "#f9c74f" }}>
                🔥 {streak} dager
              </span>
            )}
            <div className="rounded-xl px-3 py-1.5 text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[9px] font-bold tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>FORSØK</p>
              <p className="text-sm font-bold text-white">{guesses.length}/6</p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="mb-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            {error}
          </div>
        )}

        {/* Grid */}
        <div className="mb-6 flex flex-col gap-1.5" style={{ width: "min(350px, calc(100vw - 2rem))" }}>
          {allRows.map(({ letters, ev, submitted, active }, ri) => (
            <div
              key={ri}
              className={`flex gap-1.5 ${shake && active ? "row-shake" : ""}`}
              style={{ perspective: "400px" }}
            >
              {letters.map((ch, ci) => {
                const state: LetterState | "empty" | "filled" =
                  ev ? ev[ci]! : ch ? "filled" : "empty";
                const isFlipping = flipping === ri;
                return (
                  <div
                    key={ci}
                    className={isFlipping && submitted ? "tile-flip" : ""}
                    style={{
                      flex: 1,
                      aspectRatio: "1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: "clamp(1.1rem, 4vw, 1.4rem)",
                      color: submitted ? "#ffffff" : "rgba(255,255,255,0.9)",
                      background: STATE_COLORS[state],
                      border: ch && !submitted ? "2px solid rgba(255,255,255,0.25)" : "2px solid transparent",
                      animationDelay: isFlipping ? `${ci * 80}ms` : "0ms",
                      transition: submitted ? "background 0s" : "border 0.1s",
                    }}
                  >
                    {ch}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Win / Loss message */}
        {status !== "playing" && (
          <div
            className="mb-4 w-full max-w-[420px] rounded-2xl p-4 text-center"
            style={{
              background: status === "won" ? "rgba(29,158,117,0.1)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${status === "won" ? "rgba(29,158,117,0.3)" : "rgba(239,68,68,0.2)"}`,
            }}
          >
            {status === "won" ? (
              <>
                <p className="text-lg font-bold" style={{ color: "#1d9e75" }}>
                  {guesses.length === 1 ? "🤯 Umulig bra!" :
                   guesses.length <= 3 ? "🎉 Imponerende!" : "✅ Riktig!"}
                </p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Ordets var: <strong className="text-white">{target.current}</strong>
                </p>
                {!coinDone && (
                  <p className="mt-1 text-xs font-semibold" style={{ color: "#fbbf24" }}>+15 🪙 Coins tildelt!</p>
                )}
              </>
            ) : (
              <>
                <p className="text-lg font-bold" style={{ color: "#ef4444" }}>Beklager!</p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Svaret var: <strong className="text-white">{target.current}</strong>
                </p>
              </>
            )}
            <button
              onClick={share}
              className="mt-3 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              {copied ? "✓ Kopiert!" : "Del resultatet"}
            </button>
          </div>
        )}

        {/* Virtual keyboard */}
        <div className="flex w-full max-w-[420px] flex-col gap-1.5">
          {KB_ROWS.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1">
              {row.map((key) => {
                const st     = letterStatus.current[key];
                const isWide = key === "ENTER" || key === "SLETT";
                return (
                  <button
                    key={key}
                    onClick={() => handleKey(key)}
                    style={{
                      minWidth: isWide ? 56 : 30,
                      flex: isWide ? "0 0 auto" : "1 1 0",
                      maxWidth: isWide ? 56 : 42,
                      minHeight: 44,
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: isWide ? 11 : 14,
                      color: st ? "#ffffff" : "rgba(255,255,255,0.85)",
                      background: st
                        ? STATE_COLORS[st]
                        : "rgba(255,255,255,0.1)",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.15s",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
