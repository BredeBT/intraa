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
        color:      "#a78bfa",
        filter:     "drop-shadow(0 0 3px rgba(167,139,250,0.6))",
        flexShrink: 0,
        display:    "inline-block",
        userSelect: "none",
      }}
    >
      ♛
    </span>
  );
}
