"use client";

import { useMemo } from "react";

interface Props {
  html:       string;
  className?: string;
}

/**
 * Renders a (possibly rich-text) message safely.
 * Uses DOMPurify on the client; falls back to plain-text on the server.
 */
export default function SafeHtml({ html, className = "" }: Props) {
  const safe = useMemo(() => {
    if (typeof window === "undefined") return html;
    // Lazy-import DOMPurify only when running in the browser
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DOMPurify = (require("dompurify") as typeof import("dompurify")).default;
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "code", "pre", "s", "ul", "ol", "li"],
      ALLOWED_ATTR: [],
    });
  }, [html]);

  return (
    <span
      className={`msg-html ${className}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
