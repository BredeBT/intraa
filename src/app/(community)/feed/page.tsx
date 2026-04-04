"use client";

import { useState } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";

type MemberRole = "Eier" | "Moderator" | "VIP" | "Medlem";

const ROLE_STYLES: Record<MemberRole, string> = {
  Eier:       "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  Moderator:  "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  VIP:        "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  Medlem:     "bg-zinc-700/50 text-zinc-400",
};

interface Post {
  id: string;
  author: string;
  role: MemberRole;
  initials: string;
  time: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
}

const INITIAL_POSTS: Post[] = [
  {
    id: "p1",
    author: "Ole Rønning",
    role: "Eier",
    initials: "OR",
    time: "1 time siden",
    content: "Velkommen til Intraa Community! 🎉 Vi er så glade for å ha dere alle her. Del prosjektene deres, still spørsmål og hjelp hverandre frem. La oss bygge noe stort sammen!",
    likes: 42,
    comments: 12,
    shares: 8,
  },
  {
    id: "p2",
    author: "Kari Moe",
    role: "VIP",
    initials: "KM",
    time: "3 timer siden",
    content: "Nettopp lansert min nye open-source side-project! Et bibliotek for å generere tilgjengelige fargepaletter basert på WCAG 2.1-standardene. Sjekk det ut og gi gjerne en star ⭐",
    image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&q=80",
    likes: 31,
    comments: 7,
    shares: 5,
  },
  {
    id: "p3",
    author: "Thomas Kvam",
    role: "Moderator",
    initials: "TK",
    time: "I går",
    content: "Tips til alle som jobber med Next.js App Router: bruk React Server Components for alt som ikke trenger interaktivitet. Ytelsesforskjellen er enorm, spesielt på mobile enheter. Glad for å svare på spørsmål! 🚀",
    likes: 19,
    comments: 4,
    shares: 11,
  },
  {
    id: "p4",
    author: "Linn Berg",
    role: "Medlem",
    initials: "LB",
    time: "I går",
    content: "Er det noen her som har erfaring med å migrere fra Prisma v4 til v7? Støtte på noen knipe med den nye konfigurasjonsfilen 😅",
    likes: 5,
    comments: 9,
    shares: 0,
  },
];

export default function CommunityFeedPage() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  function toggleLike(id: string) {
    setLiked(prev => ({ ...prev, [id]: !prev[id] }));
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, likes: p.likes + (liked[id] ? -1 : 1) } : p
    ));
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Compose */}
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white">
            DU
          </div>
          <div className="flex-1 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm text-zinc-500 cursor-text">
            Del noe med communityet…
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="flex flex-col gap-5">
        {posts.map(post => (
          <article key={post.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            {/* Author */}
            <div className="flex items-center gap-3 px-5 pt-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-semibold text-white">
                {post.initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{post.author}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[post.role]}`}>
                    {post.role}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{post.time}</p>
              </div>
            </div>

            {/* Content */}
            <p className="mt-3 px-5 text-sm leading-relaxed text-zinc-300">{post.content}</p>

            {/* Image */}
            {post.image && (
              <div className="mt-4 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.image} alt="" className="h-56 w-full object-cover" />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-5 border-t border-zinc-800 px-5 py-3 mt-3">
              <button
                onClick={() => toggleLike(post.id)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  liked[post.id] ? "text-rose-400" : "text-zinc-500 hover:text-rose-400"
                }`}
              >
                <Heart className="h-4 w-4" fill={liked[post.id] ? "currentColor" : "none"} />
                {post.likes}
              </button>
              <button className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-white">
                <MessageCircle className="h-4 w-4" />
                {post.comments}
              </button>
              <button className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-white">
                <Share2 className="h-4 w-4" />
                {post.shares}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
