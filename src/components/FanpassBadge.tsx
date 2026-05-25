/**
 * Small Fanpass crown badge — shown next to names in chat, feed, chess etc.
 * Only render when user.hasFanpass === true.
 */
export function FanpassBadge({ size = 11 }: { size?: number }) {
  return (
    <span
      aria-label="Fanpass-medlem"
      title="Fanpass-medlem"
      style={{
        fontSize:   size,
        lineHeight: 1,
        color:      "var(--aurora-purple)",  // flippes til mørkere lilla i light mode
        filter:     "drop-shadow(0 0 3px rgba(168,85,247,0.6))",
        flexShrink: 0,
        display:    "inline-block",
        userSelect: "none",
      }}
    >
      ♛
    </span>
  );
}
