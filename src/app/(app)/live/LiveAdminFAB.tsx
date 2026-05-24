"use client";

import { useState } from "react";
import { Plus, BarChart3, Gift, X, Crown, Loader2 } from "lucide-react";

interface Props {
  orgId:          string;
  onOpenPoll?:    () => void;
  onOpenGiveaway?: () => void;
  onOpenStudio?:  () => void;
}

type Modal = null | "poll" | "giveaway";

export default function LiveAdminFAB({ orgId, onOpenPoll, onOpenGiveaway, onOpenStudio }: Props) {
  const [open,  setOpen]  = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  function handlePoll() {
    setOpen(false);
    if (onOpenPoll) onOpenPoll();
    else            setModal("poll");
  }
  function handleGiveaway() {
    setOpen(false);
    if (onOpenGiveaway) onOpenGiveaway();
    else                setModal("giveaway");
  }

  return (
    <>
      {/* FAB */}
      <div className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {open && (
          <>
            {onOpenStudio && (
              <FabButton
                icon={<BarChart3 className="h-4 w-4" />}
                label="Åpne Studio"
                onClick={() => { onOpenStudio(); setOpen(false); }}
                color="#5EEAD4"
              />
            )}
            <FabButton
              icon={<BarChart3 className="h-4 w-4" />}
              label="Start avstemning"
              onClick={handlePoll}
              color="#A855F7"
            />
            <FabButton
              icon={<Gift className="h-4 w-4" />}
              label="Start giveaway"
              onClick={handleGiveaway}
              color="#FBBF24"
            />
          </>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-105"
          style={{
            background: open
              ? "rgba(255,255,255,0.10)"
              : "linear-gradient(135deg, #A855F7, #F472B6)",
            color:      "#fff",
            boxShadow:  open ? undefined : "0 8px 32px rgba(168,85,247,0.50)",
          }}
          title="Live-verktøy"
        >
          {open ? <X className="h-5 w-5" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>

      {modal === "poll"     && <PollModal     orgId={orgId} onClose={() => setModal(null)} />}
      {modal === "giveaway" && <GiveawayModal orgId={orgId} onClose={() => setModal(null)} />}
    </>
  );
}

// Export modals so other components (e.g., Studio) can use them
export { PollModal, GiveawayModal };

function FabButton({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-full pl-4 pr-5 py-2.5 text-xs font-semibold shadow-xl transition-transform hover:scale-105"
      style={{
        background: "var(--bg-secondary)",
        color:      "#fff",
        border:     `1px solid ${color}50`,
      }}
    >
      <span style={{ color }}>{icon}</span>
      {label}
    </button>
  );
}

// ─── Poll form (kan brukes inline eller i modal) ──────────────────────────────

export function PollForm({ orgId, onDone, onCancel }: { orgId: string; onDone: () => void; onCancel?: () => void }) {
  const [question, setQuestion] = useState("");
  const [options,  setOptions]  = useState<string[]>(["", ""]);
  const [duration, setDuration] = useState(60);
  const [sending,  setSending]  = useState(false);

  const canSubmit = question.trim().length > 0
                 && options.filter((o) => o.trim().length > 0).length >= 2;

  async function submit() {
    if (!canSubmit || sending) return;
    setSending(true);
    try {
      const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
      const res = await fetch("/api/live/polls", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orgId, question, options: cleanOptions, durationSec: duration }),
      });
      if (res.ok) {
        setQuestion(""); setOptions(["", ""]); setDuration(60);
        onDone();
      }
    } finally {
      setSending(false);
    }
  }

  function setOpt(i: number, val: string) {
    setOptions((p) => p.map((o, idx) => idx === i ? val : o));
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block mb-1 text-[11px] uppercase tracking-wider text-white/50">Spørsmål</label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="F.eks. Hvilken kart vil dere se?"
          maxLength={200}
          autoFocus
          className="w-full rounded-lg bg-white/[0.05] border border-white/[0.10] px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-500/40"
        />
      </div>

      <div>
        <label className="block mb-1 text-[11px] uppercase tracking-wider text-white/50">Alternativer (2-6)</label>
        <div className="space-y-1.5">
          {options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={o}
                onChange={(e) => setOpt(i, e.target.value)}
                placeholder={`Alternativ ${i + 1}`}
                maxLength={80}
                className="flex-1 rounded-lg bg-white/[0.05] border border-white/[0.10] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-500/40"
              />
              {options.length > 2 && (
                <button
                  onClick={() => setOptions((p) => p.filter((_, idx) => idx !== i))}
                  className="px-2 text-white/40 hover:text-rose-400"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 6 && (
          <button
            onClick={() => setOptions((p) => [...p, ""])}
            className="mt-2 text-[11px] text-violet-400 hover:text-violet-300"
          >
            + Legg til alternativ
          </button>
        )}
      </div>

      <div>
        <label className="block mb-1 text-[11px] uppercase tracking-wider text-white/50">Varighet: {duration}s</label>
        <input
          type="range"
          min={30} max={300} step={10}
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
          className="w-full accent-violet-500"
        />
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 text-sm text-white/60 hover:text-white"
          >
            Avbryt
          </button>
        )}
        <button
          onClick={() => void submit()}
          disabled={!canSubmit || sending}
          className="flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-transform hover:scale-[1.02] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #A855F7, #F472B6)", color: "#fff" }}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
          Start avstemning
        </button>
      </div>
    </div>
  );
}

function PollModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} title="Start avstemning" accent="#A855F7" icon={<BarChart3 className="h-4 w-4" />}>
      <PollForm orgId={orgId} onDone={onClose} />
    </ModalShell>
  );
}

// ─── Giveaway form (kan brukes inline eller i modal) ──────────────────────────

export function GiveawayForm({ orgId, onDone, onCancel }: { orgId: string; onDone: () => void; onCancel?: () => void }) {
  const [title,      setTitle]      = useState("");
  const [prize,      setPrize]      = useState("");
  const [duration,   setDuration]   = useState(300);
  const [fanpassOnly, setFanpassOnly] = useState(false);
  const [sending,    setSending]    = useState(false);

  const canSubmit = title.trim().length > 0 && prize.trim().length > 0;

  async function submit() {
    if (!canSubmit || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/live/giveaways", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orgId, title, prize, durationSec: duration, requireFanpass: fanpassOnly }),
      });
      if (res.ok) {
        setTitle(""); setPrize(""); setDuration(300); setFanpassOnly(false);
        onDone();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block mb-1 text-[11px] uppercase tracking-wider text-white/50">Tittel</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="F.eks. Sub-giveaway"
          maxLength={120}
          autoFocus
          className="w-full rounded-lg bg-white/[0.05] border border-white/[0.10] px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-500/40"
        />
      </div>

      <div>
        <label className="block mb-1 text-[11px] uppercase tracking-wider text-white/50">Premie</label>
        <input
          value={prize}
          onChange={(e) => setPrize(e.target.value)}
          placeholder="F.eks. 100 kr Steam-gavekort"
          maxLength={200}
          className="w-full rounded-lg bg-white/[0.05] border border-white/[0.10] px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-500/40"
        />
      </div>

      <div>
        <label className="block mb-1 text-[11px] uppercase tracking-wider text-white/50">
          Varighet: {duration < 60 ? `${duration}s` : `${Math.round(duration / 60)} min`}
        </label>
        <input
          type="range"
          min={60} max={1800} step={60}
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
          className="w-full accent-amber-500"
        />
      </div>

      <label className="flex items-center gap-2.5 rounded-lg cursor-pointer p-2 hover:bg-white/[0.04]">
        <input
          type="checkbox"
          checked={fanpassOnly}
          onChange={(e) => setFanpassOnly(e.target.checked)}
          className="accent-violet-500"
        />
        <Crown className="h-3.5 w-3.5" style={{ color: "#A855F7" }} />
        <span className="text-xs text-white">Kun for Fanpass-medlemmer</span>
      </label>

      <div className="flex gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 text-sm text-white/60 hover:text-white"
          >
            Avbryt
          </button>
        )}
        <button
          onClick={() => void submit()}
          disabled={!canSubmit || sending}
          className="flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-transform hover:scale-[1.02] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #FBBF24, #F472B6)", color: "#fff" }}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
          Start giveaway
        </button>
      </div>
    </div>
  );
}

function GiveawayModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} title="Start giveaway" accent="#FBBF24" icon={<Gift className="h-4 w-4" />}>
      <GiveawayForm orgId={orgId} onDone={onClose} />
    </ModalShell>
  );
}

function ModalShell({ children, onClose, title, accent, icon }: {
  children: React.ReactNode;
  onClose:  () => void;
  title:    string;
  accent:   string;
  icon:     React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,8,22,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
        style={{ background: "var(--bg-secondary)", border: `1px solid ${accent}40` }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `${accent}15`, color: accent }}
          >
            {icon}
          </div>
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="ml-auto text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
