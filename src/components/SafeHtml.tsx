import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "code", "pre", "s", "ul", "ol", "li"];

const IS_HTML = /<[a-z][\s\S]*>/i;

function sanitize(html: string) {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: [] });
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
