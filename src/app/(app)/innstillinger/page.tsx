"use client";

import { useState, useEffect } from "react";
import { Check, MessageSquare, Monitor, Loader2, Eye, EyeOff } from "lucide-react";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/navigation";
import ProfilTab from "./ProfilTab";

type Tab = "profil" | "konto" | "abonnement" | "varsler" | "personvern" | "integrasjoner";

const TABS: { id: Tab; label: string }[] = [
  { id: "profil",        label: "Profil" },
  { id: "konto",         label: "Konto" },
  { id: "abonnement",    label: "Abonnement" },
  { id: "varsler",       label: "Varsler" },
  { id: "personvern",    label: "Personvern" },
  { id: "integrasjoner", label: "Integrasjoner" },
];

// ─── Notification config (maps UI labels → API field names) ───────────────────

const NOTIF_ROWS: { id: string; emailKey: string; pushKey: string; label: string; desc: string }[] = [
  { id: "message", emailKey: "emailOnMessage", pushKey: "pushOnMessage", label: "Nye meldinger",        desc: "Når noen sender deg en direkte melding" },
  { id: "ticket",  emailKey: "emailOnTicket",  pushKey: "pushOnTicket",  label: "Ticket-oppdateringer", desc: "Statusendringer på tickets du følger" },
  { id: "comment", emailKey: "emailOnComment", pushKey: "pushOnComment", label: "Kommentarer",          desc: "Nye kommentarer på dine innlegg" },
  { id: "mention", emailKey: "emailOnMention", pushKey: "pushOnMention", label: "Nevnt (@)",            desc: "Når noen nevner deg i en melding" },
  { id: "file",    emailKey: "emailOnFile",    pushKey: "pushOnFile",    label: "Nye filer",            desc: "Når noen laster opp filer i dine mapper" },
];

const INTEGRATIONS = [
  { id: "slack",     name: "Slack",         desc: "Motta varsler og send meldinger direkte fra Slack.",    icon: MessageSquare, iconColor: "text-purple-400", iconBg: "bg-purple-500/10", connected: false },
  { id: "microsoft", name: "Microsoft 365", desc: "Integrer med Teams, Outlook og OneDrive.",              icon: Monitor,       iconColor: "text-sky-400",    iconBg: "bg-sky-500/10",    connected: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${checked ? "bg-indigo-600" : "bg-zinc-700"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

function inputClass() {
  return "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500";
}

// ─── Konto tab ────────────────────────────────────────────────────────────────

function KontoTab() {
  const { user } = useUser();
  const router   = useRouter();

  // Email form
  const [email,       setEmail]       = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg,    setEmailMsg]    = useState<{ ok: boolean; text: string } | null>(null);

  // Password form
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showCur,    setShowCur]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [pwSaving,   setPwSaving]   = useState(false);
  const [pwMsg,      setPwMsg]      = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { if (user?.email && !email) setEmail(user.email); }, [user, email]);

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailSaving(true);
    setEmailMsg(null);
    const res = await fetch("/api/user/account", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json() as { error?: string; emailChanged?: boolean };
    if (res.ok) {
      setEmailMsg({ ok: true, text: "E-post oppdatert! Logg inn på nytt for å fortsette." });
      // Email changed — sign out
      if (data.emailChanged) {
        setTimeout(async () => {
          const { signOut } = await import("next-auth/react");
          await signOut({ redirect: false });
          router.push("/login");
        }, 2000);
      }
    } else {
      setEmailMsg({ ok: false, text: data.error ?? "Noe gikk galt" });
    }
    setEmailSaving(false);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: "Passordene stemmer ikke overens" }); return; }
    if (newPw.length < 8)    { setPwMsg({ ok: false, text: "Nytt passord må være minst 8 tegn" }); return; }
    setPwSaving(true);
    setPwMsg(null);
    const res = await fetch("/api/user/account", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json() as { error?: string };
    if (res.ok) {
      setPwMsg({ ok: true, text: "Passord oppdatert!" });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } else {
      setPwMsg({ ok: false, text: data.error ?? "Noe gikk galt" });
    }
    setPwSaving(false);
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Email */}
      <form onSubmit={saveEmail}>
        <h2 className="mb-4 text-sm font-semibold text-white">E-postadresse</h2>
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">E-postadresse</label>
            <input className={inputClass()} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.no" required />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={emailSaving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50">
              {emailSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Oppdater e-post
            </button>
            {emailMsg && (
              <span className={`text-sm ${emailMsg.ok ? "text-emerald-400" : "text-rose-400"}`}>
                {emailMsg.ok && <Check className="mr-1 inline h-4 w-4" />}{emailMsg.text}
              </span>
            )}
          </div>
        </div>
      </form>

      {/* Password */}
      <form onSubmit={savePassword}>
        <h2 className="mb-4 text-sm font-semibold text-white">Endre passord</h2>
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          {[
            { label: "Nåværende passord", val: currentPw, set: setCurrentPw, show: showCur, toggle: () => setShowCur(p => !p) },
            { label: "Nytt passord",      val: newPw,     set: setNewPw,     show: showNew, toggle: () => setShowNew(p => !p) },
            { label: "Bekreft passord",   val: confirmPw, set: setConfirmPw, show: showNew, toggle: null },
          ].map(f => (
            <div key={f.label}>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">{f.label}</label>
              <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 focus-within:border-indigo-500 transition-colors">
                <input
                  type={f.show ? "text" : "password"}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                />
                {f.toggle && (
                  <button type="button" onClick={f.toggle} className="ml-2 text-zinc-500 hover:text-zinc-300">
                    {f.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={pwSaving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50">
              {pwSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Oppdater passord
            </button>
            {pwMsg && (
              <span className={`text-sm ${pwMsg.ok ? "text-emerald-400" : "text-rose-400"}`}>
                {pwMsg.ok && <Check className="mr-1 inline h-4 w-4" />}{pwMsg.text}
              </span>
            )}
          </div>
        </div>
      </form>

      {/* Danger zone */}
      <div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
          <p className="mb-1 text-sm font-semibold text-rose-400">Slett konto</p>
          <p className="mb-4 text-xs text-zinc-500">Sletter all data permanent. Kan ikke angres.</p>
          <button type="button" className="rounded-lg border border-rose-500/40 px-4 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10">
            Slett konto
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Varsler tab ──────────────────────────────────────────────────────────────

type NotifPrefs = Record<string, boolean>;

const DEFAULT_PREFS: NotifPrefs = {
  emailOnMessage: true,  emailOnTicket: true,  emailOnComment: true,  emailOnMention: true,  emailOnFile: false,
  pushOnMessage:  true,  pushOnTicket:  false, pushOnComment:  false, pushOnMention:  true,  pushOnFile:  false,
};

function VarslerTab() {
  const [prefs,   setPrefs]   = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetch("/api/user/notifications")
      .then(r => r.ok ? r.json() as Promise<NotifPrefs> : Promise.reject())
      .then(data => setPrefs(data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/user/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else { const d = await res.json() as { error?: string }; setError(d.error ?? "Noe gikk galt"); }
    setSaving(false);
  }

  if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="hidden grid-cols-[1fr_80px_80px] gap-4 px-5 sm:grid w-full">
          <span />
          <span className="text-center text-xs font-semibold text-zinc-500">E-post</span>
          <span className="text-center text-xs font-semibold text-zinc-500">Push</span>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        {NOTIF_ROWS.map((n, i) => (
          <div key={n.id}
            className={`grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-zinc-900 sm:grid-cols-[1fr_80px_80px] sm:items-center ${
              i < NOTIF_ROWS.length - 1 ? "border-b border-zinc-800" : ""}`}
          >
            <div>
              <p className="text-sm font-medium text-white">{n.label}</p>
              <p className="text-xs text-zinc-500">{n.desc}</p>
            </div>
            <div className="flex items-center gap-2 sm:justify-center">
              <span className="text-xs text-zinc-500 sm:hidden">E-post</span>
              <Toggle checked={prefs[n.emailKey] ?? false} onChange={() => setPrefs(p => ({ ...p, [n.emailKey]: !p[n.emailKey] }))} />
            </div>
            <div className="flex items-center gap-2 sm:justify-center">
              <span className="text-xs text-zinc-500 sm:hidden">Push</span>
              <Toggle checked={prefs[n.pushKey] ?? false} onChange={() => setPrefs(p => ({ ...p, [n.pushKey]: !p[n.pushKey] }))} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Lagre varselinnstillinger
        </button>
        {saved  && <span className="flex items-center gap-1.5 text-sm text-emerald-400"><Check className="h-4 w-4" /> Lagret</span>}
        {error  && <span className="text-sm text-rose-400">{error}</span>}
      </div>
      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold text-zinc-400">Enhetsvarsler</p>
        <PushNotificationButton />
      </div>
    </div>
  );
}

// ─── Personvern tab ───────────────────────────────────────────────────────────

function PersonvernTab() {
  const [profileVisibility, setProfileVisibility] = useState<"alle" | "medlemmer" | "ingen">("medlemmer");
  const [activityStatus,    setActivityStatus]    = useState(true);
  const [showEmail,         setShowEmail]         = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="mb-3 text-sm font-medium text-white">Hvem kan se profilen din?</p>
        <div className="flex flex-col gap-2">
          {(["alle", "medlemmer", "ingen"] as const).map(v => (
            <label key={v} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-zinc-800">
              <input type="radio" name="visibility" value={v} checked={profileVisibility === v}
                onChange={() => setProfileVisibility(v)} className="accent-indigo-500" />
              <span className="text-sm text-zinc-300">{v === "alle" ? "Alle" : v === "medlemmer" ? "Kun medlemmer" : "Ingen"}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        {[
          { label: "Vis aktivitetsstatus", desc: "Andre kan se om du er aktiv akkurat nå", checked: activityStatus, toggle: () => setActivityStatus(p => !p) },
          { label: "Vis e-postadresse",    desc: "Andre medlemmer kan se e-postadressen din", checked: showEmail, toggle: () => setShowEmail(p => !p) },
        ].map((item, i) => (
          <div key={item.label} className={`flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-900 ${i === 0 ? "border-b border-zinc-800" : ""}`}>
            <div>
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-xs text-zinc-500">{item.desc}</p>
            </div>
            <Toggle checked={item.checked} onChange={item.toggle} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Integrasjoner tab ────────────────────────────────────────────────────────

function IntegrasjonerTab() {
  const [connected, setConnected] = useState<Record<string, boolean>>(
    Object.fromEntries(INTEGRATIONS.map(i => [i.id, i.connected]))
  );

  return (
    <div className="flex flex-col gap-4">
      {INTEGRATIONS.map(intg => {
        const isConnected = connected[intg.id];
        return (
          <div key={intg.id} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${intg.iconBg}`}>
              <intg.icon className={`h-5 w-5 ${intg.iconColor}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{intg.name}</p>
              <p className="text-xs text-zinc-500">{intg.desc}</p>
            </div>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-emerald-400"><Check className="h-3.5 w-3.5" /> Tilkoblet</span>
                <button onClick={() => setConnected(p => ({ ...p, [intg.id]: false }))}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-rose-500/40 hover:text-rose-400">
                  Koble fra
                </button>
              </div>
            ) : (
              <button onClick={() => setConnected(p => ({ ...p, [intg.id]: true }))}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500">
                Koble til
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Abonnement tab ───────────────────────────────────────────────────────────

function AbonnementTab() {
  const { user } = useUser();
  const plan = (user as { plan?: string } | null)?.plan ?? "FREE";
  const isPro = plan === "PRO" || plan === "ENTERPRISE";

  return (
    <div className="flex flex-col gap-6">
      {/* Current plan */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="mb-4 text-sm font-semibold text-white">Nåværende plan</p>
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${
            isPro ? "bg-indigo-500/20 text-indigo-400" : "bg-zinc-800 text-zinc-400"
          }`}>
            {isPro ? "★" : "☆"}
          </div>
          <div>
            <p className="text-base font-semibold text-white">
              {isPro ? (plan === "ENTERPRISE" ? "Enterprise" : "Pro") : "Gratis"}
            </p>
            <p className="text-xs text-zinc-500">
              {isPro
                ? "Du har tilgang til alle funksjoner."
                : "Grunnleggende funksjoner. Oppgrader for mer."}
            </p>
          </div>
          {isPro && (
            <span className="ml-auto rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-400">
              Aktiv
            </span>
          )}
        </div>
      </div>

      {/* Upgrade */}
      {!isPro && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
          <p className="mb-1 text-sm font-semibold text-white">Intraa Pro</p>
          <p className="mb-4 text-xs text-zinc-500">
            Fjern begrensninger, få prioritert support og tilgang til avanserte funksjoner.
          </p>
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-lg bg-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-400"
          >
            Oppgrader — Kommer snart
          </button>
        </div>
      )}

      {/* Feature comparison */}
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        {[
          { label: "Feed & innlegg",        free: true,  pro: true },
          { label: "Chat-kanaler",           free: true,  pro: true },
          { label: "Fillagring (500 MB)",    free: true,  pro: false },
          { label: "Fillagring (50 GB)",     free: false, pro: true },
          { label: "Ubegrenset medlemmer",   free: false, pro: true },
          { label: "Prioritert support",     free: false, pro: true },
          { label: "Avansert statistikk",    free: false, pro: true },
        ].map((row, i, arr) => (
          <div key={row.label}
            className={`flex items-center gap-4 px-5 py-3 text-sm ${i < arr.length - 1 ? "border-b border-zinc-800" : ""}`}
          >
            <span className="flex-1 text-zinc-300">{row.label}</span>
            <span className={`w-14 text-center text-xs font-semibold ${row.free ? "text-emerald-400" : "text-zinc-600"}`}>
              {row.free ? "✓" : "—"}
            </span>
            <span className={`w-14 text-center text-xs font-semibold ${row.pro ? "text-indigo-400" : "text-zinc-600"}`}>
              {row.pro ? "✓" : "—"}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-4 border-t border-zinc-800 bg-zinc-900/50 px-5 py-2 text-xs font-semibold">
          <span className="flex-1 text-zinc-500">Plan</span>
          <span className="w-14 text-center text-zinc-400">Gratis</span>
          <span className="w-14 text-center text-indigo-400">Pro</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InnstillingerPage() {
  const [tab, setTab] = useState<Tab>("profil");

  return (
    <div className="animate-page mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Innstillinger</h1>

      <div className="mb-8 flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`btn-press flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profil"        && <ProfilTab />}
      {tab === "konto"         && <KontoTab />}
      {tab === "abonnement"    && <AbonnementTab />}
      {tab === "varsler"       && <VarslerTab />}
      {tab === "personvern"    && <PersonvernTab />}
      {tab === "integrasjoner" && <IntegrasjonerTab />}
    </div>
  );
}
