"use client";

import { useState, useTransition } from "react";
import { Search, X, Plus, ChevronRight, AlertCircle, Clock, CheckCircle2, XCircle, Pause } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketRole = "admin" | "agent" | "user";
type Status     = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
type Priority   = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface TicketReply {
  id:        string;
  content:   string;
  isAgent:   boolean;
  createdAt: string;
  author:    { id: string; name: string | null };
}

export interface Category {
  id:    string;
  name:  string;
  emoji: string;
  color: string;
}

export interface TicketRow {
  id:          string;
  title:       string;
  description: string;
  status:      Status;
  priority:    Priority;
  category:    Category | null;
  createdAt:   string;
  author:      { id: string; name: string | null };
  assignee:    { id: string; name: string | null } | null;
  replyCount:  number;
}

export interface Member {
  id:   string;
  name: string | null;
}

interface Props {
  initialTickets: TicketRow[];
  orgId:          string;
  userId:         string;
  userName:       string;
  ticketRole:     TicketRole;
  categories:     Category[];
  members:        Member[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<Status, string> = {
  OPEN:        "Åpen",
  IN_PROGRESS: "Under arbeid",
  WAITING:     "Venter",
  RESOLVED:    "Løst",
  CLOSED:      "Lukket",
};

const STATUS_STYLES: Record<Status, string> = {
  OPEN:        "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  IN_PROGRESS: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  WAITING:     "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  RESOLVED:    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  CLOSED:      "bg-zinc-700/50 text-zinc-500 border border-zinc-700",
};

const STATUS_ICONS: Record<Status, React.ElementType> = {
  OPEN:        AlertCircle,
  IN_PROGRESS: Clock,
  WAITING:     Pause,
  RESOLVED:    CheckCircle2,
  CLOSED:      XCircle,
};

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW:    "Lav",
  NORMAL: "Normal",
  HIGH:   "Høy",
  URGENT: "Kritisk",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW:    "bg-zinc-700/50 text-zinc-400",
  NORMAL: "bg-blue-500/10 text-blue-400",
  HIGH:   "bg-orange-500/10 text-orange-400",
  URGENT: "bg-red-500/10 text-red-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function initials(name: string | null) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// ─── New Ticket Modal ─────────────────────────────────────────────────────────

function NewTicketModal({
  categories,
  onClose,
  onCreated,
}: {
  categories: Category[];
  onClose:    () => void;
  onCreated:  (t: TicketRow) => void;
}) {
  const [title, setTitle]          = useState("");
  const [description, setDesc]     = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [priority, setPriority]    = useState<Priority>("NORMAL");
  const [error, setError]          = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim() || !description.trim()) { setError("Fyll ut alle felt"); return; }
    startTransition(async () => {
      const res = await fetch("/api/tickets", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title, description, categoryId: categoryId || undefined, priority }),
      });
      const data = await res.json() as { ticket?: TicketRow; error?: string };
      if (!res.ok) { setError(data.error ?? "Noe gikk galt"); return; }
      onCreated({ ...data.ticket!, assignee: null, replyCount: 0 });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-white">Ny sak</h2>
          <button onClick={onClose} className="text-zinc-400 transition-colors hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Tittel</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kort beskrivelse av problemet"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Beskrivelse</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Beskriv problemet i detalj…"
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {categories.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Kategori</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="">— Velg kategori —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Prioritet</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              >
                {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-800 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white">Avbryt</button>
          <button
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-80 disabled:opacity-40"
          >
            {pending ? "Sender…" : "Send sak"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Detail Panel ──────────────────────────────────────────────────────

function TicketDetail({
  ticket,
  onClose,
  userId,
  ticketRole,
  members,
  onUpdate,
}: {
  ticket:     TicketRow;
  onClose:    () => void;
  userId:     string;
  ticketRole: TicketRole;
  members:    Member[];
  onUpdate:   (updated: Partial<TicketRow> & { id: string }) => void;
}) {
  const [replies,  setReplies]  = useState<TicketReply[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [reply,    setReply]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [patching, setPatching] = useState(false);

  const isAdmin = ticketRole === "admin";
  const isAgent = ticketRole === "agent" || isAdmin;

  // Load replies on mount
  if (!loaded) {
    setLoaded(true);
    fetch(`/api/tickets/${ticket.id}`)
      .then((r) => r.json() as Promise<{ ticket: TicketRow & { replies: TicketReply[] } }>)
      .then(({ ticket: t }) => setReplies(t.replies ?? []));
  }

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    const res = await fetch(`/api/tickets/${ticket.id}/reply`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ content: reply }),
    });
    if (res.ok) {
      const data = await res.json() as { reply: TicketReply };
      setReplies((prev) => [...prev, data.reply]);
      setReply("");
    }
    setSending(false);
  }

  async function patch(update: { status?: string; priority?: string; assigneeId?: string | null }) {
    setPatching(true);
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(update),
    });
    if (res.ok) {
      onUpdate({ id: ticket.id, ...update } as Partial<TicketRow> & { id: string });
    }
    setPatching(false);
  }

  const StatusIcon = STATUS_ICONS[ticket.status];

  return (
    <div className="flex w-full flex-col overflow-hidden md:w-[480px] md:shrink-0 md:border-l md:border-zinc-800">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-800 bg-zinc-900 px-5 py-4">
        <div className="flex-1 pr-3">
          <h2 className="text-sm font-semibold leading-snug text-white">{ticket.title}</h2>
          <p className="mt-1 text-xs text-zinc-500">Opprettet {formatDate(ticket.createdAt)} av {ticket.author.name ?? "—"}</p>
        </div>
        <button onClick={onClose} className="shrink-0 text-zinc-400 transition-colors hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3 border-b border-zinc-800 bg-zinc-950 px-5 py-4">
        <div>
          <p className="mb-1 text-xs text-zinc-500">Status</p>
          {isAgent ? (
            <select
              value={ticket.status}
              onChange={(e) => patch({ status: e.target.value })}
              disabled={patching}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white outline-none"
            >
              {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          ) : (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
              <StatusIcon className="h-3 w-3" />{STATUS_LABELS[ticket.status]}
            </span>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs text-zinc-500">Prioritet</p>
          {isAgent ? (
            <select
              value={ticket.priority}
              onChange={(e) => patch({ priority: e.target.value })}
              disabled={patching}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white outline-none"
            >
              {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          ) : (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[ticket.priority]}`}>
              {PRIORITY_LABELS[ticket.priority]}
            </span>
          )}
        </div>

        {ticket.category && (
          <div>
            <p className="mb-1 text-xs text-zinc-500">Kategori</p>
            <p className="text-xs text-white">{ticket.category.emoji} {ticket.category.name}</p>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs text-zinc-500">Tildelt</p>
          {isAdmin ? (
            <select
              value={ticket.assignee?.id ?? ""}
              onChange={(e) => patch({ assigneeId: e.target.value || null })}
              disabled={patching}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white outline-none"
            >
              <option value="">— Ikke tildelt —</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.id}</option>)}
            </select>
          ) : (
            <p className="text-xs text-white">{ticket.assignee?.name ?? "—"}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="border-b border-zinc-800 bg-zinc-950 px-5 py-4">
        <p className="mb-2 text-xs font-medium text-zinc-500">Beskrivelse</p>
        <p className="whitespace-pre-wrap text-sm text-zinc-300">{ticket.description}</p>
      </div>

      {/* Reply thread */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-zinc-950 px-5 py-4">
        <p className="text-xs font-medium text-zinc-500">Svar ({replies.length})</p>
        {replies.length === 0 && (
          <p className="text-xs text-zinc-600">Ingen svar ennå.</p>
        )}
        {replies.map((r) => (
          <div
            key={r.id}
            className={`rounded-xl px-4 py-3 ${r.isAgent ? "border border-violet-500/20 bg-violet-500/10" : "bg-zinc-900"}`}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-bold text-white">
                {initials(r.author.name)}
              </div>
              <span className="text-xs font-medium text-white">{r.author.name ?? "—"}</span>
              {r.isAgent && (
                <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-400">
                  Agent
                </span>
              )}
              <span className="ml-auto text-[10px] text-zinc-600">{formatTime(r.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-xs text-zinc-300">{r.content}</p>
          </div>
        ))}
      </div>

      {/* Reply input */}
      {ticket.status !== "CLOSED" && (
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-5 py-4">
          <textarea
            rows={2}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
            placeholder="Skriv et svar… (Cmd+Enter for å sende)"
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={sendReply}
            disabled={!reply.trim() || sending}
            className="mt-2 w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition-colors hover:opacity-80 disabled:opacity-30"
          >
            {sending ? "Sender…" : "Send svar"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TicketsClient({
  initialTickets,
  userId,
  ticketRole,
  categories,
  members,
}: Props) {
  const [tickets,      setTickets]      = useState<TicketRow[]>(initialTickets);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "ALL">("ALL");
  const [priFilter,    setPriFilter]    = useState<Priority | "ALL">("ALL");
  const [catFilter,    setCatFilter]    = useState<string>("ALL");
  const [selected,     setSelected]     = useState<TicketRow | null>(null);
  const [showNew,      setShowNew]      = useState(false);

  const isAdmin = ticketRole === "admin";
  const isAgent = ticketRole === "agent" || isAdmin;

  const visible = tickets.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (priFilter !== "ALL" && t.priority !== priFilter) return false;
    if (catFilter !== "ALL" && t.category?.id !== catFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function handleCreated(t: TicketRow) {
    setTickets((prev) => [t, ...prev]);
  }

  function handleUpdate(update: Partial<TicketRow> & { id: string }) {
    setTickets((prev) => prev.map((t) => t.id === update.id ? { ...t, ...update } : t));
    setSelected((s) => s && s.id === update.id ? { ...s, ...update } : s);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* List panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold text-white">
              {ticketRole === "user" ? "Mine saker" : ticketRole === "agent" ? "Saker i mine kategorier" : "Alle saker"}
            </h1>
            <p className="text-xs text-zinc-500">{visible.length} sak{visible.length !== 1 ? "er" : ""}</p>
          </div>

          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:opacity-80"
          >
            <Plus className="h-3.5 w-3.5" /> Ny sak
          </button>
        </div>

        {/* Filters */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-6 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søk…"
              className="w-36 bg-transparent text-xs text-white placeholder:text-zinc-500 outline-none"
            />
          </div>

          {isAgent && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Status | "ALL")}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 outline-none"
              >
                <option value="ALL">Alle statuser</option>
                {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              <select
                value={priFilter}
                onChange={(e) => setPriFilter(e.target.value as Priority | "ALL")}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 outline-none"
              >
                <option value="ALL">Alle prioriteter</option>
                {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              {categories.length > 1 && (
                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 outline-none"
                >
                  <option value="ALL">Alle kategorier</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-zinc-600">
                {tickets.length === 0 ? "Ingen saker ennå." : "Ingen saker matcher filteret."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Tittel</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                  <th className="hidden px-5 py-3 text-left text-xs font-medium text-zinc-500 md:table-cell">Prioritet</th>
                  <th className="hidden px-5 py-3 text-left text-xs font-medium text-zinc-500 lg:table-cell">Kategori</th>
                  {isAdmin && <th className="hidden px-5 py-3 text-left text-xs font-medium text-zinc-500 lg:table-cell">Tildelt</th>}
                  {isAgent && <th className="hidden px-5 py-3 text-left text-xs font-medium text-zinc-500 lg:table-cell">Fra</th>}
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Dato</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="bg-zinc-950">
                {visible.map((ticket, i) => {
                  const StatusIcon = STATUS_ICONS[ticket.status];
                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelected(ticket)}
                      className={`cursor-pointer transition-colors hover:bg-zinc-900 ${i < visible.length - 1 ? "border-b border-zinc-800" : ""} ${selected?.id === ticket.id ? "bg-zinc-900" : ""}`}
                    >
                      <td className="px-5 py-4 font-medium text-white">
                        <span className="line-clamp-1">{ticket.title}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_LABELS[ticket.status]}
                        </span>
                      </td>
                      <td className="hidden px-5 py-4 md:table-cell">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[ticket.priority]}`}>
                          {PRIORITY_LABELS[ticket.priority]}
                        </span>
                      </td>
                      <td className="hidden px-5 py-4 text-xs text-zinc-400 lg:table-cell">
                        {ticket.category ? `${ticket.category.emoji} ${ticket.category.name}` : "—"}
                      </td>
                      {isAdmin && <td className="hidden px-5 py-4 text-xs text-zinc-400 lg:table-cell">{ticket.assignee?.name ?? "—"}</td>}
                      {isAgent && <td className="hidden px-5 py-4 text-xs text-zinc-400 lg:table-cell">{ticket.author.name ?? "—"}</td>}
                      <td className="px-5 py-4 text-xs text-zinc-500">{formatDate(ticket.createdAt)}</td>
                      <td className="px-5 py-4 text-zinc-600"><ChevronRight className="h-4 w-4" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <TicketDetail
          ticket={selected}
          onClose={() => setSelected(null)}
          userId={userId}
          ticketRole={ticketRole}
          members={members}
          onUpdate={handleUpdate}
        />
      )}

      {/* New ticket modal */}
      {showNew && (
        <NewTicketModal
          categories={categories}
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
