import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "code", "pre", "s", "ul", "ol", "li", "span"];

// Hex (#fff, #ffffff, #ffffffff), rgb()/rgba(), eller fargenavn (red, mediumseagreen).
const SAFE_COLOR_RE = /^(#[0-9a-f]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|[a-z]+)$/i;
// CSS-størrelser: 14px, 1.5em, 1.2rem, 150% — caps på 5em så ingen sprenger layouten.
const SAFE_SIZE_RE  = /^(?:0?\.[0-9]+|[0-4](?:\.[0-9]+)?|5)(?:px|em|rem|%)$/i;

const IS_HTML = /<[a-z][\s\S]*>/i;

function sanitize(html: string) {
  // Bruk DOMPurify til tag-/attributt-stripping, deretter post-process
  // style-attributter for å beholde kun trygge color/font-size-verdier.
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["style"],
    KEEP_CONTENT: true,
  }).replace(/\sstyle="([^"]*)"/gi, (_match, raw: string) => {
    const safe: string[] = [];

    const colorMatch = raw.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
    if (colorMatch) {
      const val = colorMatch[1]!.trim();
      if (SAFE_COLOR_RE.test(val)) safe.push(`color: ${val}`);
    }

    const sizeMatch = raw.match(/(?:^|;)\s*font-size\s*:\s*([^;]+)/i);
    if (sizeMatch) {
      const val = sizeMatch[1]!.trim();
      if (SAFE_SIZE_RE.test(val)) safe.push(`font-size: ${val}`);
    }

    return safe.length > 0 ? ` style="${safe.join("; ")}"` : "";
  });
}

interface Props {
  content:    string;
  className?: string;
}

/**
 * Renders message content that may be either plain text (old) or HTML (Tiptap).
 * Plain text is rendered with whitespace-pre-wrap; HTML goes through DOMPurify.
 */
export default function SafeHtml({ content, className = "" }: Props) {
  if (IS_HTML.test(content)) {
    // Use div (block) so Tiptap's <p> children are valid — a <span> containing <p>
    // causes browsers to close the outer element early, breaking bubble layout.
    return (
      <div
        className={`msg-html ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitize(content) }}
      />
    );
  }
  return (
    <span className={`whitespace-pre-wrap break-words ${className}`}>
      {content}
    </span>
  );
}
