"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Send, Heart, MessageCircle } from "lucide-react";
import { createPost } from "@/server/actions/posts";
import type { PostWithAuthor } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function relativeTime(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} time${hours !== 1 ? "r" : ""} siden`;
  return "I går";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialPosts: PostWithAuthor[];
  orgId:        string;
  userName:     string;
  userId:       string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedClient({ initialPosts, orgId, userName, userId }: Props) {
  const [posts,     setPosts]     = useState<PostWithAuthor[]>(initialPosts);
  const [open,      setOpen]      = useState(false);
  const [content,   setContent]   = useState("");
  const [isPending, startTransition] = useTransition();
  const [liked,     setLiked]     = useState<Record<string, boolean>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const userInitials = initials(userName || "?");

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  function handleSubmit() {
    const text = content.trim();
    if (!text || isPending) return;

    // Optimistic post
    const optimistic: PostWithAuthor = {
      id:        `opt-${Date.now()}`,
      content:   text,
      createdAt: new Date(),
      orgId,
      authorId:  userId,
      author:    { id: userId, name: userName, email: "", avatarUrl: null, createdAt: new Date() },
      comments:  [],
    };

    setPosts((prev) => [optimistic, ...prev]);
    setContent("");
    setOpen(false);

    startTransition(async () => {
      try {
        const saved = await createPost(orgId, text);
        setPosts((prev) => prev.map((p) => (p.id === optimistic.id ? saved : p)));
      } catch {
        setPosts((prev) => prev.filter((p) => p.id !== optimistic.id));
      }
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
    if (e.key === "Escape") { setOpen(false); setContent(""); }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Feed</h1>

      {/* Compose box */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            {userInitials}
          </div>

          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="flex-1 rounded-lg bg-zinc-800 px-4 py-2.5 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-400"
            >
              Skriv noe…
            </button>
          ) : (
            <div className="flex flex-1 flex-col gap-3">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKey}
                rows={3}
                placeholder="Hva vil du dele med teamet?"
                className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600">⌘↵ for å sende · Esc for å avbryte</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setContent(""); }}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!content.trim() || isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isPending ? "Sender…" : "Del"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post list */}
      {posts.length === 0 ? (
        <p className="text-center text-sm text-zinc-600">
          Ingen innlegg ennå – vær den første til å poste!
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <article key={post.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-semibold text-white">
                  {initials(post.author.name ?? "")}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{post.author.name ?? ""}</p>
                  <p className="text-xs text-zinc-500">{relativeTime(post.createdAt)}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">{post.content}</p>
              <div className="mt-4 flex items-center gap-5 border-t border-zinc-800 pt-3">
                <button
                  onClick={() => setLiked((p) => ({ ...p, [post.id]: !p[post.id] }))}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${
                    liked[post.id] ? "text-rose-400" : "text-zinc-500 hover:text-rose-400"
                  }`}
                >
                  <Heart className="h-4 w-4" fill={liked[post.id] ? "currentColor" : "none"} />
                  {liked[post.id] ? "Likt" : "Lik"}
                </button>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <MessageCircle className="h-4 w-4" />
                  {post.comments.length} kommentarer
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
