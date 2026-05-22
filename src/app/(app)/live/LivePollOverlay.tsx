"use client";

import { useEffect, useState, useTransition } from "react";
import { BarChart3, X, Check } from "lucide-react";

interface PollOption { id: string; label: string; votes: number }

interface PollData {
  id:          string;
  question:    string;
  options:     PollOption[];
  totalVotes:  number;
  myVoteId:    string | null;
  secondsLeft: number;
  closesAt:    string;
}

interface Props {
  orgId:    string;
  isAdmin:  boolean;
  onClose?: () => void;
}

export default function LivePollOverlay({ orgId, isAdmin, onClose }: Props) {
  const [poll, setPoll]   = useState<PollData | null>(null);
  const [, start]         = useTransition();
  const [voting, setVoting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Poll for active poll every 3s
  useEffect(() => {
    let cancelled = false;
    async function fetchPoll() {
      try {
        const res = await fetch(`/api/live/polls?orgId=${orgId}`);
        if (!res.ok) return;
        const data = await res.json() as { poll: PollData | null };
        if (!cancelled) {
          setPoll(data.poll);
          if (!data.poll) setDismissed(false);
        }
      } catch { /* silent */ }
    }
    void fetchPoll();
    const id = setInterval(fetchPoll, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [orgId]);

  // Local countdown tick so seconds-left updates every second (between server polls)
  useEffect(() => {
    if (!poll) return;
    const id = setInterval(() => {
      setPoll((p) => p && p.secondsLeft > 0 ? { ...p, secondsLeft: p.secondsLeft - 1 } : p);
    }, 1000);
    return () => clearInterval(id);
  }, [poll?.id]);

  if (!poll || dismissed) return null;

  async function vote(optionId: string) {
    if (voting || !poll) return;
    setVoting(true);

    // Optimistic update
    setPoll((p) => {
      if (!p) return p;
      const prevVoteId = p.myVoteId;
      const options = p.options.map((o) => {
        if (o.id === optionId && optionId !== prevVoteId) return { ...o, votes: o.votes + 1 };
        if (o.id === prevVoteId)                          return { ...o, votes: Math.max(0, o.votes - 1) };
        return o;
      });
      const totalVotes = prevVoteId ? p.totalVotes : p.totalVotes + 1;
      return { ...p, options, totalVotes, myVoteId: optionId };
    });

    try {
      await fetch(`/api/live/polls/${poll.id}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ optionId }),
      });
    } finally {
      setVoting(false);
    }
  }

  async function closeEarly() {
    if (!poll) return;
    start(async () => {
      await fetch(`/api/live/polls/${poll.id}`, { method: "DELETE" });
      setPoll(null);
      onClose?.();
    });
  }

  return (
    <div
      className="absolute bottom-4 left-4 right-4 z-30 max-w-md mx-auto rounded-2xl p-4 shadow-2xl"
      style={{
        background:           "linear-gradient(135deg, rgba(11,16,39,0.92), rgba(19,26,53,0.92))",
        border:               "1px solid rgba(168,85,247,0.40)",
        backdropFilter:       "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow:            "0 8px 40px rgba(168,85,247,0.30)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-lg"
          style={{ background: "rgba(168,85,247,0.20)", color: "#A855F7" }}
        >
          <BarChart3 className="h-3.5 w-3.5" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#A855F7" }}>
          Live avstemning
        </p>
        <span
          className="ml-auto text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full"
          style={{ background: "rgba(168,85,247,0.15)", color: "#fff" }}
        >
          {poll.secondsLeft}s
        </span>
        {isAdmin && (
          <button
            onClick={() => void closeEarly()}
            className="text-white/40 hover:text-rose-400 transition-colors"
            title="Avslutt avstemning"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Question */}
      <p className="text-sm font-semibold text-white mb-3">{poll.question}</p>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const pct = poll.totalVotes > 0 ? (opt.votes / poll.totalVotes) * 100 : 0;
          const isMine = poll.myVoteId === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => void vote(opt.id)}
              disabled={voting}
              className="relative w-full overflow-hidden rounded-lg px-3 py-2.5 text-left transition-colors disabled:opacity-60"
              style={{
                background: "rgba(255,255,255,0.04)",
                border:     isMine ? "1px solid rgba(94,234,212,0.50)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Bar fill */}
              <div
                className="absolute inset-y-0 left-0 transition-all duration-300"
                style={{
                  width:      `${pct}%`,
                  background: isMine
                    ? "linear-gradient(90deg, rgba(94,234,212,0.30), rgba(168,85,247,0.30))"
                    : "rgba(168,85,247,0.18)",
                }}
              />
              {/* Content */}
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isMine && <Check className="h-3 w-3 shrink-0" style={{ color: "#5EEAD4" }} />}
                  <span className="text-xs font-medium text-white truncate">{opt.label}</span>
                </div>
                <span className="text-[11px] font-mono text-white/70 tabular-nums shrink-0">
                  {Math.round(pct)}% · {opt.votes}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 text-[10px] text-white/40 text-center">
        {poll.totalVotes} {poll.totalVotes === 1 ? "stemme" : "stemmer"} totalt
      </p>
    </div>
  );
}
