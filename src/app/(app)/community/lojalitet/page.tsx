"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/context/OrgContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MembershipData {
  fanpass: { endDate: string; status: string } | null;
}

type Tab = "oversikt" | "fanpass";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString("no-NO", { day: "2-digit", month: "long", year: "numeric" });
}

const BENEFITS = [
  { icon: "🎫", title: "Fanpass-badge ved navn",           desc: "Vis frem at du støtter communityet i chat og feed" },
  { icon: "⚡", title: "Prioritert support",                desc: "Sakene dine behandles foran køen" },
  { icon: "🔭", title: "Tidlig tilgang til nye funksjoner", desc: "Test nye features før alle andre" },
  { icon: "🔒", title: "Eksklusiv Fanpass-kanal",           desc: "Privat kanal kun for Fanpass-medlemmer" },
  { icon: "❤️", title: "Du støtter Intraa direkte",          desc: "Bidrar til bedre tjeneste for hele communityet" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function BenefitList() {
  return (
    <div className="space-y-3">
      {BENEFITS.map((b) => (
        <div key={b.title} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <span className="mt-0.5 text-xl leading-none">{b.icon}</span>
          <div>
            <p className="text-sm font-semibold text-white">{b.title}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{b.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SmilekassenCard() {
  return (
    <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-5">
      <p className="font-semibold text-pink-300">💛 Vi gir tilbake</p>
      <p className="mt-1.5 text-sm text-zinc-400">
        En fast andel av alle Fanpass-inntekter doneres månedlig til{" "}
        <span className="font-medium text-white">Smilekassen</span>, en norsk veldedighet som
        støtter barn og unge med livstruende og alvorlig sykdom.
      </p>
    </div>
  );
}

function OversiktTab({
  fanpass,
  onGoToFanpass,
  orgId,
  onActivated,
}: {
  fanpass:       MembershipData["fanpass"];
  onGoToFanpass: () => void;
  orgId:         string;
  onActivated:   () => void;
}) {
  const [activating, setActivating] = useState(false);

  async function activate() {
    setActivating(true);
    const res = await fetch("/api/fanpass/activate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId }),
    });
    setActivating(false);
    if (res.ok) onActivated();
  }

  if (fanpass) {
    return (
      <div className="space-y-6">
        {/* Active status card */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎫</span>
            <div>
              <p className="text-lg font-bold text-emerald-400">Fanpass er aktivt</p>
              <p className="mt-0.5 text-sm text-zinc-400">Utløper {fmtDate(fanpass.endDate)}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-white">Dine fordeler</p>
          <BenefitList />
        </div>

        <SmilekassenCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Missing out card */}
      <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
        <p className="text-lg font-bold text-white">Du har ikke Fanpass</p>
        <p className="mt-1 text-sm text-zinc-400">
          Aktiver Fanpass for å få eksklusive fordeler og støtte communityet.
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-zinc-500">Hva du går glipp av</p>
        <div className="space-y-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex items-start gap-3 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 opacity-50">
              <span className="mt-0.5 text-xl leading-none">{b.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{b.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button
          onClick={() => void activate()}
          disabled={activating}
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
        >
          {activating ? "Aktiverer…" : "Aktiver Fanpass — 59 kr/mnd"}
        </button>
        <p className="mt-2 text-center text-xs text-zinc-600">Avbryt når som helst</p>
      </div>

      <SmilekassenCard />
    </div>
  );
}

function FanpassTab({
  orgId,
  hasFanpass,
  onActivated,
}: {
  orgId:       string;
  hasFanpass:  boolean;
  onActivated: () => void;
}) {
  const [activating, setActivating] = useState(false);

  async function activate() {
    setActivating(true);
    const res = await fetch("/api/fanpass/activate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId }),
    });
    setActivating(false);
    if (res.ok) onActivated();
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">Fanpass</p>
        <p className="mt-1 text-3xl font-bold text-white">59 kr/mnd</p>
        <p className="mt-1 text-sm text-violet-200">Støtt communityet og få eksklusive fordeler</p>
      </div>

      <BenefitList />

      <SmilekassenCard />

      {!hasFanpass ? (
        <div>
          <button
            onClick={() => void activate()}
            disabled={activating}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
          >
            {activating ? "Aktiverer…" : "Aktiver Fanpass"}
          </button>
          <p className="mt-2 text-center text-xs text-zinc-600">59 kr/mnd — avbryt når som helst</p>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3.5 text-center text-sm font-semibold text-emerald-400">
          ✅ Fanpass er aktivt
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LojalitetPage() {
  const { org }  = useOrg();
  const [tab,    setTab]    = useState<Tab>("oversikt");
  const [data,   setData]   = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!org?.id) return;
    setLoading(true);
    const res = await fetch(`/api/loyalty/stats?orgId=${org.id}`);
    if (res.ok) {
      const json = await res.json() as { fanpass: MembershipData["fanpass"] };
      setData({ fanpass: json.fanpass });
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id]);

  const TABS: { id: Tab; label: string }[] = [
    { id: "oversikt", label: "Oversikt" },
    { id: "fanpass",  label: "Fanpass"  },
  ];

  if (!org) return null;

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Medlemskap</h1>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-500" />
        </div>
      ) : !data ? (
        <p className="text-sm text-zinc-500">Kunne ikke laste data.</p>
      ) : (
        <>
          {tab === "oversikt" && (
            <OversiktTab
              fanpass={data.fanpass}
              onGoToFanpass={() => setTab("fanpass")}
              orgId={org.id}
              onActivated={loadData}
            />
          )}
          {tab === "fanpass" && (
            <FanpassTab
              orgId={org.id}
              hasFanpass={!!data.fanpass}
              onActivated={loadData}
            />
          )}
        </>
      )}
    </div>
  );
}
