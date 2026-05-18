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
        color:      "#f7b733",
        filter:     "drop-shadow(0 0 3px rgba(247,183,51,0.6))",
        flexShrink: 0,
        display:    "inline-block",
        userSelect: "none",
      }}
    >
      ♛
    </span>
  );
}
