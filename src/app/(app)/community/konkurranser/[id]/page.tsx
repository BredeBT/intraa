"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trophy, Clock, Users, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { getMockUser } from "@/lib/mock-auth";

interface Contest {
  id: string; title: string; description: string;
  prize: string; prizeColor: string;
  deadline: Date;
  rules: string[];
  category: string;
  status: "active" | "upcoming" | "ended";
}

interface Participant {
  id: string; name: string; initials: string; joinedAt: string;
}

const DEADLINE_C1 = new Date("2026-04-30T23:59:59");
const DEADLINE_C2 = new Date("2026-04-12T23:59:59");
const DEADLINE_C3 = new Date("2026-04-30T23:59:59");
const DEADLINE_C4 = new Date("2026-05-03T23:59:59");
const DEADLINE_C5 = new Date("2026-03-31T23:59:59");

const CONTESTS: Contest[] = [
  {
    id: "c1", title: "Beste open-source bidrag", category: "Kode", status: "active",
    description: "Del ditt beste open-source prosjekt eller bidrag fra siste kvartal. Vinneren kåres av communityet via stemmer. Prosjektet må ha en aktiv commit-historikk og README på norsk eller engelsk.",
    prize: "5 000 kr gavekort", prizeColor: "text-amber-400",
    deadline: DEADLINE_C1,
    rules: ["Prosjektet må være tilgjengelig på GitHub eller GitLab", "Siste commit må være innen de siste 3 månedene", "Du kan maks sende inn ett prosjekt", "Communityet stemmer på vinneren de siste 48 timene", "Bidrag med kjøpt kode eller AI-generert innhold er diskvalifisert"],
  },
  {
    id: "c2", title: "Ukens UI-utfordring", category: "Design", status: "active",
    description: "Bygg en tilgjengelig dato-velger komponent med kun HTML, CSS og vanilla JS. Ingen biblioteker tillatt. Komponenten skal fungere med tastatur og skjermleser.",
    prize: "Feature i nyhetsbrevet", prizeColor: "text-violet-400",
    deadline: DEADLINE_C2,
    rules: ["Kun HTML, CSS og vanilla JavaScript", "Ingen eksterne biblioteker eller rammeverk", "Skal støtte tastaturnavigasjon (Tab, Enter, piltaster)", "Skal ha ARIA-attributter for tilgjengelighet", "Lever inn via CodePen eller lignende"],
  },
  {
    id: "c3", title: "Beste innlegg i april", category: "Community", status: "active",
    description: "Det innlegget med flest genuine likes og engasjement i april vinner. Skriv om noe du er lidenskapelig opptatt av — teknologi, design, produktivitet eller annet.",
    prize: "VIP-status i 3 måneder", prizeColor: "text-blue-400",
    deadline: DEADLINE_C3,
    rules: ["Innlegget må publiseres i april 2026", "Minimum 300 ord", "Likes fra botkontoer teller ikke", "Innlegg som bryter community-reglene diskvalifiseres", "Vinneren kunngjøres 2. mai"],
  },
  {
    id: "c4", title: "Mai-hackathon: AI-verktøy", category: "Hackathon", status: "upcoming",
    description: "Bygg et nyttig AI-drevet verktøy på under 48 timer. Bli med et team på 2–4 personer eller delta alene. Verktøyet skal løse et reelt problem og ha en demo-video.",
    prize: "10 000 kr + mentoring", prizeColor: "text-emerald-400",
    deadline: DEADLINE_C4,
    rules: ["Team på 1–4 personer", "48-timers kodeperiode fra 3. mai kl 09:00", "Prosjektet må bruke minst ett AI-API", "Demo-video på maks 3 minutter kreves", "Kildekode skal være åpent tilgjengelig etter konkurransen"],
  },
  {
    id: "c5", title: "Beste tutorial — mars", category: "Innhold", status: "ended",
    description: "Avsluttet konkurranse. Vinneren var Kari Moe med sin tutorial om tilgjengelige fargepaletter. Tusen takk til alle som deltok!",
    prize: "5 000 kr gavekort", prizeColor: "text-zinc-500",
    deadline: DEADLINE_C5,
    rules: ["Konkurransen er avsluttet"],
  },
];

const ALL_PARTICIPANTS: Record<string, Participant[]> = {
  c1: [
    { id: "p1", name: "Ole Rønning",     initials: "OR", joinedAt: "2 dager siden" },
    { id: "p2", name: "Kari Moe",        initials: "KM", joinedAt: "3 dager siden" },
    { id: "p3", name: "Thomas Kvam",     initials: "TK", joinedAt: "4 dager siden" },
    { id: "p4", name: "Maria Haugen",    initials: "MH", joinedAt: "5 dager siden" },
    { id: "p5", name: "Linn Berg",       initials: "LB", joinedAt: "1 uke siden" },
  ],
  c2: [
    { id: "p1", name: "Thomas Kvam",     initials: "TK", joinedAt: "1 dag siden" },
    { id: "p2", name: "Silje Nygaard",   initials: "SN", joinedAt: "2 dager siden" },
    { id: "p3", name: "Pål Eriksen",     initials: "PE", joinedAt: "3 dager siden" },
  ],
  c3: [
    { id: "p1", name: "Ole Rønning",     initials: "OR", joinedAt: "1 dag siden" },
    { id: "p2", name: "Kari Moe",        initials: "KM", joinedAt: "2 dager siden" },
    { id: "p3", name: "Thomas Kvam",     initials: "TK", joinedAt: "2 dager siden" },
    { id: "p4", name: "Maria Haugen",    initials: "MH", joinedAt: "3 dager siden" },
    { id: "p5", name: "Anders Sørensen", initials: "AS", joinedAt: "3 dager siden" },
    { id: "p6", name: "Linn Berg",       initials: "LB", joinedAt: "4 dager siden" },
  ],
  c4: [
    { id: "p1", name: "Ole Rønning",     initials: "OR", joinedAt: "1 dag siden" },
    { id: "p2", name: "Erik Dahl",       initials: "ED", joinedAt: "2 dager siden" },
  ],
  c5: [
    { id: "p1", name: "Kari Moe",        initials: "KM", joinedAt: "Vinner 🏆" },
    { id: "p2", name: "Ole Rønning",     initials: "OR", joinedAt: "2. plass" },
    { id: "p3", name: "Thomas Kvam",     initials: "TK", joinedAt: "3. plass" },
  ],
};

const CAT_COLORS: Record<string, string> = {
  Kode:      "bg-indigo-500/10 text-indigo-400",
  Design:    "bg-violet-500/10 text-violet-400",
  Community: "bg-pink-500/10 text-pink-400",
  Hackathon: "bg-orange-500/10 text-orange-400",
  Innhold:   "bg-zinc-700/50 text-zinc-400",
};

function useCountdown(deadline: Date) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline.getTime() - Date.now()));

  useEffect(() => {
    if (remaining === 0) return;
    const id = setInterval(() => {
      const left = Math.max(0, deadline.getTime() - Date.now());
      setRemaining(left);
      if (left === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [deadline, remaining]);

  const total = remaining / 1000;
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return { d, h, m, s, expired: remaining === 0 };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 min-w-[64px]">
      <span className="text-2xl font-bold tabular-nums text-white">{String(value).padStart(2, "0")}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

export default function KonkurranseDetalj() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const contest = CONTESTS.find(c => c.id === id);

  const currentUser = getMockUser();
  const [joined, setJoined]             = useState(false);
  const [participants, setParticipants] = useState<Participant[]>(ALL_PARTICIPANTS[id] ?? []);

  const countdown = useCountdown(contest?.deadline ?? new Date());

  if (!contest) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
        <AlertCircle className="h-10 w-10 text-zinc-600" />
        <p className="font-semibold text-zinc-400">Konkurransen ble ikke funnet</p>
        <button onClick={() => router.back()} className="btn-press text-sm text-indigo-400 hover:text-indigo-300">
          ← Tilbake
        </button>
      </div>
    );
  }

  const isEnded = contest.status === "ended";

  function toggleJoin() {
    if (isEnded) return;
    if (joined) {
      setParticipants(prev => prev.filter(p => p.name !== currentUser.name));
    } else {
      setParticipants(prev => [
        ...prev,
        { id: "me", name: currentUser.name, initials: currentUser.initials, joinedAt: "Nettopp" },
      ]);
    }
    setJoined(p => !p);
  }

  return (
    <div className="animate-page mx-auto max-w-2xl px-6 py-8">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="btn-press mb-6 flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Tilbake til konkurranser
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CAT_COLORS[contest.category] ?? ""}`}>
            {contest.category}
          </span>
          {isEnded && (
            <span className="rounded-full bg-zinc-700/50 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
              Avsluttet
            </span>
          )}
        </div>
        <h1 className="mb-3 text-2xl font-bold text-white">{contest.title}</h1>
        <p className="text-sm leading-relaxed text-zinc-400">{contest.description}</p>
      </div>

      {/* Prize + countdown */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Premie</p>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-zinc-500" />
            <span className={`text-base font-semibold ${contest.prizeColor}`}>{contest.prize}</span>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Frist</p>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-300">
              {contest.deadline.toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* Countdown */}
      {!isEnded && (
        <div className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Tid igjen</p>
          {countdown.expired ? (
            <p className="text-sm text-rose-400">Fristen er utløpt</p>
          ) : (
            <div className="flex gap-2">
              <CountdownUnit value={countdown.d} label="dager" />
              <CountdownUnit value={countdown.h} label="timer" />
              <CountdownUnit value={countdown.m} label="min" />
              <CountdownUnit value={countdown.s} label="sek" />
            </div>
          )}
        </div>
      )}

      {/* Rules */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Regler</h2>
        <ul className="flex flex-col gap-2">
          {contest.rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-400">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-500">
                {i + 1}
              </span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Participants */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-semibold text-white">{participants.length} deltakere</h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {participants.length === 0 ? (
            <p className="px-5 py-4 text-sm text-zinc-500">Ingen påmeldte ennå. Bli den første!</p>
          ) : (
            participants.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-5 py-3 transition-colors hover:bg-zinc-900 ${
                  i < participants.length - 1 ? "border-b border-zinc-800" : ""
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
                  {p.initials}
                </div>
                <p className="flex-1 text-sm font-medium text-white">{p.name}</p>
                <span className="text-xs text-zinc-600">{p.joinedAt}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CTA */}
      {!isEnded ? (
        <button
          onClick={toggleJoin}
          className={`btn-press flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-colors ${
            joined
              ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-400 hover:ring-rose-500/30"
              : "bg-violet-600 text-white hover:bg-violet-500"
          }`}
        >
          {joined ? (
            <><CheckCircle className="h-4 w-4" /> Påmeldt — klikk for å trekke deg</>
          ) : (
            "Delta i konkurransen"
          )}
        </button>
      ) : (
        <div className="rounded-xl bg-zinc-800/50 py-3.5 text-center text-sm text-zinc-500">
          Konkurransen er avsluttet
        </div>
      )}
    </div>
  );
}
