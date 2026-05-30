"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, AlertCircle, X, Calendar, Building2, Mail, Phone, Hash, Briefcase, FileCheck, Ban } from "lucide-react";

type Status = "DRAFT" | "PENDING_CREATOR" | "ACTIVE" | "EXPIRED" | "REVOKED";

interface Agreement {
  id:              string;
  sponsorId:       string;
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
  sponsor: { id: string; brandName: string; slug: string; logoUrl: string | null };
}

const STATUS_META: Record<Status, { label: string; bg: string; fg: string }> = {
  DRAFT:           { label: "Utkast",            bg: "rgba(255,255,255,0.08)", fg: "#a3a3a3" },
  PENDING_CREATOR: { label: "Trenger din signatur", bg: "rgba(251,191,36,0.18)", fg: "#fbbf24" },
  ACTIVE:          { label: "Aktiv",             bg: "rgba(94,234,212,0.15)",  fg: "#5EEAD4" },
  EXPIRED:         { label: "Utløpt",            bg: "rgba(255,255,255,0.06)", fg: "rgba(255,255,255,0.4)" },
  REVOKED:         { label: "Avsluttet",         bg: "rgba(244,114,182,0.12)", fg: "#F472B6" },
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export default function CreatorAgreementsList() {
  const [agreements, setAgreements] = useState<Agreement[] | null>(null);
  const [open,       setOpen]       = useState<Agreement | null>(null);

  useEffect(() => {
    void fetch("/api/sponsor/agreements")
      .then((r) => r.json() as Promise<{ asCreator: Agreement[] }>)
      .then((d) => setAgreements(d.asCreator))
      .catch(() => setAgreements([]));
  }, []);

  function onUpdated(a: Agreement) {
    setAgreements((prev) => (prev ?? []).map((x) => x.id === a.id ? { ...x, ...a } : x));
    setOpen((prev) => prev?.id === a.id ? { ...prev, ...a } : prev);
  }

  if (agreements === null) {
    return (
      <div className="flex items-center justify-center py-16 text-white/40">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (agreements.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
        <FileCheck className="mx-auto mb-3 h-7 w-7 text-white/30" />
        <p className="text-sm text-white/70 mb-1">Ingen sponsoravtaler enda</p>
        <p className="text-xs text-white/40 max-w-md mx-auto">
          Når en sponsor sender deg en formell avtale dukker den opp her. Du kan lese gjennom,
          signere digitalt eller avslå.
        </p>
      </div>
    );
  }

  const pendingCount = agreements.filter((a) => a.status === "PENDING_CREATOR").length;

  return (
    <>
      {pendingCount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2 text-xs text-amber-300">
          Du har {pendingCount} avtale{pendingCount === 1 ? "" : "r"} som venter på din signatur.
        </div>
      )}

      <div className="space-y-3">
        {agreements.map((a) => (
          <button
            key={a.id}
            onClick={() => setOpen(a)}
            className="w-full rounded-xl border p-4 text-left transition-colors hover:bg-white/[0.03]"
            style={{ background: "var(--bg-glass)", borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-start gap-3">
              {a.sponsor.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.sponsor.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold">
                  {a.sponsor.brandName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="font-semibold">{a.sponsor.brandName}</p>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: STATUS_META[a.status].bg, color: STATUS_META[a.status].fg }}>
                    {STATUS_META[a.status].label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/60">
                  {fmt(a.periodStart)} – {fmt(a.periodEnd)}
                  {a.compensation && <span className="text-white/40"> · {a.compensation}</span>}
                </p>
                <p className="mt-1 text-xs text-white/50 line-clamp-2">{a.workDescription}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <DetailModal agreement={open} onClose={() => setOpen(null)} onUpdated={onUpdated} />
      )}
    </>
  );
}

function DetailModal({ agreement, onClose, onUpdated }: {
  agreement: Agreement;
  onClose:   () => void;
  onUpdated: (a: Agreement) => void;
}) {
  const [confirm,  setConfirm]  = useState<"sign" | "revoke" | null>(null);
  const [reason,   setReason]   = useState("");
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState<string | null>(null);
  const meta = STATUS_META[agreement.status];

  async function action(body: { action: string; reason?: string }) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/sponsor/agreements/${agreement.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json() as { agreement: Agreement };
      onUpdated({ ...agreement, ...data.agreement });
      setConfirm(null);
      setReason("");
    } else {
      const data = await res.json() as { error?: string };
      setErr(data.error ?? "Noe gikk galt");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60" onClick={onClose}>
      <div className="relative h-full w-full max-w-lg overflow-y-auto bg-zinc-900 border-l border-zinc-800 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {agreement.sponsor.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agreement.sponsor.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-base font-bold">
                {agreement.sponsor.brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold">{agreement.sponsor.brandName}</p>
              <span className="inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: meta.bg, color: meta.fg }}>
                {meta.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <Section title="Avtale-detaljer">
          <DetailRow icon={<Building2 className="h-3.5 w-3.5" />} label="Brand">{agreement.brandName}</DetailRow>
          {agreement.brandOrgNumber && (
            <DetailRow icon={<Hash className="h-3.5 w-3.5" />} label="Org.nr">{agreement.brandOrgNumber}</DetailRow>
          )}
          <DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="E-post">
            <a href={`mailto:${agreement.contactEmail}`} className="text-purple-300 hover:underline">{agreement.contactEmail}</a>
          </DetailRow>
          {agreement.contactPhone && (
            <DetailRow icon={<Phone className="h-3.5 w-3.5" />} label="Telefon">{agreement.contactPhone}</DetailRow>
          )}
          <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Periode">
            {fmt(agreement.periodStart)} – {fmt(agreement.periodEnd)}
          </DetailRow>
          {agreement.compensation && (
            <DetailRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Vederlag">{agreement.compensation}</DetailRow>
          )}
        </Section>

        <Section title="Beskrivelse av arbeidet">
          <p className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed">{agreement.workDescription}</p>
        </Section>

        <Section title="Signering">
          <div className="space-y-2 text-xs">
            <p className={agreement.sponsorSignedAt ? "text-emerald-300" : "text-white/40"}>
              {agreement.sponsorSignedAt
                ? <>✓ Signert av sponsor {new Date(agreement.sponsorSignedAt).toLocaleString("nb-NO")}</>
                : "○ Ikke signert av sponsor"}
            </p>
            <p className={agreement.creatorSignedAt ? "text-emerald-300" : "text-white/40"}>
              {agreement.creatorSignedAt
                ? <>✓ Signert av deg {new Date(agreement.creatorSignedAt).toLocaleString("nb-NO")}</>
                : "○ Ikke signert av deg"}
            </p>
          </div>
        </Section>

        <Section title="Intraa-disclaimer">
          <p className="text-[11px] leading-relaxed text-white/50">
            Intraa AS fasiliterer kun dokumentet og er ikke part i avtalen. Avtalen er kun mellom
            sponsor og deg. Eventuell betaling, fakturering, levering og oppfølging skjer direkte
            mellom partene. Intraa kan ikke holdes ansvarlig for tvister, forsinkelser eller
            mislighold.
          </p>
        </Section>

        {agreement.revokedReason && (
          <div className="mb-4 rounded-lg border border-pink-500/30 bg-pink-500/[0.08] p-3 text-xs">
            <p className="font-semibold text-pink-300 mb-1">Avsluttet</p>
            <p className="text-pink-200/80">{agreement.revokedReason}</p>
          </div>
        )}

        {err && (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <AlertCircle className="h-3.5 w-3.5" /> {err}
          </div>
        )}

        {/* Actions */}
        {agreement.status === "PENDING_CREATOR" && confirm !== "sign" && (
          <div className="flex gap-2">
            <button onClick={() => setConfirm("revoke")}
                    className="flex-1 rounded-lg border border-pink-500/30 px-3 py-2.5 text-sm font-semibold text-pink-300 hover:border-pink-500/50">
              <Ban className="inline h-4 w-4 mr-1" /> Avslå
            </button>
            <button onClick={() => setConfirm("sign")}
                    className="flex-1 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
              <Check className="inline h-4 w-4 mr-1" /> Signer digitalt
            </button>
          </div>
        )}

        {confirm === "sign" && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.08] p-3 text-xs">
            <p className="mb-2 font-semibold text-emerald-300">Bekreft digital signatur</p>
            <p className="mb-3 text-white/70">
              Ved å klikke "Jeg signerer" bekrefter du at du har lest avtalen, godtar
              vilkårene, og at intraa-disclaimer-en er lest. Tidspunkt og din identitet registreres
              som digital signatur.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(null)} disabled={busy}
                      className="flex-1 rounded-md border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 disabled:opacity-50">Avbryt</button>
              <button onClick={() => void action({ action: "sign" })} disabled={busy}
                      className="flex-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                {busy ? <Loader2 className="inline h-3 w-3 animate-spin" /> : "Jeg signerer"}
              </button>
            </div>
          </div>
        )}

        {confirm === "revoke" && (
          <div className="rounded-lg border border-pink-500/30 bg-pink-500/[0.08] p-3 text-xs">
            <p className="mb-2 font-semibold text-pink-300">
              {agreement.status === "ACTIVE" ? "Avslutt avtalen" : "Avslå avtalen"}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Grunn (valgfritt) — sendes til sponsor"
              rows={2}
              className="mb-2 w-full rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/30"
            />
            <div className="flex gap-2">
              <button onClick={() => { setConfirm(null); setReason(""); }} disabled={busy}
                      className="flex-1 rounded-md border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 disabled:opacity-50">Avbryt</button>
              <button onClick={() => void action({ action: "revoke", reason })} disabled={busy}
                      className="flex-1 rounded-md bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-500 disabled:opacity-50">
                {busy ? <Loader2 className="inline h-3 w-3 animate-spin" /> : "Bekreft"}
              </button>
            </div>
          </div>
        )}

        {agreement.status === "ACTIVE" && confirm !== "revoke" && (
          <button onClick={() => setConfirm("revoke")}
                  className="w-full rounded-lg border border-pink-500/30 px-3 py-2.5 text-sm font-semibold text-pink-300 hover:border-pink-500/50">
            <Ban className="inline h-4 w-4 mr-1" /> Avslutt avtalen
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/50">{title}</p>
      {children}
    </div>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-start gap-2 text-sm last:mb-0">
      <span className="mt-0.5 shrink-0 text-white/40">{icon}</span>
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
        <div className="text-white/90">{children}</div>
      </div>
    </div>
  );
}

