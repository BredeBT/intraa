"use client";

import { useState } from "react";

type Tab = "uke" | "maned" | "alltid";

const ME = "Anders Sørensen";

interface Member {
  rank: number; name: string; initials: string; points: number;
  posts: number; comments: number; likesReceived: number;
  badge: string; badgeColor: string;
}

const DATA: Record<Tab, Member[]> = {
  uke: [
    { rank: 1, name: "Kari Moe",        initials: "KM", points: 340, posts: 8, comments: 21, likesReceived: 54, badge: "🔥 Ukens stjerne", badgeColor: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
    { rank: 2, name: "Anders Sørensen", initials: "AS", points: 280, posts: 6, comments: 18, likesReceived: 41, badge: "🚀 Aktiv",          badgeColor: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
    { rank: 3, name: "Ole Rønning",     initials: "OR", points: 210, posts: 5, comments: 14, likesReceived: 33, badge: "⭐ Solid",           badgeColor: "bg-violet-500/15 text-violet-400 border border-violet-500/30" },
    { rank: 4, name: "Maria Haugen",    initials: "MH", points: 170, posts: 4, comments: 11, likesReceived: 27, badge: "💬 God",             badgeColor: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
    { rank: 5, name: "Thomas Kvam",     initials: "TK", points: 140, posts: 3, comments: 9,  likesReceived: 22, badge: "📝 Skribent",        badgeColor: "bg-zinc-700/50 text-zinc-400" },
    { rank: 6, name: "Linn Berg",       initials: "LB", points: 110, posts: 3, comments: 7,  likesReceived: 18, badge: "🌱 Ivrig",           badgeColor: "bg-zinc-700/50 text-zinc-400" },
    { rank: 7, name: "Silje Nygaard",   initials: "SN", points: 80,  posts: 2, comments: 5,  likesReceived: 12, badge: "💡 Kreativ",         badgeColor: "bg-zinc-700/50 text-zinc-400" },
  ],
  maned: [
    { rank: 1, name: "Ole Rønning",     initials: "OR", points: 1420, posts: 18, comments: 54, likesReceived: 142, badge: "👑 Månedens best", badgeColor: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
    { rank: 2, name: "Kari Moe",        initials: "KM", points: 1110, posts: 14, comments: 41, likesReceived: 108, badge: "⭐ VIP",            badgeColor: "bg-violet-500/15 text-violet-400 border border-violet-500/30" },
    { rank: 3, name: "Thomas Kvam",     initials: "TK", points: 890,  posts: 11, comments: 34, likesReceived: 87,  badge: "🔥 På vei opp",    badgeColor: "bg-orange-500/15 text-orange-400 border border-orange-500/30" },
    { rank: 4, name: "Anders Sørensen", initials: "AS", points: 720,  posts: 9,  comments: 28, likesReceived: 69,  badge: "🚀 Aktiv",          badgeColor: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
    { rank: 5, name: "Maria Haugen",    initials: "MH", points: 590,  posts: 7,  comments: 23, likesReceived: 54,  badge: "💬 God",            badgeColor: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
    { rank: 6, name: "Linn Berg",       initials: "LB", points: 440,  posts: 5,  comments: 18, likesReceived: 41,  badge: "📝 Skribent",       badgeColor: "bg-zinc-700/50 text-zinc-400" },
    { rank: 7, name: "Silje Nygaard",   initials: "SN", points: 340,  posts: 4,  comments: 14, likesReceived: 32,  badge: "💡 Kreativ",        badgeColor: "bg-zinc-700/50 text-zinc-400" },
  ],
  alltid: [
    { rank: 1,  name: "Ole Rønning",     initials: "OR", points: 4820, posts: 48, comments: 132, likesReceived: 387, badge: "👑 Topp bidragsyter", badgeColor: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
    { rank: 2,  name: "Kari Moe",        initials: "KM", points: 3610, posts: 35, comments: 98,  likesReceived: 271, badge: "⭐ VIP",               badgeColor: "bg-violet-500/15 text-violet-400 border border-violet-500/30" },
    { rank: 3,  name: "Thomas Kvam",     initials: "TK", points: 2940, posts: 29, comments: 87,  likesReceived: 198, badge: "🔥 På vei opp",        badgeColor: "bg-orange-500/15 text-orange-400 border border-orange-500/30" },
    { rank: 4,  name: "Maria Haugen",    initials: "MH", points: 2310, posts: 22, comments: 76,  likesReceived: 154, badge: "💬 God samtaler",      badgeColor: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
    { rank: 5,  name: "Anders Sørensen", initials: "AS", points: 1870, posts: 18, comments: 64,  likesReceived: 112, badge: "🚀 Aktiv bidragsyter", badgeColor: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
    { rank: 6,  name: "Linn Berg",       initials: "LB", points: 1540, posts: 15, comments: 53,  likesReceived: 89,  badge: "📝 Flittig skribent",  badgeColor: "bg-zinc-700/50 text-zinc-400" },
    { rank: 7,  name: "Pål Eriksen",     initials: "PE", points: 1230, posts: 12, comments: 41,  likesReceived: 67,  badge: "🌱 Ny og ivrig",       badgeColor: "bg-zinc-700/50 text-zinc-400" },
    { rank: 8,  name: "Silje Nygaard",   initials: "SN", points: 980,  posts: 9,  comments: 35,  likesReceived: 54,  badge: "🎯 Målrettet",         badgeColor: "bg-zinc-700/50 text-zinc-400" },
    { rank: 9,  name: "Erik Dahl",       initials: "ED", points: 760,  posts: 7,  comments: 28,  likesReceived: 41,  badge: "💡 Kreativ",           badgeColor: "bg-zinc-700/50 text-zinc-400" },
    { rank: 10, name: "Nina Strand",     initials: "NS", points: 610,  posts: 6,  comments: 21,  likesReceived: 33,  badge: "👋 På vei",            badgeColor: "bg-zinc-700/50 text-zinc-400" },
  ],
};

const TABS: { id: Tab; label: string }[] = [
  { id: "uke",    label: "Denne uken" },
  { id: "maned",  label: "Denne måneden" },
  { id: "alltid", label: "Alle tider" },
];

const PODIUM_STYLE = {
  1: { bg: "bg-amber-500/10",  ring: "ring-amber-500/40",  avatar: "bg-amber-500",  medal: "🥇", height: "h-24" },
  2: { bg: "bg-zinc-800/60",   ring: "ring-zinc-600/40",   avatar: "bg-zinc-600",   medal: "🥈", height: "h-16" },
  3: { bg: "bg-orange-500/10", ring: "ring-orange-500/40", avatar: "bg-orange-700", medal: "🥉", height: "h-12" },
} as const;

export default function RangeringPage() {
  const [tab, setTab] = useState<Tab>("alltid");
  const board = DATA[tab];
  const me    = board.find(m => m.name === ME);

  // Top 3 in podium order: 2nd, 1st, 3rd
  const podium = [board[1], board[0], board[2]].filter(Boolean);

  return (
    <div className="animate-page px-8 py-8">
      <h1 className="mb-2 text-xl font-semibold text-white">Rangering</h1>
      <p className="mb-6 text-sm text-zinc-500">Topp bidragsytere i communityet</p>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`btn-press flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Podium — top 3 */}
      <div className="mb-10 flex items-end justify-center gap-4">
        {podium.map(member => {
          const s = PODIUM_STYLE[member.rank as 1 | 2 | 3];
          return (
            <div key={member.rank} className="flex flex-col items-center gap-3">
              <span className="text-xs font-semibold text-zinc-400">{member.points.toLocaleString("no-NO")} p</span>
              <div className={`flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ${s.avatar} ${s.ring}`}>
                {member.initials}
              </div>
              <p className="max-w-[80px] text-center text-xs font-medium text-white leading-tight">{member.name}</p>
              <div className={`w-20 rounded-t-xl ${s.bg} ring-1 ${s.ring} flex flex-col items-center justify-end pb-3 ${s.height}`}>
                <span className="text-2xl">{s.medal}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranks 4+ */}
      <div className="mb-6 overflow-hidden rounded-xl border border-zinc-800">
        {board.slice(3).map((member, i) => {
          const isMe = member.name === ME;
          return (
            <div
              key={member.rank}
              className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                isMe ? "bg-violet-500/5" : "hover:bg-zinc-900"
              } ${i < board.slice(3).length - 1 ? "border-b border-zinc-800" : ""}`}
            >
              <span className="w-6 text-sm font-semibold text-zinc-500">{member.rank}</span>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${isMe ? "bg-violet-600" : "bg-zinc-700"}`}>
                {member.initials}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isMe ? "text-violet-300" : "text-white"}`}>
                  {member.name}{isMe && " (deg)"}
                </p>
              </div>
              <span className={`hidden rounded-full px-2 py-0.5 text-xs font-medium sm:inline-block ${member.badgeColor}`}>
                {member.badge}
              </span>
              <span className="text-sm font-semibold text-white">{member.points.toLocaleString("no-NO")}</span>
            </div>
          );
        })}
      </div>

      {/* Own position — always visible */}
      {me && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 ring-1 ring-violet-500/20">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-400">Din plassering</p>
          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold text-white">#{me.rank}</span>
            <div className="flex-1">
              <p className="font-semibold text-white">{me.name}</p>
              <p className="text-sm text-zinc-400">{me.points.toLocaleString("no-NO")} poeng</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${me.badgeColor}`}>{me.badge}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
            {([["Innlegg", me.posts], ["Kommentarer", me.comments], ["Likes", me.likesReceived]] as [string, number][]).map(([label, val]) => (
              <div key={label} className="rounded-lg bg-zinc-900 py-2">
                <p className="font-bold text-white">{val}</p>
                <p className="text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
