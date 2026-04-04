"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";

const tickets = [
  {
    id: 1,
    title: "Kan ikke logge inn på Teams",
    status: "Åpen",
    category: "IT",
    assignee: "Thomas Kvam",
    description:
      "Brukeren rapporterer at pålogging til Microsoft Teams feiler med feilkode AADSTS50126. Problemet oppstod etter passordbytte mandag morgen. Har forsøkt å nullstille passord uten hell.",
  },
  {
    id: 2,
    title: "Oppdater ansattkontrakt",
    status: "Under arbeid",
    category: "HR",
    assignee: "Maria Haugen",
    description:
      "Kontrakten til ansatt skal oppdateres med ny stillingstittel og lønnsjustering i henhold til lønnsforhandlingene i mars. Juridisk avdeling er varslet.",
  },
  {
    id: 3,
    title: "Ny laptop til nyansatt",
    status: "Under arbeid",
    category: "IT",
    assignee: "Thomas Kvam",
    description:
      "Bestilling av MacBook Pro 14\" til ny utvikler som starter 15. april. Inkluderer skjerm, tastatur og mus. Levering estimert til 10. april.",
  },
  {
    id: 4,
    title: "Spørsmål om feriepenger",
    status: "Løst",
    category: "HR",
    assignee: "Maria Haugen",
    description:
      "Ansatt hadde spørsmål om beregning av feriepenger etter å ha vært i permisjon deler av fjoråret. Saken er avklart og svar sendt per e-post.",
  },
];

type Ticket = (typeof tickets)[number];

const statusStyles: Record<string, string> = {
  Åpen: "bg-yellow-500/10 text-yellow-400",
  "Under arbeid": "bg-blue-500/10 text-blue-400",
  Løst: "bg-emerald-500/10 text-emerald-400",
};

const categoryStyles: Record<string, string> = {
  IT: "bg-violet-500/10 text-violet-400",
  HR: "bg-pink-500/10 text-pink-400",
};

function TicketDetail({ ticket, onBack }: { ticket: Ticket; onBack: () => void }) {
  return (
    <div className="px-8 py-8 max-w-2xl">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbake til tickets
      </button>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white">{ticket.title}</h2>
        <div className="mt-3 flex gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[ticket.status]}`}>
            {ticket.status}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryStyles[ticket.category]}`}>
            {ticket.category}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-zinc-800/50 px-4 py-3 text-sm">
          <div>
            <p className="text-xs text-zinc-500">Tildelt</p>
            <p className="mt-0.5 text-zinc-300">{ticket.assignee}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Kategori</p>
            <p className="mt-0.5 text-zinc-300">{ticket.category}</p>
          </div>
        </div>
        <div className="mt-5">
          <p className="text-xs font-medium text-zinc-500">Beskrivelse</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{ticket.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function TicketsPage() {
  const [selected, setSelected] = useState<Ticket | null>(null);

  if (selected) {
    return <TicketDetail ticket={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Tickets</h1>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500">
          + Ny ticket
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Tittel</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Status</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Kategori</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Tildelt</th>
            </tr>
          </thead>
          <tbody className="bg-zinc-950">
            {tickets.map((ticket, i) => (
              <tr
                key={ticket.id}
                onClick={() => setSelected(ticket)}
                className={`cursor-pointer transition-colors hover:bg-zinc-900 ${
                  i < tickets.length - 1 ? "border-b border-zinc-800" : ""
                }`}
              >
                <td className="px-5 py-4 font-medium text-white">{ticket.title}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[ticket.status]}`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryStyles[ticket.category]}`}>
                    {ticket.category}
                  </span>
                </td>
                <td className="px-5 py-4 text-zinc-400">{ticket.assignee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
