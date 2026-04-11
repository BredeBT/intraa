export default function MeldingerLoading() {
  return (
    <div className="flex h-[calc(100vh-56px)] animate-pulse">
      {/* Sidebar skeleton */}
      <aside className="flex w-72 shrink-0 flex-col gap-3 border-r border-zinc-800 bg-zinc-900 px-4 py-5">
        {/* Search bar */}
        <div className="h-8 rounded-lg bg-zinc-800" />

        {/* Section label */}
        <div className="mt-2 h-3 w-24 rounded bg-zinc-800" />

        {/* Channel rows */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-4 w-4 shrink-0 rounded bg-zinc-800" />
            <div className="h-3 flex-1 rounded bg-zinc-800" style={{ width: `${60 + i * 8}%` }} />
          </div>
        ))}

        <div className="mt-4 h-3 w-20 rounded bg-zinc-800" />

        {/* DM rows */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="h-7 w-7 shrink-0 rounded-full bg-zinc-800" />
            <div className="flex flex-1 flex-col gap-1">
              <div className="h-3 w-24 rounded bg-zinc-800" />
              <div className="h-2 w-32 rounded bg-zinc-800" />
            </div>
          </div>
        ))}
      </aside>

      {/* Empty message area */}
      <div className="flex flex-1 items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-600">Laster meldinger…</p>
      </div>
    </div>
  );
}
