export default function Loading() {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-6" style={{ background: "#0d0d14" }}>
      {/* Banner skeleton */}
      <div className="h-40 rounded-2xl -mx-4 mb-4 animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
      {/* Post skeletons */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 rounded-2xl mb-3 animate-pulse"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
      ))}
    </div>
  );
}
