import { Star, MessageCircle, Heart, LogIn, FileText } from "lucide-react";

const WAYS_TO_EARN = [
  { icon: FileText,      label: "Legg ut et innlegg",   points: "+10", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { icon: MessageCircle, label: "Skriv en kommentar",   points: "+5",  color: "text-blue-400",   bg: "bg-blue-500/10"   },
  { icon: Heart,         label: "Motta en like",         points: "+2",  color: "text-rose-400",   bg: "bg-rose-500/10"   },
  { icon: LogIn,         label: "Logg inn daglig",       points: "+1",  color: "text-emerald-400",bg: "bg-emerald-500/10"},
];

const LEVELS = [
  { name: "Ny",      min: 0,    max: 100,  color: "text-zinc-400",   bg: "bg-zinc-700",   ring: "ring-zinc-600"   },
  { name: "Aktiv",   min: 100,  max: 500,  color: "text-blue-400",   bg: "bg-blue-600",   ring: "ring-blue-500"   },
  { name: "Veteran", min: 500,  max: 1000, color: "text-violet-400", bg: "bg-violet-600", ring: "ring-violet-500" },
  { name: "Legende", min: 1000, max: null, color: "text-amber-400",  bg: "bg-amber-500",  ring: "ring-amber-400"  },
];

export default function LojalitetPage() {
  const currentLevel = LEVELS[0]; // 0 points = "Ny"
  const nextLevel    = LEVELS[1];

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-8 text-xl font-semibold text-white">Lojalitet & Poeng</h1>

      {/* Current level card */}
      <div className={`mb-6 rounded-2xl border border-transparent bg-zinc-900 p-6 ring-1 ${currentLevel.ring}`}>
        <div className="mb-4 flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${currentLevel.bg}`}>
            <Star className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Nåværende nivå</p>
            <p className={`text-2xl font-bold ${currentLevel.color}`}>{currentLevel.name}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-xs text-zinc-500">totale poeng</p>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span>{currentLevel.name}</span>
          <span className={nextLevel.color}>{nextLevel.name} ({nextLevel.min} p)</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
          <div className={`h-full rounded-full ${currentLevel.bg}`} style={{ width: "0%" }} />
        </div>
        <p className="mt-2 text-center text-xs text-zinc-500">
          {nextLevel.min} poeng til {nextLevel.name}
        </p>
      </div>

      {/* All levels */}
      <div className="mb-8 grid grid-cols-4 gap-2">
        {LEVELS.map((l, i) => (
          <div key={l.name} className={`rounded-xl border p-3 text-center ${i === 0 ? `border-transparent ring-1 ${l.ring}` : "border-zinc-800 bg-zinc-900"}`}>
            <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full ${i === 0 ? l.bg : "bg-zinc-800"}`}>
              <Star className="h-4 w-4 text-white" />
            </div>
            <p className={`text-xs font-semibold ${i === 0 ? l.color : "text-zinc-500"}`}>{l.name}</p>
            <p className="text-xs text-zinc-600">{l.min}{l.max ? `–${l.max}` : "+"}</p>
          </div>
        ))}
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 py-10 text-zinc-600">
          <p className="text-sm">Ingen poeng registrert ennå.</p>
        </div>
      </section>
    </div>
  );
}
