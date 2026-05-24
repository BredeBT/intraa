"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, MessageCircle, Heart, ExternalLink, BookmarkX } from "lucide-react";
import SafeHtml from "@/components/SafeHtml";

interface BookmarkItem {
  bookmarkId:   string;
  bookmarkedAt: string;
  post: {
    id:           string;
    content:      string;
    imageUrl:     string | null;
    createdAt:    string;
    author:       { id: string; name: string | null; avatarUrl: string | null };
    organization: { id: string; slug: string; name: string };
    likeCount:    number;
    commentCount: number;
  };
}

const S = {
  bg:       "var(--bg-primary)",
  surface:  "var(--bg-secondary)",
  surface2: "var(--bg-tertiary)",
  line:     "var(--border-subtle)",
  text:     "var(--text-primary)",
  muted:    "var(--text-secondary)",
  subtle:   "var(--text-tertiary)",
  amber:    "#FBBF24",
  pink:     "#F472B6",
  purple:   "#A855F7",
} as const;

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)    return "nå";
  if (min < 60)   return `${min} min siden`;
  const h = Math.floor(min / 60);
  if (h < 24)     return `${h} t siden`;
  const d = Math.floor(h / 24);
  if (d < 7)      return `${d} d siden`;
  return new Date(iso).toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" });
}

export default function LagretClient({ items: initialItems }: { items: BookmarkItem[] }) {
  const [items,   setItems]   = useState(initialItems);
  const [removing, setRemoving] = useState<string | null>(null);

  async function removeBookmark(postId: string) {
    setRemoving(postId);
    const prev = items;
    setItems(items.filter((i) => i.post.id !== postId));
    try {
      const r = await fetch(`/api/posts/${postId}/bookmark`, { method: "DELETE" });
      if (!r.ok) setItems(prev); // rollback ved feil
    } catch {
      setItems(prev);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8" style={{ color: S.text }}>
      <div className="mb-6 flex items-center gap-2">
        <Bookmark className="h-5 w-5" style={{ color: S.amber }} fill={S.amber} />
        <h1 className="text-2xl font-bold" style={{ color: S.text }}>Lagret</h1>
      </div>

      {items.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: S.surface, border: `1px solid ${S.line}` }}
        >
          <Bookmark className="mx-auto mb-3 h-8 w-8" style={{ color: S.subtle }} />
          <p className="text-sm font-medium" style={{ color: S.text }}>Du har ikke lagret noen innlegg ennå.</p>
          <p className="mt-1 text-xs" style={{ color: S.muted }}>
            Trykk på bokmerke-ikonet under et innlegg for å lagre det for senere.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.bookmarkId}
              className="overflow-hidden rounded-2xl"
              style={{ background: S.surface, border: `1px solid ${S.line}` }}
            >
              {/* Header */}
              <div className="flex items-start gap-3 p-4 pb-2">
                {item.post.author.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.post.author.avatarUrl}
                    alt={item.post.author.name ?? ""}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: S.surface2, color: S.muted }}
                  >
                    {(item.post.author.name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: S.text }}>
                    {item.post.author.name ?? "Ukjent"}
                  </p>
                  <p className="text-xs" style={{ color: S.subtle }}>
                    i{" "}
                    <Link
                      href={`/${item.post.organization.slug}/feed`}
                      className="transition-colors hover:opacity-80"
                      style={{ color: S.purple }}
                    >
                      {item.post.organization.name}
                    </Link>
                    {" · "}{relativeDate(item.post.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => void removeBookmark(item.post.id)}
                  disabled={removing === item.post.id}
                  className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                  title="Fjern fra lagret"
                >
                  <BookmarkX className="h-4 w-4" style={{ color: S.muted }} />
                </button>
              </div>

              {/* Body */}
              {item.post.content && (
                <div className="px-4 pb-3 text-sm leading-relaxed" style={{ color: S.text }}>
                  <SafeHtml content={item.post.content} />
                </div>
              )}

              {/* Image */}
              {item.post.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.post.imageUrl} alt="" className="w-full max-h-80 object-cover" />
              )}

              {/* Footer */}
              <div className="flex items-center gap-4 border-t px-4 py-2.5 text-xs" style={{ borderColor: S.line, color: S.subtle }}>
                <span className="flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" />
                  {item.post.likeCount}
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {item.post.commentCount}
                </span>
                <span className="ml-auto" style={{ color: S.subtle }}>
                  Lagret {relativeDate(item.bookmarkedAt)}
                </span>
                <Link
                  href={`/${item.post.organization.slug}/feed`}
                  className="flex items-center gap-1 transition-colors hover:opacity-80"
                  style={{ color: S.purple }}
                >
                  Åpne <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
