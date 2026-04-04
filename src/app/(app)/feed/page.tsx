"use client";

import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";

const initialPosts = [
  {
    id: 1,
    initials: "AS",
    name: "Anders Sørensen",
    timestamp: "2 timer siden",
    content:
      "Hei alle sammen! Vi har nettopp lansert den nye onboarding-prosessen. Ta en titt og gi tilbakemelding 🙌",
    comments: 3,
  },
  {
    id: 2,
    initials: "MH",
    name: "Maria Haugen",
    timestamp: "4 timer siden",
    content:
      "Påminnelse: Allmøte fredag kl. 10:00 i store møterom. Husk å melde deg på i kalenderen.",
    comments: 1,
  },
  {
    id: 3,
    initials: "TK",
    name: "Thomas Kvam",
    timestamp: "I går",
    content:
      "Delte noen notater fra designworkshopen i går. Finn dem under Filer → Design → 2026.",
    comments: 5,
  },
];

export default function FeedPage() {
  const [liked, setLiked] = useState<Record<number, boolean>>({});

  function toggleLike(id: number) {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Compose box */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            DU
          </div>
          <div className="flex-1 rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-zinc-500 cursor-text">
            Skriv noe…
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="flex flex-col gap-4">
        {initialPosts.map((post) => (
          <article
            key={post.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-semibold text-white">
                {post.initials}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{post.name}</p>
                <p className="text-xs text-zinc-500">{post.timestamp}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{post.content}</p>
            <div className="mt-4 flex items-center gap-5 border-t border-zinc-800 pt-3">
              <button
                onClick={() => toggleLike(post.id)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  liked[post.id]
                    ? "text-rose-400"
                    : "text-zinc-500 hover:text-rose-400"
                }`}
              >
                <Heart
                  className="h-4 w-4"
                  fill={liked[post.id] ? "currentColor" : "none"}
                />
                {liked[post.id] ? "Likt" : "Lik"}
              </button>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <MessageCircle className="h-4 w-4" />
                {post.comments} kommentarer
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
