"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LifeBuoy } from "lucide-react";

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

export default function SupportClient({ activeTickets, resolvedTickets }: Props) {
  const [tab, setTab] = useState<"active" | "resolved">("active");

  const activeTotal = activeTickets.length;
  const currentList = tab === "active" ? activeTickets : resolvedTickets;

  return (
    <div className="px-4 py-5 md:px-8 md:py-8">
      <div className="mb-1 flex items-center gap-2">
        <LifeBuoy className="h-5 w-5 text-indigo-400" />
        <h1 className="text-xl font-semibold text-white">Mine support-henvendelser</h1>
      </div>
      <p className="mb-6 text-sm text-zinc-500">Her finner du alle henvendelser du har sendt til Intraa support.</p>

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
              <p className="mt-1 text-xs text-zinc-600">Bruk &quot;Kontakt support&quot; i sidebaren for å opprette en sak.</p>
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
