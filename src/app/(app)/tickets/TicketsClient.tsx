"use client";

import { useState } from "react";
import { Search, X, ChevronRight } from "lucide-react";

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED";
type Category = "IT" | "HR" | "OTHER";

interface Comment {
  id:     string;
  author: string;
  text:   string;
  time:   string;
}

export interface TicketRow {
  id:          string;
  title:       string;
  status:      Status;
  category:    Category;
  assignee:    string;
  description: string;
  comments:    Comment[];
}

interface Props {
  initialTickets: TicketRow[];
  orgId:          string;
  userId:         string;
  userName:       string;
}

const STATUS_LABELS: Record<Status, string> = {
  OPEN:        "Åpen",
  IN_PROGRESS: "Under arbeid",
  RESOLVED:    "Løst",
};

const STATUS_STYLES: Record<Status, string> = {
  OPEN:        "bg-yellow-500/10 text-yellow-400",
  IN_PROGRESS: "bg-blue-500/10 text-blue-400",
  RESOLVED:    "bg-emerald-500/10 text-emerald-400",
};

const CATEGORY_STYLES: Record<Category, string> = {
  IT:    "bg-violet-500/10 text-violet-400",
  HR:    "bg-pink-500/10 text-pink-400",
  OTHER: "bg-zinc-500/10 text-zinc-400",
};

type FilterTab = "ALL" | Status;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "ALL",         label: "Alle" },
  { key: "OPEN",        label: "Åpen" },
  { key: "IN_PROGRESS", label: "Under arbeid" },
  { key: "RESOLVED",    label: "Løst" },
];

export default function TicketsClient({ initialTickets, userName }: Props) {
  const [tickets,    setTickets]    = useState<TicketRow[]>(initialTickets);
  const [filter,     setFilter]     = useState<FilterTab>("ALL");
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<TicketRow | null>(null);
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
      id:     `c-${Date.now()}`,
      author: userName || "Deg",
      text,
      time:   new Date().toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" }),
    };
    setTickets((prev) => prev.map((t) => t.id === selected.id ? { ...t, comments: [...t.comments, comment] } : t));
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

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            {FILTER_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === key ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
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

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Tittel</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Status</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Kategori</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Tildelt</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-zinc-950">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-zinc-600">
                    {tickets.length === 0 ? "Ingen tickets ennå." : "Ingen tickets matcher søket."}
                  </td>
                </tr>
              )}
              {visible.map((ticket, i) => (
                <tr
                  key={ticket.id}
                  onClick={() => setSelected(ticket)}
                  className={`cursor-pointer transition-colors hover:bg-zinc-900 ${selected?.id === ticket.id ? "bg-zinc-900" : ""} ${i < visible.length - 1 ? "border-b border-zinc-800" : ""}`}
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
                  <td className="px-5 py-4 text-zinc-600"><ChevronRight className="h-4 w-4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-in detail panel */}
      <div
        className={`flex w-96 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900 transition-transform duration-300 ${selected ? "translate-x-0" : "translate-x-full"}`}
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

              <div>
                <p className="mb-3 text-xs font-medium text-zinc-500">Kommentarer ({selected.comments.length})</p>
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

            <div className="border-t border-zinc-800 px-6 py-4">
              <textarea
                rows={2}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Skriv en kommentar…"
                className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 transition-colors"
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
