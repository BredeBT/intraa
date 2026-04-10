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

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function initials(name: string | null) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function UserSupportTicket({ ticket: initial, userId }: { ticket: Ticket; userId: string }) {
  const [ticket,  setTicket]  = useState(initial);
  const [replies, setReplies] = useState<Reply[]>(initial.replies);
  const [reply,   setReply]   = useState("");
  const [sending, setSending] = useState(false);

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
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-white">{ticket.title}</h1>
        <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
            {STATUS_LABELS[ticket.status]}
          </span>
          {ticket.category && <span>{ticket.category}</span>}
          <span>{formatTime(ticket.createdAt)}</span>
        </div>
      </div>

      {/* Original */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="mb-2 text-xs font-medium text-zinc-500">Din henvendelse</p>
        <p className="whitespace-pre-wrap text-sm text-zinc-300">{ticket.description}</p>
      </div>

      {/* Replies */}
      <div className="mb-4 flex flex-col gap-3">
        <p className="text-xs font-medium text-zinc-500">Svar ({replies.length})</p>
        {replies.length === 0 && (
          <p className="text-xs text-zinc-600">Vi har mottatt henvendelsen din og vil svare snart.</p>
        )}
        {replies.map((r) => (
          <div
            key={r.id}
            className={`rounded-xl px-4 py-3 ${r.isAgent ? "border border-violet-500/20 bg-violet-500/10" : "border border-zinc-800 bg-zinc-900"}`}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-bold text-white">
                {initials(r.author.name)}
              </div>
              <span className="text-xs font-medium text-white">{r.isAgent ? "Intraa Support" : (r.author.name ?? "Du")}</span>
              {r.isAgent && (
                <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-400">
                  Support
                </span>
              )}
              <span className="ml-auto text-[10px] text-zinc-600">{formatTime(r.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-xs text-zinc-300">{r.content}</p>
          </div>
        ))}
      </div>

      {/* Reply */}
      {ticket.status !== "CLOSED" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <textarea
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Legg til mer informasjon…"
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 transition-colors"
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={sendReply}
              disabled={!reply.trim() || sending}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-80 disabled:opacity-30"
            >
              {sending ? "Sender…" : "Send tilleggsinformasjon"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
