"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Eye, EyeOff } from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/navigation";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import ProfilTab from "./ProfilTab";

type Tab = "profil" | "konto" | "fanpass" | "sikkerhet" | "varsler" | "personvern";

const TABS: { id: Tab; label: string }[] = [
  { id: "profil",     label: "Profil" },
  { id: "konto",      label: "Konto" },
  { id: "sikkerhet",  label: "Sikkerhet" },
  { id: "fanpass",    label: "Fanpass" },
  { id: "varsler",    label: "Varsler" },
  { id: "personvern", label: "Personvern" },
];

// ─── Notification config (maps UI labels → API field names) ───────────────────

const NOTIF_ROWS: {
  emailKey: string; pushKey: string; label: string; desc: string;
  iconBg: string; icon: React.ReactNode;
}[] = [
  {
    emailKey: "emailOnMessage", pushKey: "pushOnMessage",
    label: "Nye meldinger", desc: "Direkte meldinger fra andre",
    iconBg: "rgba(168,85,247,0.2)",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    emailKey: "emailOnTicket", pushKey: "pushOnTicket",
    label: "Ticket-oppdateringer", desc: "Statusendringer på dine tickets",
    iconBg: "rgba(251,191,36,0.15)",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="m8 21 4-4 4 4"/></svg>,
  },
  {
    emailKey: "emailOnComment", pushKey: "pushOnComment",
    label: "Kommentarer", desc: "Nye kommentarer på dine innlegg",
    iconBg: "rgba(52,211,153,0.15)",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  },
  {
    emailKey: "emailOnMention", pushKey: "pushOnMention",
    label: "Nevnt (@)", desc: "Når noen nevner deg i en melding",
    iconBg: "rgba(96,165,250,0.15)",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
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

function PushToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex h-6 w-10 shrink-0 items-center rounded-full px-0.5 transition-colors ${on ? "bg-[#A855F7]" : "bg-white/10"}`}
    >
      <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

function VarslerTab() {
  const [prefs,   setPrefs]   = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");
  const { supported, permission, subscribed, subscribe, unsubscribe } = usePushNotifications();

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
    <div className="max-w-2xl">
      {/* Push card */}
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">Enhetsvarsler</p>
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-[#A855F7]/35 bg-[#A855F7]/15 px-5 py-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#A855F7]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-white">Push-varsler</p>
          <p className="text-[13px] text-white/40">
            {!supported
              ? "Ikke støttet i denne nettleseren"
              : permission === "denied"
              ? "Blokkert — endre i nettleserinnstillinger"
              : subscribed
              ? "Aktivert på denne enheten"
              : "Få varsler selv når appen er lukket"}
          </p>
        </div>
        {supported && permission !== "denied" && (
          <button
            onClick={subscribed ? unsubscribe : subscribe}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              subscribed
                ? "border border-[#A855F7]/40 bg-[#A855F7]/30 text-white/70 hover:bg-[#A855F7]/40"
                : "bg-[#A855F7] text-white hover:bg-[#5a3de0]"
            }`}
          >
            {subscribed ? "Deaktiver" : "Aktiver"}
          </button>
        )}
      </div>

      {/* Notification type rows */}
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">Varseltyper</p>
      <div className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04]">
        {NOTIF_ROWS.map((n, i) => (
          <div
            key={n.emailKey}
            className={`flex items-center gap-3 px-5 py-4 ${i < NOTIF_ROWS.length - 1 ? "border-b border-white/[0.06]" : ""}`}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
              style={{ background: n.iconBg }}
            >
              {n.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] text-white">{n.label}</p>
              <p className="truncate text-[12px] text-white/35">{n.desc}</p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[11px] text-white/30">E-post</span>
                <PushToggle on={prefs[n.emailKey] ?? false} onToggle={() => setPrefs(p => ({ ...p, [n.emailKey]: !p[n.emailKey] }))} />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[11px] text-white/30">Push</span>
                <PushToggle on={prefs[n.pushKey] ?? false} onToggle={() => setPrefs(p => ({ ...p, [n.pushKey]: !p[n.pushKey] }))} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-2xl bg-[#A855F7] py-4 text-base font-medium text-white transition-colors hover:bg-[#5a3de0] disabled:opacity-50"
      >
        {saving ? "Lagrer..." : "Lagre innstillinger"}
      </button>
      {saved && <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-400"><Check className="h-4 w-4" /> Lagret</p>}
      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
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

// ─── Fanpass tab ──────────────────────────────────────────────────────────────

interface FanpassCommunity {
  orgId:       string;
  orgSlug:     string;
  orgName:     string;
  logoUrl:     string | null;
  accessMode:  "OPEN" | "FREEMIUM" | "EXCLUSIVE";
  hasFanpass:  boolean;
  endDate:     string | null;
  cancelled:   boolean;
  paidAmount:  number;
}

const FS = {
  surface:  "#0B1027",
  surface2: "#131A35",
  line:     "rgba(240,244,255,0.08)",
  text:     "#F0F4FF",
  muted:    "rgba(240,244,255,0.6)",
  subtle:   "rgba(240,244,255,0.4)",
  teal:     "#5EEAD4",
  purple:   "#A855F7",
  amber:    "#FBBF24",
} as const;

const FANPASS_PERKS = [
  { icon: "🎫", text: "Synlig ♛-badge ved navnet ditt i chat og feed" },
  { icon: "🌿", text: "1,5× klikk og 2× passiv inntekt i klikker-spillet" },
  { icon: "🪙", text: "1,5× coins fra alle daglige aktiviteter" },
  { icon: "🔒", text: "Tilgang til Fanpass-only kanaler og innhold" },
  { icon: "❤️", text: "Du støtter creatoren direkte" },
];

function FanpassTab() {
  const [communities, setCommunities] = useState<FanpassCommunity[] | null>(null);

  useEffect(() => {
    fetch("/api/user/fanpass-portfolio")
      .then((r) => r.ok ? r.json() as Promise<{ communities: FanpassCommunity[] }> : Promise.reject())
      .then((d) => setCommunities(d.communities))
      .catch(() => setCommunities([]));
  }, []);

  if (communities === null) {
    return <div className="py-12 text-center text-sm" style={{ color: FS.muted }}>Laster…</div>;
  }

  const activeOnes  = communities.filter((c) => c.hasFanpass);
  const availableIn = communities.filter((c) => !c.hasFanpass && c.accessMode !== "OPEN");

  return (
    <div className="flex flex-col gap-6">
      {/* Perks-oversikt — alltid synlig så folk ser hva Fanpass faktisk er */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: `linear-gradient(135deg, ${FS.teal}08, ${FS.purple}10)`,
          border:     `1px solid ${FS.purple}25`,
        }}
      >
        <p className="mb-3 text-sm font-semibold" style={{ color: FS.text }}>
          Hva er Fanpass?
        </p>
        <p className="mb-4 text-xs leading-relaxed" style={{ color: FS.muted }}>
          Fanpass er et månedlig medlemskap til ett spesifikt community. Du støtter
          creatoren direkte og får ekstra fordeler over hele Intraa.
        </p>
        <ul className="space-y-2">
          {FANPASS_PERKS.map((p) => (
            <li key={p.text} className="flex items-start gap-2 text-xs" style={{ color: FS.muted }}>
              <span className="shrink-0 text-sm">{p.icon}</span>
              <span>{p.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Aktive Fanpass */}
      {activeOnes.length > 0 && (
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: FS.subtle }}>
            Dine aktive Fanpass ({activeOnes.length})
          </p>
          <div className="flex flex-col gap-2">
            {activeOnes.map((c) => (
              <FanpassRow key={c.orgId} community={c} />
            ))}
          </div>
        </section>
      )}

      {/* Tilgjengelig i andre communities */}
      {availableIn.length > 0 && (
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: FS.subtle }}>
            Tilgjengelig i {availableIn.length} av dine communities
          </p>
          <div className="flex flex-col gap-2">
            {availableIn.map((c) => (
              <FanpassRow key={c.orgId} community={c} />
            ))}
          </div>
        </section>
      )}

      {activeOnes.length === 0 && availableIn.length === 0 && (
        <p className="text-center text-sm py-8" style={{ color: FS.subtle }}>
          Ingen av dine communities har Fanpass aktivert ennå.
        </p>
      )}
    </div>
  );
}

function FanpassRow({ community: c }: { community: FanpassCommunity }) {
  const endDateFmt = c.endDate
    ? new Date(c.endDate).toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" })
    : null;
  return (
    <a
      href={`/community/lojalitet?org=${c.orgId}`}
      className="nav-link flex items-center gap-3 rounded-xl px-4 py-3"
      style={{ background: FS.surface, border: `1px solid ${FS.line}` }}
    >
      {c.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
      ) : (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
          style={{ background: FS.surface2, color: FS.text }}
        >
          {c.orgName[0]?.toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: FS.text }}>{c.orgName}</p>
        <p className="text-xs" style={{ color: FS.subtle }}>
          {c.hasFanpass
            ? (c.cancelled ? `Sies opp ${endDateFmt}` : `Fornyes ${endDateFmt} · ${c.paidAmount} kr/mnd`)
            : `${c.paidAmount} kr/mnd`}
        </p>
      </div>
      {c.hasFanpass ? (
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0"
          style={{ background: `${FS.teal}15`, color: FS.teal, border: `1px solid ${FS.teal}30` }}
        >
          Aktiv ♛
        </span>
      ) : (
        <span className="text-xs font-semibold shrink-0" style={{ color: FS.purple }}>Aktiver →</span>
      )}
    </a>
  );
}

// ─── Sikkerhet-tab (2FA / TOTP) ───────────────────────────────────────────────

function SikkerhetTab() {
  const [status,    setStatus]    = useState<{ totpEnabled: boolean } | null>(null);
  const [setupData, setSetupData] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code,      setCode]      = useState("");
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisable, setShowDisable] = useState(false);

  useEffect(() => {
    fetch("/api/user/security-status")
      .then((r) => r.json() as Promise<{ totpEnabled: boolean }>)
      .then(setStatus)
      .catch(() => setStatus({ totpEnabled: false }));
  }, []);

  async function startSetup() {
    setBusy(true); setError("");
    const { setupTotp } = await import("@/server/actions/totp");
    const res = await setupTotp();
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setSetupData({ secret: res.secret, qrDataUrl: res.qrDataUrl });
  }

  async function confirmEnable() {
    setBusy(true); setError("");
    const { enableTotp } = await import("@/server/actions/totp");
    const res = await enableTotp(code);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setSuccess("2FA er nå aktivert. Du må oppgi koden ved neste innlogging.");
    setSetupData(null);
    setCode("");
    setStatus({ totpEnabled: true });
  }

  async function confirmDisable() {
    setBusy(true); setError("");
    const { disableTotp } = await import("@/server/actions/totp");
    const res = await disableTotp(disablePassword);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setSuccess("2FA er deaktivert.");
    setShowDisable(false);
    setDisablePassword("");
    setStatus({ totpEnabled: false });
  }

  if (!status) return <div className="py-12 text-center text-sm" style={{ color: FS.muted }}>Laster…</div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 text-base font-semibold" style={{ color: FS.text }}>To-faktor-autentisering (2FA)</h2>
        <p className="text-sm" style={{ color: FS.muted }}>
          Beskytt kontoen din med en ekstra kode fra autentiserings-appen din
          (Google Authenticator, 1Password, Authy, osv).
        </p>
      </div>

      {success && (
        <div className="rounded-lg p-3 text-sm" style={{ background: `${FS.teal}10`, border: `1px solid ${FS.teal}30`, color: FS.teal }}>
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-lg p-3 text-sm" style={{ background: "#F8717110", border: "1px solid #F8717140", color: "#F87171" }}>
          {error}
        </div>
      )}

      {/* ── Aktiv: vis disable-knapp ── */}
      {status.totpEnabled && !showDisable && (
        <div
          className="rounded-2xl p-5"
          style={{ background: `${FS.teal}08`, border: `1px solid ${FS.teal}30` }}
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${FS.teal}20`, color: FS.teal }}>✓</div>
            <div>
              <p className="text-sm font-semibold" style={{ color: FS.text }}>2FA er aktivert</p>
              <p className="text-xs" style={{ color: FS.muted }}>Innlogging krever nå koden fra autentiserings-appen.</p>
            </div>
          </div>
          <button
            onClick={() => { setShowDisable(true); setError(""); setSuccess(""); }}
            className="text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: "#F87171" }}
          >
            Skru av 2FA
          </button>
        </div>
      )}

      {status.totpEnabled && showDisable && (
        <div className="rounded-2xl p-5" style={{ background: FS.surface, border: `1px solid #F8717140` }}>
          <p className="mb-3 text-sm font-semibold" style={{ color: FS.text }}>Bekreft med passord for å skru av 2FA</p>
          <input
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder="Passordet ditt"
            className="mb-3 w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: FS.surface2, border: `1px solid ${FS.line}`, color: FS.text }}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => void confirmDisable()}
              disabled={busy || !disablePassword}
              className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ background: "#F87171", color: "#fff" }}
            >
              {busy ? "Deaktiverer…" : "Bekreft deaktivering"}
            </button>
            <button
              onClick={() => { setShowDisable(false); setDisablePassword(""); setError(""); }}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ color: FS.muted }}
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* ── Ikke aktiv: setup-flow ── */}
      {!status.totpEnabled && !setupData && (
        <button
          onClick={() => void startSetup()}
          disabled={busy}
          className="self-start rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ background: FS.teal, color: "#050816" }}
        >
          {busy ? "Genererer…" : "Sett opp 2FA"}
        </button>
      )}

      {!status.totpEnabled && setupData && (
        <div className="rounded-2xl p-5" style={{ background: FS.surface, border: `1px solid ${FS.line}` }}>
          <ol className="space-y-5 text-sm" style={{ color: FS.text }}>
            <li>
              <p className="mb-2 font-semibold">1. Skann QR-koden i autentiserings-appen din</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setupData.qrDataUrl} alt="QR-kode for 2FA" className="rounded-lg" style={{ background: "#fff", padding: 8 }} />
              <p className="mt-2 text-xs" style={{ color: FS.subtle }}>
                Kan ikke skanne? Skriv inn denne nøkkelen manuelt:
                <br />
                <code className="mt-1 inline-block break-all rounded px-2 py-1" style={{ background: FS.surface2, color: FS.teal, fontSize: 11 }}>{setupData.secret}</code>
              </p>
            </li>
            <li>
              <p className="mb-2 font-semibold">2. Skriv inn 6-sifret koden fra appen</p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="000000"
                className="w-32 rounded-lg px-3 py-2 text-center text-lg tracking-widest tabular-nums outline-none"
                style={{ background: FS.surface2, border: `1px solid ${FS.line}`, color: FS.text }}
                autoFocus
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void confirmEnable()}
                  disabled={busy || code.length !== 6}
                  className="rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50"
                  style={{ background: FS.teal, color: "#050816" }}
                >
                  {busy ? "Verifiserer…" : "Aktiver 2FA"}
                </button>
                <button
                  onClick={() => { setSetupData(null); setCode(""); setError(""); }}
                  className="rounded-lg px-4 py-2 text-sm font-medium"
                  style={{ color: FS.muted }}
                >
                  Avbryt
                </button>
              </div>
            </li>
          </ol>
        </div>
      )}
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
      {tab === "fanpass"       && <FanpassTab />}
      {tab === "sikkerhet"     && <SikkerhetTab />}
      {tab === "varsler"       && <VarslerTab />}
      {tab === "personvern"    && <PersonvernTab />}
    </div>
  );
}
