import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "code", "pre", "s", "ul", "ol", "li", "span"];

// Hex (#fff, #ffffff, #ffffffff), rgb()/rgba(), eller fargenavn (red, mediumseagreen).
const SAFE_COLOR_RE = /^(#[0-9a-f]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|[a-z]+)$/i;

const IS_HTML = /<[a-z][\s\S]*>/i;

function sanitize(html: string) {
  // Bruk en sanitizer-hook for å strippe alle style-attributter unntatt
  // sikre `color: <verdi>` deklarasjoner. Kjører både server- og client-side.
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["style"],
    // isomorphic-dompurify har attribute-hook-støtte via "hooks" via
    // .addHook() — men det er globalt. Tryggere: bruk uses-profile-config
    // og post-process style-verdier.
    KEEP_CONTENT: true,
    // Tillater bare style-egenskapen, og kun color-verdier validert under.
    FORBID_ATTR: [],
  }).replace(/\sstyle="([^"]*)"/gi, (_match, raw: string) => {
    // Plukk ut "color: X" og kast resten
    const m = raw.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
    if (!m) return "";
    const value = m[1]!.trim();
    if (!SAFE_COLOR_RE.test(value)) return "";
    return ` style="color: ${value}"`;
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
