"use client";

const ME = "Anders Sørensen";

interface Member {
  rank: number; name: string; initials: string; points: number;
  posts: number; comments: number; likesReceived: number;
  badge: string; badgeColor: string;
}

const LEADERBOARD: Member[] = [
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
];

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function RangeringPage() {
  const me = LEADERBOARD.find(m => m.name === ME)!;
  return (
    <div className="px-8 py-8">
      <h1 className="mb-2 text-xl font-semibold text-white">Rangering</h1>
      <p className="mb-8 text-sm text-zinc-500">Topp 10 bidragsytere i communityet</p>

      <div className="mb-6 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
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
          {[["Innlegg", me.posts], ["Kommentarer", me.comments], ["Likes mottatt", me.likesReceived]].map(([label, val]) => (
            <div key={label} className="rounded-lg bg-zinc-900 py-2">
              <p className="font-bold text-white">{val}</p>
              <p className="text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-4 py-3 text-left font-medium text-zinc-500">#</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Medlem</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500 hidden sm:table-cell">Badge</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-500">Poeng</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-500 hidden md:table-cell">Innlegg</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-500 hidden md:table-cell">Likes</th>
            </tr>
          </thead>
          <tbody className="bg-zinc-950">
            {LEADERBOARD.map((member, i) => {
              const isMe = member.name === ME;
              return (
                <tr key={member.rank} className={`transition-colors ${isMe ? "bg-violet-500/5 hover:bg-violet-500/10" : "hover:bg-zinc-900"} ${i < LEADERBOARD.length - 1 ? "border-b border-zinc-800" : ""}`}>
                  <td className="px-4 py-3.5"><span className="text-base">{MEDAL[member.rank] ?? member.rank}</span></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${isMe ? "bg-violet-600" : "bg-zinc-700"}`}>{member.initials}</div>
                      <span className={`font-medium ${isMe ? "text-violet-300" : "text-white"}`}>{member.name}{isMe && " (deg)"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${member.badgeColor}`}>{member.badge}</span></td>
                  <td className="px-4 py-3.5 text-right font-semibold text-white">{member.points.toLocaleString("no-NO")}</td>
                  <td className="px-4 py-3.5 text-right text-zinc-400 hidden md:table-cell">{member.posts}</td>
                  <td className="px-4 py-3.5 text-right text-zinc-400 hidden md:table-cell">{member.likesReceived}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
