"use client";

import { useState } from "react";
import { Check, MessageSquare, Globe, Monitor } from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";

type Tab = "konto" | "varsler" | "personvern" | "integrasjoner";

const TABS: { id: Tab; label: string }[] = [
  { id: "konto",          label: "Konto" },
  { id: "varsler",        label: "Varsler" },
  { id: "personvern",     label: "Personvern" },
  { id: "integrasjoner",  label: "Integrasjoner" },
];

const NOTIFICATIONS = [
  { id: "ny-melding",        label: "Nye meldinger",         desc: "Når noen sender deg en direkte melding" },
  { id: "ticket-oppdatering",label: "Ticket-oppdateringer",  desc: "Statusendringer på tickets du følger" },
  { id: "kommentar",         label: "Kommentarer",           desc: "Nye kommentarer på dine innlegg" },
  { id: "nevnt",             label: "Nevnt (@)",             desc: "Når noen nevner deg i en melding" },
  { id: "ny-fil",            label: "Nye filer",             desc: "Når noen laster opp filer i dine mapper" },
];

const INTEGRATIONS = [
  {
    id: "slack", name: "Slack", desc: "Motta varsler og send meldinger direkte fra Slack.",
    icon: MessageSquare, iconColor: "text-purple-400", iconBg: "bg-purple-500/10",
    connected: false,
  },
  {
    id: "google", name: "Google", desc: "Synkroniser Google Kalender og logg inn med Google.",
    icon: Globe, iconColor: "text-blue-400", iconBg: "bg-blue-500/10",
    connected: true,
  },
  {
    id: "microsoft", name: "Microsoft 365", desc: "Integrer med Teams, Outlook og OneDrive.",
    icon: Monitor, iconColor: "text-sky-400", iconBg: "bg-sky-500/10",
    connected: false,
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
        checked ? "bg-indigo-600" : "bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-4 text-sm font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

function inputClass() {
  return "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";
}

export default function InnstillingerPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("konto");

  // Konto
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  // Varsler
  const [emailNotif, setEmailNotif] = useState<Record<string, boolean>>({
    "ny-melding": true, "ticket-oppdatering": true, "kommentar": true, "nevnt": true, "ny-fil": false,
  });
  const [pushNotif, setPushNotif] = useState<Record<string, boolean>>({
    "ny-melding": true, "ticket-oppdatering": false, "kommentar": false, "nevnt": true, "ny-fil": false,
  });

  // Personvern
  const [profileVisibility, setProfileVisibility] = useState<"alle" | "medlemmer" | "ingen">("medlemmer");
  const [activityStatus, setActivityStatus]       = useState(true);
  const [showEmail, setShowEmail]                 = useState(false);

  // Integrasjoner
  const [connected, setConnected] = useState<Record<string, boolean>>(
    Object.fromEntries(INTEGRATIONS.map(i => [i.id, i.connected]))
  );

  // Populate name/email once user loads
  if (user && !name) { setName(user.name); setEmail(user.email); }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="animate-page mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Innstillinger</h1>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`btn-press flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Konto ── */}
      {tab === "konto" && (
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <Section title="Personlig informasjon">
            <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Fullt navn</label>
                <input className={inputClass()} value={name} onChange={e => setName(e.target.value)} placeholder="Ditt navn" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">E-postadresse</label>
                <input className={inputClass()} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.no" />
              </div>
            </div>
          </Section>

          <Section title="Endre passord">
            <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              {[
                { label: "Nåværende passord", placeholder: "••••••••" },
                { label: "Nytt passord",      placeholder: "Minst 8 tegn" },
                { label: "Bekreft passord",   placeholder: "••••••••" },
              ].map(f => (
                <div key={f.label}>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">{f.label}</label>
                  <input className={inputClass()} type="password" placeholder={f.placeholder} />
                </div>
              ))}
            </div>
          </Section>

          <div className="flex items-center gap-3">
            <button type="submit" className="btn-press rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
              Lagre endringer
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                <Check className="h-4 w-4" /> Lagret
              </span>
            )}
          </div>
        </form>
      )}

      {/* ── Varsler ── */}
      {tab === "varsler" && (
        <div>
          <div className="mb-2 hidden grid-cols-[1fr_80px_80px] items-center gap-4 px-5 sm:grid">
            <span />
            <span className="text-center text-xs font-semibold text-zinc-500">E-post</span>
            <span className="text-center text-xs font-semibold text-zinc-500">Push</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {NOTIFICATIONS.map((n, i) => (
              <div
                key={n.id}
                className={`grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[1fr_80px_80px] sm:items-center ${
                  i < NOTIFICATIONS.length - 1 ? "border-b border-zinc-800" : ""
                } hover:bg-zinc-900 transition-colors`}
              >
                <div>
                  <p className="text-sm font-medium text-white">{n.label}</p>
                  <p className="text-xs text-zinc-500">{n.desc}</p>
                </div>
                <div className="flex items-center gap-2 sm:justify-center">
                  <span className="text-xs text-zinc-500 sm:hidden">E-post</span>
                  <Toggle
                    checked={emailNotif[n.id] ?? false}
                    onChange={() => setEmailNotif(p => ({ ...p, [n.id]: !p[n.id] }))}
                  />
                </div>
                <div className="flex items-center gap-2 sm:justify-center">
                  <span className="text-xs text-zinc-500 sm:hidden">Push</span>
                  <Toggle
                    checked={pushNotif[n.id] ?? false}
                    onChange={() => setPushNotif(p => ({ ...p, [n.id]: !p[n.id] }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Personvern ── */}
      {tab === "personvern" && (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="mb-3 text-sm font-medium text-white">Hvem kan se profilen din?</p>
            <div className="flex flex-col gap-2">
              {(["alle", "medlemmer", "ingen"] as const).map(v => (
                <label key={v} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-800 transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value={v}
                    checked={profileVisibility === v}
                    onChange={() => setProfileVisibility(v)}
                    className="accent-indigo-500"
                  />
                  <span className="text-sm text-zinc-300 capitalize">{v === "alle" ? "Alle" : v === "medlemmer" ? "Kun medlemmer" : "Ingen"}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {[
              {
                label: "Vis aktivitetsstatus",
                desc: "Andre kan se om du er aktiv akkurat nå",
                checked: activityStatus,
                toggle: () => setActivityStatus(p => !p),
              },
              {
                label: "Vis e-postadresse",
                desc: "Andre medlemmer kan se e-postadressen din",
                checked: showEmail,
                toggle: () => setShowEmail(p => !p),
              },
            ].map((item, i) => (
              <div
                key={item.label}
                className={`flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-900 ${i === 0 ? "border-b border-zinc-800" : ""}`}
              >
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-zinc-500">{item.desc}</p>
                </div>
                <Toggle checked={item.checked} onChange={item.toggle} />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
            <p className="mb-1 text-sm font-semibold text-rose-400">Slett konto</p>
            <p className="mb-4 text-xs text-zinc-500">Sletter all data permanent. Kan ikke angres.</p>
            <button className="btn-press rounded-lg border border-rose-500/40 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors">
              Slett konto
            </button>
          </div>
        </div>
      )}

      {/* ── Integrasjoner ── */}
      {tab === "integrasjoner" && (
        <div className="flex flex-col gap-4">
          {INTEGRATIONS.map(intg => {
            const isConnected = connected[intg.id];
            return (
              <div key={intg.id} className="card-lift flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${intg.iconBg}`}>
                  <intg.icon className={`h-5 w-5 ${intg.iconColor}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{intg.name}</p>
                  <p className="text-xs text-zinc-500">{intg.desc}</p>
                </div>
                {isConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <Check className="h-3.5 w-3.5" /> Tilkoblet
                    </span>
                    <button
                      onClick={() => setConnected(p => ({ ...p, [intg.id]: false }))}
                      className="btn-press rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-rose-500/40 hover:text-rose-400 transition-colors"
                    >
                      Koble fra
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConnected(p => ({ ...p, [intg.id]: true }))}
                    className="btn-press rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                  >
                    Koble til
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
