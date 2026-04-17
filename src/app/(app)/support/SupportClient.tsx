"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LifeBuoy, Plus, X } from "lucide-react";

type Status = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";

const STATUS_LABELS: Record<Status, string> = {
  OPEN:        "Åpen",
  IN_PROGRESS: "Under arbeid",
  WAITING:     "Venter",
  RESOLVED:    "Løst",
  CLOSED:      "Lukket",
};

const STATUS_STYLES: Record<Status, string> = {
  OPEN:        "bg-yellow-500/10 text-yellow-400",
  IN_PROGRESS: "bg-blue-500/10 text-blue-400",
  WAITING:     "bg-orange-500/10 text-orange-400",
  RESOLVED:    "bg-emerald-500/10 text-emerald-400",
  CLOSED:      "bg-zinc-700/50 text-zinc-500",
};

const SUPPORT_CATEGORIES = ["Teknisk problem", "Faktura", "Funksjonalitet", "Annet"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

interface Ticket {
  id:         string;
  title:      string;
  status:     Status;
  replyCount: number;
  createdAt:  string;
}

interface Props {
  activeTickets:   Ticket[];
  resolvedTickets: Ticket[];
}

function TicketTable({ tickets }: { tickets: Ticket[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Tittel</th>
            <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
            <th className="hidden px-5 py-3 text-left text-xs font-medium text-zinc-500 md:table-cell">Svar</th>
            <th className="hidden px-5 py-3 text-left text-xs font-medium text-zinc-500 md:table-cell">Dato</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="bg-zinc-950">
          {tickets.map((ticket, i) => (
            <tr
              key={ticket.id}
              className={`transition-colors hover:bg-zinc-900 ${i < tickets.length - 1 ? "border-b border-zinc-800" : ""}`}
            >
              <td className="px-5 py-4 font-medium text-white">
                <span className="line-clamp-1">{ticket.title}</span>
              </td>
              <td className="px-5 py-4">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
                  {STATUS_LABELS[ticket.status]}
                </span>
              </td>
              <td className="hidden px-5 py-4 text-xs text-zinc-400 md:table-cell">
                {ticket.replyCount > 0 ? `${ticket.replyCount} svar` : "Ingen svar ennå"}
              </td>
              <td className="hidden px-5 py-4 text-xs text-zinc-500 md:table-cell">{formatDate(ticket.createdAt)}</td>
              <td className="px-5 py-4 text-right">
                <Link
                  href={`/support/${ticket.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
                >
                  Se svar <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewTicketForm({ onSuccess }: { onSuccess: () => void }) {
  const [title,   setTitle]   = useState("");
  const [desc,    setDesc]    = useState("");
  const [cat,     setCat]     = useState(SUPPORT_CATEGORIES[0]);
  const [error,   setError]   = useState("");
  const [ok,      setOk]      = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!title.trim() || !desc.trim()) { setError("Fyll ut alle felt"); return; }
    setPending(true);
    setError("");
    const res = await fetch("/api/support/ticket", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ title, description: desc, category: cat }),
    });
    if (res.ok) {
      setOk(true);
      setTimeout(() => { setOk(false); setTitle(""); setDesc(""); setCat(SUPPORT_CATEGORIES[0]!); onSuccess(); }, 2000);
    } else {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Noe gikk galt");
    }
    setPending(false);
  }

  if (ok) {
    return (
      <div className="rounded-xl border border-emerald-800/40 bg-emerald-500/5 px-5 py-8 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-2 text-sm font-medium text-white">Henvendelsen er sendt!</p>
        <p className="mt-1 text-xs text-zinc-500">Vi svarer vanligvis innen 1–2 arbeidsdager.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="flex flex-col gap-4 px-5 py-5">
        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Tittel</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hva gjelder henvendelsen?"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Beskrivelse</label>
          <textarea
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Beskriv problemet eller spørsmålet ditt…"
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Kategori</label>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          >
            {SUPPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end border-t border-zinc-800 px-5 py-4">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40"
        >
          {pending ? "Sender…" : "Send henvendelse"}
        </button>
      </div>
    </div>
  );
}

export default function SupportClient({ activeTickets, resolvedTickets }: Props) {
  const [tab,      setTab]      = useState<"active" | "resolved">("active");
  const [showForm, setShowForm] = useState(false);

  const activeTotal = activeTickets.length;
  const currentList = tab === "active" ? activeTickets : resolvedTickets;

  return (
    <div className="px-4 py-5 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-indigo-400" />
            <h1 className="text-xl font-semibold text-white">Support</h1>
          </div>
          <p className="text-sm text-zinc-500">Her finner du alle henvendelser du har sendt til Intraa support.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Avbryt" : "Ny henvendelse"}
        </button>
      </div>

      {/* Inline new ticket form */}
      {showForm && (
        <div className="mb-6">
          <NewTicketForm onSuccess={() => setShowForm(false)} />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-zinc-800">
        <button
          onClick={() => setTab("active")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "active"
              ? "border-b-2 border-indigo-500 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Aktive
          {activeTotal > 0 && (
            <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
              {activeTotal}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("resolved")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === "resolved"
              ? "border-b-2 border-indigo-500 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Løste
        </button>
      </div>

      {currentList.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center">
          <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-zinc-700" />
          {tab === "active" ? (
            <>
              <p className="text-sm text-zinc-500">Ingen aktive henvendelser.</p>
              <p className="mt-1 text-xs text-zinc-600">Klikk «Ny henvendelse» for å opprette en sak.</p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Ingen løste henvendelser ennå.</p>
          )}
        </div>
      ) : (
        <TicketTable tickets={currentList} />
      )}
    </div>
  );
}
