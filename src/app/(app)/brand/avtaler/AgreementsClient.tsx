"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, X, Check, AlertCircle, Send, Ban, FileCheck } from "lucide-react";

type Status = "DRAFT" | "PENDING_CREATOR" | "ACTIVE" | "EXPIRED" | "REVOKED";

interface Creator {
  id:        string;
  name:      string | null;
  username:  string;
  avatarUrl: string | null;
}

interface Agreement {
  id:              string;
  creatorId:       string;
  brandName:       string;
  brandOrgNumber:  string | null;
  contactEmail:    string;
  contactPhone:    string | null;
  workDescription: string;
  periodStart:     string;
  periodEnd:       string;
  compensation:    string | null;
  status:          Status;
  sponsorSignedAt: string | null;
  creatorSignedAt: string | null;
  revokedAt:       string | null;
  revokedReason:   string | null;
  createdAt:       string;
  updatedAt:       string;
  creator: Creator;
}

const STATUS_META: Record<Status, { label: string; bg: string; fg: string }> = {
  DRAFT:           { label: "Utkast",            bg: "rgba(255,255,255,0.08)",  fg: "#a3a3a3" },
  PENDING_CREATOR: { label: "Avventer creator",  bg: "rgba(251,191,36,0.15)",   fg: "#fbbf24" },
  ACTIVE:          { label: "Aktiv",             bg: "rgba(94,234,212,0.15)",   fg: "#5EEAD4" },
  EXPIRED:         { label: "Utløpt",            bg: "rgba(255,255,255,0.06)",  fg: "rgba(255,255,255,0.4)" },
  REVOKED:         { label: "Avsluttet",         bg: "rgba(244,114,182,0.12)",  fg: "#F472B6" },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  sponsorDefaults: { brandName: string; orgNumber: string; contactEmail: string; contactPhone: string };
  threadCreators:  Creator[];
  initialAgreements: Agreement[];
}

export default function AgreementsClient({ sponsorDefaults, threadCreators, initialAgreements }: Props) {
  const router = useRouter();
  const [agreements, setAgreements] = useState<Agreement[]>(initialAgreements);
  const [creating, setCreating]     = useState(false);

  function onCreated(a: Agreement) {
    setAgreements((prev) => [a, ...prev]);
    setCreating(false);
    router.refresh();
  }

  async function action(id: string, body: { action: string; reason?: string }) {
    const res = await fetch(`/api/sponsor/agreements/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json() as { agreement: Agreement };
      setAgreements((prev) => prev.map((a) => a.id === id ? { ...a, ...data.agreement } : a));
      router.refresh();
    } else {
      const data = await res.json() as { error?: string };
      alert(data.error ?? "Noe gikk galt");
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
          {agreements.length} {agreements.length === 1 ? "avtale" : "avtaler"}
        </h2>
        {threadCreators.length > 0 && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#A855F7", color: "#fff" }}
          >
            <Plus className="h-3.5 w-3.5" /> Ny avtale
          </button>
        )}
      </div>

      {agreements.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
          <FileCheck className="mx-auto mb-3 h-7 w-7 text-white/30" />
          <p className="text-sm text-white/60">Ingen avtaler enda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agreements.map((a) => (
            <AgreementCard key={a.id} agreement={a} onAction={(body) => void action(a.id, body)} />
          ))}
        </div>
      )}

      {creating && (
        <CreateModal
          defaults={sponsorDefaults}
          threadCreators={threadCreators}
          onClose={() => setCreating(false)}
          onCreated={onCreated}
        />
      )}
    </>
  );
}

function AgreementCard({ agreement, onAction }: { agreement: Agreement; onAction: (b: { action: string; reason?: string }) => void }) {
  const [confirm, setConfirm] = useState<"send" | "revoke" | null>(null);
  const [reason,  setReason]  = useState("");
  const meta = STATUS_META[agreement.status];

  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--bg-glass)", borderColor: "var(--border-subtle)" }}>
      <div className="flex items-start gap-4">
        {agreement.creator.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={agreement.creator.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold">
            {(agreement.creator.name ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="font-semibold">{agreement.creator.name ?? "Ukjent"}</p>
            <p className="text-xs text-white/40">@{agreement.creator.username}</p>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: meta.bg, color: meta.fg }}>
              {meta.label}
            </span>
          </div>
          <p className="mt-2 text-xs text-white/70">
            Periode: {fmtDate(agreement.periodStart)} – {fmtDate(agreement.periodEnd)}
            {agreement.compensation && ` · ${agreement.compensation}`}
          </p>
          <p className="mt-1 text-xs text-white/50 line-clamp-2">{agreement.workDescription}</p>
          {agreement.revokedReason && (
            <p className="mt-2 text-[11px] text-pink-300">
              Avsluttet-grunn: {agreement.revokedReason}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          {agreement.status === "DRAFT" && (
            <button
              onClick={() => setConfirm("send")}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#A855F7", color: "#fff" }}
            >
              <Send className="h-3 w-3" /> Send
            </button>
          )}
          {(agreement.status === "ACTIVE" || agreement.status === "PENDING_CREATOR") && (
            <button
              onClick={() => setConfirm("revoke")}
              className="flex items-center gap-1 rounded-lg border border-pink-500/30 px-2 py-1 text-[11px] font-semibold text-pink-300 hover:border-pink-500/50"
            >
              <Ban className="h-3 w-3" /> Avslutt
            </button>
          )}
        </div>
      </div>

      {confirm === "send" && (
        <div className="mt-3 rounded-lg border border-purple-500/30 bg-purple-500/[0.06] p-3 text-xs">
          <p className="mb-2 text-white/80">
            Sende avtalen til {agreement.creator.name ?? "creator"} for signering? Du kan ikke redigere etter sending.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirm(null)} className="flex-1 rounded-md border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5">Avbryt</button>
            <button onClick={() => { onAction({ action: "send" }); setConfirm(null); }}
                    className="flex-1 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500">
              Send
            </button>
          </div>
        </div>
      )}

      {confirm === "revoke" && (
        <div className="mt-3 rounded-lg border border-pink-500/30 bg-pink-500/[0.06] p-3 text-xs">
          <p className="mb-2 text-white/80">Avslutte avtalen før perioden er over?</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Grunn (valgfritt) — vises for creator"
            rows={2}
            className="mb-2 w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/30"
          />
          <div className="flex gap-2">
            <button onClick={() => { setConfirm(null); setReason(""); }} className="flex-1 rounded-md border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5">Avbryt</button>
            <button onClick={() => { onAction({ action: "revoke", reason }); setConfirm(null); setReason(""); }}
                    className="flex-1 rounded-md bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-500">
              Avslutt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateModal({
  defaults, threadCreators, onClose, onCreated,
}: {
  defaults:       Props["sponsorDefaults"];
  threadCreators: Creator[];
  onClose:        () => void;
  onCreated:      (a: Agreement) => void;
}) {
  const [creatorId,      setCreatorId]      = useState(threadCreators[0]?.id ?? "");
  const [brandName,      setBrandName]      = useState(defaults.brandName);
  const [orgNumber,      setOrgNumber]      = useState(defaults.orgNumber);
  const [contactEmail,   setContactEmail]   = useState(defaults.contactEmail);
  const [contactPhone,   setContactPhone]   = useState(defaults.contactPhone);
  const [periodStart,    setPeriodStart]    = useState(new Date().toISOString().slice(0, 10));
  const [periodEnd,      setPeriodEnd]      = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [compensation,   setCompensation]   = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [send,           setSend]           = useState(true);
  const [busy,           setBusy]           = useState(false);
  const [err,            setErr]            = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/sponsor/agreements", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        creatorId, brandName, brandOrgNumber: orgNumber, contactEmail, contactPhone,
        workDescription, periodStart, periodEnd, compensation, send,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json() as { agreement: Agreement };
      onCreated(data.agreement);
    } else {
      const data = await res.json() as { error?: string };
      setErr(data.error ?? "Noe gikk galt");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60" onClick={onClose}>
      <div className="relative h-full w-full max-w-lg overflow-y-auto bg-zinc-900 border-l border-zinc-800 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Ny sponsoravtale</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Field label="Creator" required>
            <select
              value={creatorId}
              onChange={(e) => setCreatorId(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none"
              required
            >
              {threadCreators.map((c) => (
                <option key={c.id} value={c.id}>{c.name ?? c.username} (@{c.username})</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-white/40">Bare creators du har akseptert henvendelse med vises her.</p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Brand-navn" required>
              <input value={brandName} onChange={(e) => setBrandName(e.target.value)} className="input" required />
            </Field>
            <Field label="Org.nummer">
              <input value={orgNumber} onChange={(e) => setOrgNumber(e.target.value)} className="input" placeholder="999 999 999" />
            </Field>
            <Field label="Kontakt-e-post" required>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="input" required />
            </Field>
            <Field label="Telefon">
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="input" placeholder="+47 ..." />
            </Field>
            <Field label="Periode fra" required>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="input" required />
            </Field>
            <Field label="Periode til" required>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="input" required />
            </Field>
          </div>

          <Field label="Vederlag (valgfritt)">
            <input value={compensation} onChange={(e) => setCompensation(e.target.value)} className="input"
                   placeholder="f.eks. 10 000 NOK ekskl. mva, eller gratis varer" />
            <p className="mt-1 text-[11px] text-white/40">Intraa er ikke involvert i betaling. Dette feltet er kun for dokumentasjon.</p>
          </Field>

          <Field label="Beskrivelse av arbeidet" required>
            <textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              rows={5}
              className="input"
              placeholder="Hva skal creator levere? Antall innlegg, broadcasts, stories, eksklusivitet, content-retningslinjer, osv."
              maxLength={4000}
              required
            />
            <p className="mt-1 text-[11px] text-white/40">{workDescription.length}/4000</p>
          </Field>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/60">
            <p className="mb-1 font-semibold text-white/80">Standard-disclaimer (legges automatisk til):</p>
            <p>
              Intraa AS er ikke juridisk eller økonomisk part i avtalen — vi fasiliterer kun
              dokumentasjonen. Avtalen er kun mellom sponsor og creator. Betaling og oppfølging
              skjer direkte mellom partene.
            </p>
          </div>

          <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
            <input
              type="checkbox"
              checked={send}
              onChange={(e) => setSend(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-purple-500"
            />
            <span>
              <span className="font-semibold text-white">Signer og send til creator nå</span>
              <span className="block text-white/50">
                Hvis du skrur av denne lagres avtalen som utkast — du kan redigere og sende senere.
              </span>
            </span>
          </label>

          {err && (
            <div className="flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle className="h-3.5 w-3.5" /> {err}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
                    className="flex-1 rounded-lg border border-white/15 px-3 py-2.5 text-sm hover:bg-white/5">
              Avbryt
            </button>
            <button type="submit" disabled={busy}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50">
              {busy
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Oppretter…</>
                : <><Check className="h-4 w-4" /> {send ? "Signer og send" : "Lagre som utkast"}</>}
            </button>
          </div>
        </form>

        <style jsx>{`
          .input {
            width: 100%;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            background: rgba(255, 255, 255, 0.05);
            padding: 8px 12px;
            font-size: 14px;
            color: white;
            outline: none;
          }
          .input:focus { border-color: rgba(168, 85, 247, 0.5); }
          .input::placeholder { color: rgba(255, 255, 255, 0.3); }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-white/60">
        {label}{required && <span className="text-pink-400"> *</span>}
      </span>
      {children}
    </label>
  );
}
