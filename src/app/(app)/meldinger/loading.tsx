export default function MeldingerLoading() {
  return (
    <div className="flex h-[calc(100vh-56px)] animate-pulse" style={{ background: "var(--bg-primary)" }}>
      {/* Sidebar skeleton — full bredde på mobil, fast bredde på desktop */}
      <aside
        className="flex w-full md:w-72 shrink-0 flex-col gap-3 border-r px-4 py-5"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
      >
        {/* Search bar */}
        <div className="h-8 rounded-lg" style={{ background: "var(--bg-tertiary)" }} />

        {/* Section label */}
        <div className="mt-2 h-3 w-24 rounded" style={{ background: "var(--bg-tertiary)" }} />

        {/* Channel rows */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-4 w-4 shrink-0 rounded" style={{ background: "var(--bg-tertiary)" }} />
            <div className="h-3 flex-1 rounded" style={{ background: "var(--bg-tertiary)", width: `${60 + i * 8}%` }} />
          </div>
        ))}

        <div className="mt-4 h-3 w-20 rounded" style={{ background: "var(--bg-tertiary)" }} />

        {/* DM rows */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="h-7 w-7 shrink-0 rounded-full" style={{ background: "var(--bg-tertiary)" }} />
            <div className="flex flex-1 flex-col gap-1">
              <div className="h-3 w-24 rounded" style={{ background: "var(--bg-tertiary)" }} />
              <div className="h-2 w-32 rounded" style={{ background: "var(--bg-tertiary)" }} />
            </div>
          </div>
        ))}
      </aside>

      {/* Empty message area — kun synlig på desktop */}
      <div
        className="hidden md:flex flex-1 items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Laster meldinger…</p>
      </div>
    </div>
  );
}
