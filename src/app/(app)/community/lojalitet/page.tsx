"use client";

import { Star, MessageCircle, Heart, LogIn, FileText } from "lucide-react";

const MY_POINTS = 1870;

interface Level {
  name: string;
  min: number;
  max: number | null;
  color: string;
  bg: string;
  ring: string;
}

const LEVELS: Level[] = [
  { name: "Ny",      min: 0,    max: 100,  color: "text-zinc-400",   bg: "bg-zinc-700",    ring: "ring-zinc-600" },
  { name: "Aktiv",   min: 100,  max: 500,  color: "text-blue-400",   bg: "bg-blue-600",    ring: "ring-blue-500" },
  { name: "Veteran", min: 500,  max: 1000, color: "text-violet-400", bg: "bg-violet-600",  ring: "ring-violet-500" },
  { name: "Legende", min: 1000, max: null, color: "text-amber-400",  bg: "bg-amber-500",   ring: "ring-amber-400" },
];

const WAYS_TO_EARN = [
  { icon: FileText,    label: "Legg ut et innlegg",  points: "+10", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { icon: MessageCircle, label: "Skriv en kommentar", points: "+5",  color: "text-blue-400",   bg: "bg-blue-500/10" },
  { icon: Heart,       label: "Motta en like",        points: "+2",  color: "text-rose-400",   bg: "bg-rose-500/10" },
  { icon: LogIn,       label: "Logg inn daglig",      points: "+1",  color: "text-emerald-400",bg: "bg-emerald-500/10" },
];

interface HistoryItem {
  id: string;
  description: string;
  points: number;
  time: string;
}

const HISTORY: HistoryItem[] = [
  { id: "h1",  description: "Fikk like på innlegget ditt",    points:  2, time: "I dag 14:22" },
  { id: "h2",  description: "Daglig innlogging",              points:  1, time: "I dag 09:01" },
  { id: "h3",  description: "La ut et nytt innlegg",          points: 10, time: "I går 17:45" },
  { id: "h4",  description: "Kommenterte på et innlegg",      points:  5, time: "I går 15:30" },
  { id: "h5",  description: "Fikk like på innlegget ditt",    points:  2, time: "I går 13:10" },
  { id: "h6",  description: "Fikk like på innlegget ditt",    points:  2, time: "I går 11:55" },
  { id: "h7",  description: "Daglig innlogging",              points:  1, time: "I går 08:02" },
  { id: "h8",  description: "Kommenterte på et innlegg",      points:  5, time: "02.04 19:20" },
  { id: "h9",  description: "La ut et nytt innlegg",          points: 10, time: "02.04 14:03" },
  { id: "h10", description: "Daglig innlogging",              points:  1, time: "02.04 08:14" },
];

function getCurrentLevel(points: number): Level {
  return [...LEVELS].reverse().find(l => points >= l.min) ?? LEVELS[0];
}

function getNextLevel(points: number): Level | null {
  return LEVELS.find(l => l.min > points) ?? null;
}

function getProgress(points: number): number {
  const current = getCurrentLevel(points);
  const next = getNextLevel(points);
  if (!next) return 100;
  const range = next.min - current.min;
  const earned = points - current.min;
  return Math.round((earned / range) * 100);
}

export default function LojalitetPage() {
  const level   = getCurrentLevel(MY_POINTS);
  const next    = getNextLevel(MY_POINTS);
  const progress = getProgress(MY_POINTS);
  const toNext  = next ? next.min - MY_POINTS : 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-8 text-xl font-semibold text-white">Lojalitet & Poeng</h1>

      {/* Current level card */}
      <div className={`mb-6 rounded-2xl border bg-zinc-900 p-6 ring-1 ${level.ring}`} style={{ borderColor: "transparent" }}>
        <div className="mb-4 flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${level.bg}`}>
            <Star className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Nåværende nivå</p>
            <p className={`text-2xl font-bold ${level.color}`}>{level.name}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-3xl font-bold text-white">{MY_POINTS.toLocaleString("no-NO")}</p>
            <p className="text-xs text-zinc-500">totale poeng</p>
          </div>
        </div>

        {next ? (
          <>
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
              <span>{level.name}</span>
              <span className={getNextLevel(MY_POINTS) ? LEVELS[LEVELS.indexOf(level) + 1]?.color ?? "" : ""}>{next.name} ({next.min.toLocaleString("no-NO")} p)</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all ${level.bg}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-zinc-500">
              {toNext.toLocaleString("no-NO")} poeng til {next.name}
            </p>
          </>
        ) : (
          <p className="mt-2 text-center text-xs text-amber-400">
            🏆 Du har nådd høyeste nivå!
          </p>
        )}
      </div>

      {/* All levels */}
      <div className="mb-8 grid grid-cols-4 gap-2">
        {LEVELS.map(l => {
          const isActive = l.name === level.name;
          const isPast   = l.min < level.min;
          return (
            <div key={l.name} className={`rounded-xl border p-3 text-center transition-colors ${isActive ? `border-transparent ring-1 ${l.ring} ${l.bg}/10` : isPast ? "border-zinc-800 bg-zinc-900/50 opacity-60" : "border-zinc-800 bg-zinc-900"}`}>
              <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full ${isPast || isActive ? l.bg : "bg-zinc-800"}`}>
                <Star className="h-4 w-4 text-white" />
              </div>
              <p className={`text-xs font-semibold ${isActive ? l.color : "text-zinc-500"}`}>{l.name}</p>
              <p className="text-xs text-zinc-600">{l.min}{l.max ? `–${l.max}` : "+"}</p>
            </div>
          );
        })}
      </div>

      {/* Ways to earn */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-white">Slik tjener du poeng</h2>
        <div className="grid grid-cols-2 gap-3">
          {WAYS_TO_EARN.map(({ icon: Icon, label, points, color, bg }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-zinc-300">{label}</p>
              </div>
              <span className={`text-sm font-bold ${color}`}>{points}</span>
            </div>
          ))}
        </div>
      </section>

      {/* History */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-white">Poeng-historikk</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {HISTORY.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-center justify-between px-5 py-3.5 ${i < HISTORY.length - 1 ? "border-b border-zinc-800" : ""} hover:bg-zinc-900 transition-colors`}
            >
              <p className="text-sm text-zinc-300">{item.description}</p>
              <div className="ml-4 flex items-center gap-4 shrink-0">
                <span className="text-xs text-zinc-600">{item.time}</span>
                <span className="w-10 text-right text-sm font-semibold text-emerald-400">+{item.points}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
