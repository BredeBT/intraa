"use client";

import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import type { PostWithAuthor } from "@/lib/types";
import SafeHtml from "@/components/SafeHtml";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function relativeTime(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} time${hours !== 1 ? "r" : ""} siden`;
  return "I går";
}

export default function PostList({ posts }: { posts: PostWithAuthor[] }) {
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  function toggleLike(id: string) {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
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
          <div className="mt-3 text-sm leading-relaxed text-zinc-300"><SafeHtml content={post.content} /></div>
          <div className="mt-4 flex items-center gap-5 border-t border-zinc-800 pt-3">
            <button
              onClick={() => toggleLike(post.id)}
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
  );
}
