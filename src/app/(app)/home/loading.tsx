export default function Loading() {
  return (
    <div className="min-h-screen px-4 py-6" style={{ background: "var(--bg-primary)" }}>
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[150px] rounded-2xl animate-pulse"
                style={{ background: "var(--bg-glass)" }}
              />
            ))}
          </div>
          <div
            className="hidden lg:block h-48 rounded-2xl animate-pulse"
            style={{ background: "var(--bg-glass)" }}
          />
        </div>
      </div>
    </div>
  );
}
