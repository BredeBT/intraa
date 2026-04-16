import Link from "next/link";

export default async function SpillPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const GAMES = [
    {
      href:        `/${orgSlug}/clicker`,
      emoji:       "🖱️",
      title:       "Klikker",
      description: "Klikk deg til rikdom, kjøp oppgraderinger og prestige gjennom verdener. Solo-spill.",
      badge:       "Solo",
      badgeColor:  "bg-violet-500/20 text-violet-300",
      gradient:    "from-violet-600/20 to-purple-800/10",
      border:      "border-violet-500/20",
    },
    {
      href:        `/${orgSlug}/spill/sjakk`,
      emoji:       "♟️",
      title:       "Sjakk",
      description: "Utfordre en venn til en klassisk sjakkpartie. Sanntidsoppdateringer via Supabase.",
      badge:       "2 spillere",
      badgeColor:  "bg-emerald-500/20 text-emerald-300",
      gradient:    "from-emerald-600/20 to-teal-800/10",
      border:      "border-emerald-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d14] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-white">🎮 Spill</h1>
        <p className="mb-8 text-sm text-white/40">Velg et spill for å komme i gang</p>

        <div className="flex flex-col gap-4">
          {GAMES.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className={`group relative overflow-hidden rounded-2xl border ${g.border} bg-gradient-to-br ${g.gradient} p-6 transition-all hover:scale-[1.01] hover:brightness-110`}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{g.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-white">{g.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${g.badgeColor}`}>
                      {g.badge}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed">{g.description}</p>
                </div>
                <span className="shrink-0 text-white/30 group-hover:text-white/60 transition-colors text-xl mt-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
