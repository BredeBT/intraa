export default function Loading() {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-6" style={{ background: "var(--bg-primary)" }}>
      <div className="h-40 rounded-2xl -mx-4 mb-4 animate-pulse" style={{ background: "var(--border-subtle)" }} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "var(--bg-glass)" }} />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 rounded-2xl mb-3 animate-pulse" style={{ background: "var(--bg-glass)" }} />
      ))}
    </div>
  );
}
