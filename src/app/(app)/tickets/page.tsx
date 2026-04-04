"use client";

import { useState } from "react";
import { Search, X, ChevronRight } from "lucide-react";

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED";
type Category = "IT" | "HR" | "OTHER";

interface Comment {
  id: string;
  author: string;
  text: string;
  time: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: Status;
  category: Category;
  assignee: string;
  comments: Comment[];
}

const INITIAL_TICKETS: Ticket[] = [
  {
    id: "t1",
    title: "Kan ikke logge inn på Teams",
    description: "Brukeren rapporterer at pålogging til Microsoft Teams feiler med feilkode AADSTS50126. Problemet oppstod etter passordbytte mandag morgen. Har forsøkt å nullstille passord uten hell.",
    status: "OPEN",
    category: "IT",
    assignee: "Thomas Kvam",
    comments: [{ id: "c1", author: "Thomas Kvam", text: "Ser på saken nå.", time: "09:14" }],
  },
  {
    id: "t2",
    title: "Oppdater ansattkontrakt",
    description: "Kontrakten til ansatt skal oppdateres med ny stillingstittel og lønnsjustering i henhold til lønnsforhandlingene i mars. Juridisk avdeling er varslet.",
    status: "IN_PROGRESS",
    category: "HR",
    assignee: "Maria Haugen",
    comments: [],
  },
  {
    id: "t3",
    title: "Ny laptop til nyansatt",
    description: "Bestilling av MacBook Pro 14\" til ny utvikler som starter 15. april. Inkluderer skjerm, tastatur og mus. Levering estimert til 10. april.",
    status: "IN_PROGRESS",
    category: "IT",
    assignee: "Thomas Kvam",
    comments: [
      { id: "c2", author: "Anders Sørensen", text: "Husk å bestille USB-C hub også.", time: "11:02" },
      { id: "c3", author: "Thomas Kvam", text: "Notert, legger det til.", time: "11:15" },
    ],
  },
  {
    id: "t4",
    title: "Spørsmål om feriepenger",
    description: "Ansatt hadde spørsmål om beregning av feriepenger etter å ha vært i permisjon deler av fjoråret. Saken er avklart og svar sendt per e-post.",
    status: "RESOLVED",
    category: "HR",
    assignee: "Maria Haugen",
    comments: [{ id: "c4", author: "Maria Haugen", text: "Avklart og lukket.", time: "14:30" }],
  },
  {
    id: "t5",
    title: "VPN fungerer ikke hjemmefra",
    description: "Flere ansatte melder at VPN-tilkoblingen dropper etter 30 minutter. IT-avdelingen undersøker konfigurasjon på Cisco-ruteren.",
    status: "OPEN",
    category: "IT",
    assignee: "Thomas Kvam",
    comments: [],
  },
];

const STATUS_LABELS: Record<Status, string> = {
  OPEN: "Åpen",
  IN_PROGRESS: "Under arbeid",
  RESOLVED: "Løst",
};

const STATUS_STYLES: Record<Status, string> = {
  OPEN: "bg-yellow-500/10 text-yellow-400",
  IN_PROGRESS: "bg-blue-500/10 text-blue-400",
  RESOLVED: "bg-emerald-500/10 text-emerald-400",
};

const CATEGORY_STYLES: Record<Category, string> = {
  IT: "bg-violet-500/10 text-violet-400",
  HR: "bg-pink-500/10 text-pink-400",
  OTHER: "bg-zinc-500/10 text-zinc-400",
};

type FilterTab = "ALL" | Status;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "ALL", label: "Alle" },
  { key: "OPEN", label: "Åpen" },
  { key: "IN_PROGRESS", label: "Under arbeid" },
  { key: "RESOLVED", label: "Løst" },
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [newComment, setNewComment] = useState("");

  const visible = tickets.filter((t) => {
    const matchFilter = filter === "ALL" || t.status === filter;
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  function updateStatus(id: string, status: Status) {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    if (selected?.id === id) setSelected((s) => s && { ...s, status });
  }

  function addComment() {
    const text = newComment.trim();
    if (!text || !selected) return;
    const comment: Comment = {
      id: `c-${Date.now()}`,
      author: "Anders Sørensen",
      text,
      time: new Date().toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" }),
    };
    const updated = tickets.map((t) =>
      t.id === selected.id ? { ...t, comments: [...t.comments, comment] } : t
    );
    setTickets(updated);
    setSelected((s) => s && { ...s, comments: [...s.comments, comment] });
    setNewComment("");
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Main list */}
      <div className="flex flex-1 flex-col overflow-hidden px-8 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Tickets</h1>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500">
            + Ny ticket
          </button>
        </div>

        {/* Filters + search */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            {FILTER_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === key
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              type="text"
              placeholder="Søk i tickets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Tittel</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Status</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Kategori</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Tildelt</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500"></th>
              </tr>
            </thead>
            <tbody className="bg-zinc-950">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-zinc-500">Ingen tickets funnet.</td>
                </tr>
              )}
              {visible.map((ticket, i) => (
                <tr
                  key={ticket.id}
                  onClick={() => setSelected(ticket)}
                  className={`cursor-pointer transition-colors hover:bg-zinc-900 ${
                    selected?.id === ticket.id ? "bg-zinc-900" : ""
                  } ${i < visible.length - 1 ? "border-b border-zinc-800" : ""}`}
                >
                  <td className="px-5 py-4 font-medium text-white">{ticket.title}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
                      {STATUS_LABELS[ticket.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[ticket.category]}`}>
                      {ticket.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-zinc-400">{ticket.assignee}</td>
                  <td className="px-5 py-4 text-zinc-600">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-in panel */}
      <div
        className={`flex w-96 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900 transition-all duration-300 ${
          selected ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ position: "relative" }}
      >
        {selected && (
          <>
            <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-5">
              <h2 className="flex-1 pr-4 text-sm font-semibold text-white leading-snug">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-zinc-800/50 p-4 text-sm">
                <div>
                  <p className="mb-1 text-xs text-zinc-500">Status</p>
                  <select
                    value={selected.status}
                    onChange={(e) => updateStatus(selected.id, e.target.value as Status)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white outline-none"
                  >
                    {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-xs text-zinc-500">Kategori</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[selected.category]}`}>
                    {selected.category}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="mb-1 text-xs text-zinc-500">Tildelt</p>
                  <p className="text-xs text-zinc-300">{selected.assignee}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500">Beskrivelse</p>
                <p className="text-sm leading-relaxed text-zinc-300">{selected.description}</p>
              </div>

              {/* Comments */}
              <div>
                <p className="mb-3 text-xs font-medium text-zinc-500">
                  Kommentarer ({selected.comments.length})
                </p>
                <div className="flex flex-col gap-3">
                  {selected.comments.map((c) => (
                    <div key={c.id} className="rounded-lg bg-zinc-800/50 px-3 py-2.5">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-white">{c.author}</span>
                        <span className="text-xs text-zinc-600">{c.time}</span>
                      </div>
                      <p className="text-xs text-zinc-300">{c.text}</p>
                    </div>
                  ))}
                  {selected.comments.length === 0 && (
                    <p className="text-xs text-zinc-600">Ingen kommentarer ennå.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Add comment */}
            <div className="border-t border-zinc-800 px-6 py-4">
              <textarea
                rows={2}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Skriv en kommentar…"
                className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500"
              />
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className="mt-2 w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-30"
              >
                Legg til kommentar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
