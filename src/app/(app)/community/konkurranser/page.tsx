"use client";

import { useState } from "react";
import { Trophy, Users, Clock, CheckCircle } from "lucide-react";

interface Contest {
  id: string; title: string; description: string; prize: string;
  prizeColor: string; deadline: string; daysLeft: number;
  participants: number; status: "active" | "upcoming" | "ended"; category: string;
}

const INITIAL_CONTESTS: Contest[] = [
  { id: "c1", title: "Beste open-source bidrag", description: "Del ditt beste open-source prosjekt eller bidrag fra siste kvartal. Vinneren kåres av communityet via stemmer.", prize: "5 000 kr gavekort", prizeColor: "text-amber-400", deadline: "30. april 2026", daysLeft: 26, participants: 14, status: "active", category: "Kode" },
  { id: "c2", title: "Ukens UI-utfordring", description: "Bygg en tilgjengelig dato-velger komponent med kun HTML, CSS og vanilla JS. Ingen biblioteker.", prize: "Feature i nyhetsbrevet", prizeColor: "text-violet-400", deadline: "12. april 2026", daysLeft: 8, participants: 23, status: "active", category: "Design" },
  { id: "c3", title: "Beste innlegg i april", description: "Det innlegget med flest genuine likes og engasjement i april vinner. Skriv om noe du er lidenskapelig opptatt av.", prize: "VIP-status i 3 måneder", prizeColor: "text-blue-400", deadline: "30. april 2026", daysLeft: 26, participants: 41, status: "active", category: "Community" },
  { id: "c4", title: "Mai-hackathon: AI-verktøy", description: "Bygg et nyttig AI-drevet verktøy på under 48 timer. Bli med et team eller delta alene. Mer info kommer.", prize: "10 000 kr + mentoring", prizeColor: "text-emerald-400", deadline: "3. mai 2026", daysLeft: 29, participants: 8, status: "upcoming", category: "Hackathon" },
  { id: "c5", title: "Beste tutorial — mars", description: "Avsluttet konkurranse. Vinneren var Kari Moe med sin tutorial om tilgjengelige fargepaletter.", prize: "5 000 kr gavekort", prizeColor: "text-zinc-500", deadline: "31. mars 2026", daysLeft: 0, participants: 19, status: "ended", category: "Innhold" },
];

const STATUS_CONFIG = {
  active:   { label: "Aktiv",     style: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" },
  upcoming: { label: "Kommende",  style: "bg-blue-500/10 text-blue-400 border border-blue-500/30" },
  ended:    { label: "Avsluttet", style: "bg-zinc-700/50 text-zinc-500" },
};

const CAT_COLORS: Record<string, string> = {
  Kode: "bg-indigo-500/10 text-indigo-400", Design: "bg-violet-500/10 text-violet-400",
  Community: "bg-pink-500/10 text-pink-400", Hackathon: "bg-orange-500/10 text-orange-400",
  Innhold: "bg-zinc-700/50 text-zinc-400",
};

export default function KonkurranserPage() {
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [contests, setContests] = useState<Contest[]>(INITIAL_CONTESTS);

  function toggleJoin(id: string) {
    const joining = !joined[id];
    setJoined(prev => ({ ...prev, [id]: joining }));
    setContests(prev => prev.map(c => c.id === id ? { ...c, participants: c.participants + (joining ? 1 : -1) } : c));
  }

  function ContestCard({ contest }: { contest: Contest }) {
    const isEnded = contest.status === "ended";
    return (
      <div className={`flex flex-col rounded-2xl border bg-zinc-900 p-5 transition-colors ${isEnded ? "border-zinc-800 opacity-60" : "border-zinc-800 hover:border-zinc-700"}`}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CONFIG[contest.status].style}`}>{STATUS_CONFIG[contest.status].label}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CAT_COLORS[contest.category] ?? ""}`}>{contest.category}</span>
          </div>
          {!isEnded && <div className="flex items-center gap-1 shrink-0 text-xs text-zinc-500"><Clock className="h-3.5 w-3.5" />{contest.daysLeft}d igjen</div>}
        </div>
        <h3 className="mb-1.5 text-base font-semibold text-white">{contest.title}</h3>
        <p className="mb-4 flex-1 text-sm leading-relaxed text-zinc-400">{contest.description}</p>
        <div className="mb-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5"><Trophy className="h-4 w-4 text-zinc-500" /><span className={`font-medium ${contest.prizeColor}`}>{contest.prize}</span></div>
          <div className="flex items-center gap-1.5 text-zinc-500"><Users className="h-3.5 w-3.5" />{contest.participants} deltakere</div>
        </div>
        {!isEnded ? (
          <button onClick={() => toggleJoin(contest.id)} className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${joined[contest.id] ? "bg-emerald-500/10 text-emerald-400 hover:bg-rose-500/10 hover:text-rose-400" : "bg-violet-600 text-white hover:bg-violet-500"}`}>
            {joined[contest.id] ? <><CheckCircle className="h-4 w-4" /> Påmeldt — klikk for å melde av</> : "Delta"}
          </button>
        ) : (
          <div className="rounded-xl bg-zinc-800/50 py-2.5 text-center text-sm text-zinc-500">Konkurransen er avsluttet</div>
        )}
      </div>
    );
  }

  const active   = contests.filter(c => c.status === "active");
  const upcoming = contests.filter(c => c.status === "upcoming");
  const ended    = contests.filter(c => c.status === "ended");

  return (
    <div className="px-8 py-8">
      <h1 className="mb-1 text-xl font-semibold text-white">Konkurranser</h1>
      <p className="mb-8 text-sm text-zinc-500">Delta, vis hva du kan og vinn premier</p>
      {active.length > 0 && <section className="mb-8"><h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">Aktive</h2><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{active.map(c => <ContestCard key={c.id} contest={c} />)}</div></section>}
      {upcoming.length > 0 && <section className="mb-8"><h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">Kommende</h2><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{upcoming.map(c => <ContestCard key={c.id} contest={c} />)}</div></section>}
      {ended.length > 0 && <section><h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">Avsluttede</h2><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{ended.map(c => <ContestCard key={c.id} contest={c} />)}</div></section>}
    </div>
  );
}
