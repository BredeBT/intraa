import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { getUserOrg } from "@/server/getUserOrg";
import { db } from "@/server/db";
import { checkFeature } from "@/server/checkFeature";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Avatar({ name, avatarUrl, size = "md", ring }: { name: string; avatarUrl: string | null; size?: "sm" | "md" | "lg"; ring?: string }) {
  const dims = size === "lg" ? "h-16 w-16 text-base" : size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={`${dims} rounded-full object-cover shrink-0 ${ring ?? ""}`}
      />
    );
  }
  return (
    <div className={`${dims} rounded-full bg-violet-700 flex items-center justify-center font-bold text-white shrink-0 ${ring ?? ""}`}>
      {initials(name)}
    </div>
  );
}

const PODIUM = [
  { label: "2.", medalColor: "text-zinc-400", barH: "h-20", barBg: "bg-zinc-700/50", ring: "ring-2 ring-zinc-500/60" },
  { label: "1.", medalColor: "text-amber-400", barH: "h-28", barBg: "bg-amber-500/20", ring: "ring-2 ring-amber-500/60" },
  { label: "3.", medalColor: "text-orange-400", barH: "h-14", barBg: "bg-orange-700/20", ring: "ring-2 ring-orange-600/50" },
] as const;

export default async function RangeringPage() {
  await checkFeature("community_leaderboard");
  const ctx = await getUserOrg();
  if (!ctx) redirect("/login");

  const memberships = await db.membership.findMany({
    where:   { organizationId: ctx.organizationId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { points: "desc" },
    take:    100,
  });

  const board = memberships.map((m, i) => ({
    rank:      i + 1,
    userId:    m.userId,
    name:      m.user.name ?? "Ukjent",
    avatarUrl: m.user.avatarUrl,
    points:    m.points,
    isMe:      m.userId === ctx.userId,
  }));

  // Podium: centre=1st, left=2nd, right=3rd
  const podiumOrder = [board[1], board[0], board[2]].filter(Boolean) as typeof board;
  const rest  = board.slice(3);
  const myRow = board.find((m) => m.isMe);

  return (
    <div className="min-h-screen bg-[#0d0d14] px-4 py-8 md:px-8">
      <h1 className="mb-1 text-xl font-semibold text-white">Rangering</h1>
      <p className="mb-8 text-sm text-zinc-500">Topp bidragsytere i communityet</p>

      {board.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
          <Trophy className="mb-3 h-10 w-10" />
          <p className="text-sm">Ingen rangering ennå.</p>
        </div>
      ) : (
        <>
          {/* ── Podium ── */}
          {podiumOrder.length >= 1 && (
            <div className="mb-10 flex items-end justify-center gap-4">
              {podiumOrder.map((member, idx) => {
                const s = PODIUM[idx];
                return (
                  <div key={member.userId} className="flex flex-col items-center gap-2">
                    <span className={`text-xs font-bold ${s.medalColor}`}>{s.label}</span>
                    <p className="max-w-[80px] text-center text-xs font-medium leading-tight text-white truncate">{member.name}</p>
                    <Avatar name={member.name} avatarUrl={member.avatarUrl} size="lg" ring={s.ring} />
                    <span className="text-xs text-zinc-400">{member.points.toLocaleString("nb-NO")} p</span>
                    <div className={`w-20 rounded-t-xl ${s.barH} ${s.barBg} border border-white/5`} />
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Rest of the list ── */}
          {rest.length > 0 && (
            <div className="mb-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#12121e]">
              {rest.map((member, i) => (
                <div
                  key={member.userId}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    member.isMe ? "bg-violet-500/10" : "hover:bg-white/[0.03]"
                  } ${i < rest.length - 1 ? "border-b border-white/[0.04]" : ""}`}
                >
                  <span className="w-7 text-sm font-semibold text-zinc-500 text-right">{member.rank}</span>
                  <Avatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />
                  <p className={`flex-1 text-sm font-medium ${member.isMe ? "text-violet-300" : "text-white"}`}>
                    {member.name}{member.isMe && <span className="ml-1.5 text-xs text-violet-500">(deg)</span>}
                  </p>
                  <span className="text-sm font-semibold text-white">{member.points.toLocaleString("nb-NO")}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── My position ── */}
          {myRow && myRow.rank > 3 && (
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-400">Din plassering</p>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-white">#{myRow.rank}</span>
                <Avatar name={myRow.name} avatarUrl={myRow.avatarUrl} size="md" />
                <div className="flex-1">
                  <p className="font-semibold text-white">{myRow.name}</p>
                  <p className="text-sm text-zinc-400">{myRow.points.toLocaleString("nb-NO")} poeng</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
