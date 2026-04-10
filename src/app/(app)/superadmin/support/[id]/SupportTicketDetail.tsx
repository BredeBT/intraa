"use client";

import { useState } from "react";

type Status   = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface Reply {
  id:        string;
  content:   string;
  isAgent:   boolean;
  createdAt: string;
  author:    { id: string; name: string | null };
}

interface Ticket {
  id:          string;
  title:       string;
  description: string;
  status:      Status;
  priority:    Priority;
  category:    string | null;
  createdAt:   string;
  author:      { id: string; name: string | null; email: string };
  assignee:    { id: string; name: string | null } | null;
  replies:     Reply[];
}

const STATUS_LABELS: Record<Status, string> = {
  OPEN: "Åpen", IN_PROGRESS: "Under arbeid", WAITING: "Venter", RESOLVED: "Løst", CLOSED: "Lukket",
};
const STATUS_STYLES: Record<Status, string> = {
  OPEN:        "bg-yellow-500/10 text-yellow-400",
  IN_PROGRESS: "bg-blue-500/10 text-blue-400",
  WAITING:     "bg-orange-500/10 text-orange-400",
  RESOLVED:    "bg-emerald-500/10 text-emerald-400",
  CLOSED:      "bg-zinc-700/50 text-zinc-500",
};
const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Lav", NORMAL: "Normal", HIGH: "Høy", URGENT: "Kritisk",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function initials(name: string | null) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function SupportTicketDetail({
  ticket: initial,
  tenant,
  userId,
}: {
  ticket:   Ticket;
  tenant:   { name: string; slug: string } | null;
  userId:   string;
  userName: string;
}) {
  const [ticket,  setTicket]  = useState(initial);
  const [replies, setReplies] = useState<Reply[]>(initial.replies);
  const [reply,   setReply]   = useState("");
  const [sending, setSending] = useState(false);

  async function patch(update: { status?: string; priority?: string }) {
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(update),
    });
    if (res.ok) {
      const data = await res.json() as { ticket: Ticket };
      setTicket((t) => ({ ...t, ...data.ticket }));
    }
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
      const data = await res.json() as { reply: Reply };
      setReplies((prev) => [...prev, data.reply]);
      setReply("");
    }
    setSending(false);
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">{ticket.title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span>Fra: <span className="text-zinc-300">{ticket.author.name ?? "—"}</span> ({ticket.author.email})</span>
          {tenant && <span>Tenant: <span className="text-zinc-300">{tenant.name}</span> <span className="text-zinc-600">/{tenant.slug}</span></span>}
          <span>{formatTime(ticket.createdAt)}</span>
        </div>
      </div>

      {/* Meta */}
      <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-4">
        <div>
          <p className="mb-1 text-xs text-zinc-500">Status</p>
          <select
            value={ticket.status}
            onChange={(e) => patch({ status: e.target.value })}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white outline-none"
          >
            {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Prioritet</p>
          <select
            value={ticket.priority}
            onChange={(e) => patch({ priority: e.target.value })}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white outline-none"
          >
            {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Kategori</p>
          <p className="text-xs text-white">{ticket.category ?? "—"}</p>
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Nåværende status</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
            {STATUS_LABELS[ticket.status]}
          </span>
        </div>
      </div>

      {/* Original description */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="mb-2 text-xs font-medium text-zinc-500">Opprinnelig henvendelse</p>
        <p className="whitespace-pre-wrap text-sm text-zinc-300">{ticket.description}</p>
      </div>

      {/* Reply thread */}
      <div className="mb-4 flex flex-col gap-3">
        <p className="text-xs font-medium text-zinc-500">Svar ({replies.length})</p>
        {replies.map((r) => (
          <div
            key={r.id}
            className={`rounded-xl px-4 py-3 ${r.isAgent ? "border border-violet-500/20 bg-violet-500/10" : "border border-zinc-800 bg-zinc-900"}`}
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
        {replies.length === 0 && <p className="text-xs text-zinc-600">Ingen svar ennå.</p>}
      </div>

      {/* Reply input */}
      {ticket.status !== "CLOSED" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="mb-2 text-xs font-medium text-zinc-400">Svar til bruker</p>
          <textarea
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Skriv svaret ditt…"
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 transition-colors"
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={sendReply}
              disabled={!reply.trim() || sending}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-80 disabled:opacity-30"
            >
              {sending ? "Sender…" : "Send svar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
