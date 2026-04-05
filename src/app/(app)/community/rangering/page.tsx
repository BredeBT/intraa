import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { getUserOrg } from "@/server/getUserOrg";
import { db } from "@/server/db";

const PODIUM_STYLE = {
  0: { bg: "bg-amber-500/10",  ring: "ring-amber-500/40",  avatar: "bg-amber-500",  medal: "🥇", height: "h-24" },
  1: { bg: "bg-zinc-800/60",   ring: "ring-zinc-600/40",   avatar: "bg-zinc-600",   medal: "🥈", height: "h-16" },
  2: { bg: "bg-orange-500/10", ring: "ring-orange-500/40", avatar: "bg-orange-700", medal: "🥉", height: "h-12" },
} as const;

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function RangeringPage() {
  const ctx = await getUserOrg();
  if (!ctx) redirect("/login");

  const memberships = await db.membership.findMany({
    where:   { organizationId: ctx.organizationId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { points: "desc" },
  });

  const board = memberships.map((m, i) => ({
    rank:   i + 1,
    userId: m.userId,
    name:   m.user.name ?? "Ukjent",
    points: m.points,
    isMe:   m.userId === ctx.userId,
  }));

  const top3   = [board[1], board[0], board[2]].filter(Boolean);  // podium: 2nd, 1st, 3rd
  const rest   = board.slice(3);
  const myRow  = board.find((m) => m.isMe);

  return (
    <div className="px-8 py-8">
      <h1 className="mb-1 text-xl font-semibold text-white">Rangering</h1>
      <p className="mb-6 text-sm text-zinc-500">Topp bidragsytere i communityet</p>

      {board.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
          <Trophy className="mb-3 h-10 w-10" />
          <p className="text-sm">Ingen rangering ennå.</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length >= 1 && (
            <div className="mb-10 flex items-end justify-center gap-4">
              {top3.map((member, idx) => {
                // top3 is [2nd, 1st, 3rd] — idx 0=silver, 1=gold, 2=bronze
                const styleKey = idx as 0 | 1 | 2;
                const s = PODIUM_STYLE[styleKey];
                return (
                  <div key={member.userId} className="flex flex-col items-center gap-3">
                    <span className="text-xs font-semibold text-zinc-400">{member.points.toLocaleString("no-NO")} p</span>
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ${s.avatar} ${s.ring}`}>
                      {initials(member.name)}
                    </div>
                    <p className="max-w-[80px] text-center text-xs font-medium leading-tight text-white">{member.name}</p>
                    <div className={`flex w-20 flex-col items-center justify-end rounded-t-xl pb-3 ring-1 ${s.bg} ${s.ring} ${s.height}`}>
                      <span className="text-2xl">{s.medal}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rest */}
          {rest.length > 0 && (
            <div className="mb-6 overflow-hidden rounded-xl border border-zinc-800">
              {rest.map((member, i) => (
                <div
                  key={member.userId}
                  className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                    member.isMe ? "bg-violet-500/5" : "hover:bg-zinc-900"
                  } ${i < rest.length - 1 ? "border-b border-zinc-800" : ""}`}
                >
                  <span className="w-6 text-sm font-semibold text-zinc-500">{member.rank}</span>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${member.isMe ? "bg-violet-600" : "bg-zinc-700"}`}>
                    {initials(member.name)}
                  </div>
                  <p className={`flex-1 text-sm font-medium ${member.isMe ? "text-violet-300" : "text-white"}`}>
                    {member.name}{member.isMe && " (deg)"}
                  </p>
                  <span className="text-sm font-semibold text-white">{member.points.toLocaleString("no-NO")}</span>
                </div>
              ))}
            </div>
          )}

          {/* My position */}
          {myRow && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 ring-1 ring-violet-500/20">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-400">Din plassering</p>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-white">#{myRow.rank}</span>
                <div className="flex-1">
                  <p className="font-semibold text-white">{myRow.name}</p>
                  <p className="text-sm text-zinc-400">{myRow.points.toLocaleString("no-NO")} poeng</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
