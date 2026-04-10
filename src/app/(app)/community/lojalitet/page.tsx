"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/context/OrgContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShopItemData {
  id:            string;
  name:          string;
  description:   string | null;
  type:          string;
  value:         string;
  coinCost:      number;
  fanpassOnly: boolean;
  purchased:     boolean;
}

interface Transaction {
  id:          string;
  amount:      number;
  reason:      string;
  description: string;
  createdAt:   string;
}

interface StatsData {
  coins:      number;
  fanpass: { endDate: string; status: string } | null;
  thisMonth:  { earned: number; logins: number; posts: number; comments: number };
  recentTransactions: Transaction[];
  allTransactions:    Transaction[];
  shopItems:          ShopItemData[];
}

type Tab = "oversikt" | "shop" | "fanpass" | "historikk";
type HistoryFilter = "alle" | "tjent" | "brukt";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REASON_ICONS: Record<string, string> = {
  post:             "📝",
  comment:          "💬",
  login:            "🔑",
  stream:           "📺",
  purchase:         "🛍️",
  fanpass_bonus: "🎫",
  clicker:          "🖱️",
  admin_grant:      "🎁",
  chat:             "💬",
};

const SHOP_TYPE_LABELS: Record<string, string> = {
  BADGE:         "🏷️ Badges",
  NAME_COLOR:    "🎨 Navnefarger",
  VIP_ROLE:      "👑 VIP",
  CHAT_EFFECT:   "✨ Effekter",
  PROFILE_FRAME: "🖼️ Profilrammer",
};

function fmt(date: string) {
  return new Date(date).toLocaleDateString("no-NO", { day: "2-digit", month: "short", year: "numeric" });
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "nå nettopp";
  if (m < 60) return `${m}m siden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}t siden`;
  return `${Math.floor(h / 24)}d siden`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CoinCard({ coins, coinsPerSecond }: { coins: number; coinsPerSecond: number }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6">
      <p className="text-sm text-violet-200">Din coin-balanse</p>
      <p className="text-5xl font-bold text-white">{coins.toLocaleString("no-NO")}</p>
      {coinsPerSecond > 0 && (
        <p className="mt-1 text-sm text-violet-300">🚀 {coinsPerSecond}/sek passiv inntjening</p>
      )}
    </div>
  );
}

function FanpassStatus({
  fanpass,
  orgId,
  orgName,
  onActivated,
}: {
  fanpass: { endDate: string; status: string } | null;
  orgId:      string;
  orgName:    string;
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

  if (fanpass) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-emerald-400">Fanpass aktiv</p>
            <p className="text-sm text-zinc-400">Utløper {fmt(fanpass.endDate)}</p>
          </div>
          <div className="ml-auto rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400">
            1.5x coin-multiplier aktiv
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-violet-300">🎫 Fanpass — 59 kr/mnd</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-400">
            <li>✅ 1.5x coins på alle aktiviteter</li>
            <li>✅ Eksklusive shop-items</li>
            <li>✅ Fanpass-badge ved navn</li>
            <li>✅ Støtt {orgName} direkte</li>
          </ul>
        </div>
        <button
          onClick={() => void activate()}
          disabled={activating}
          className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {activating ? "Aktiverer…" : "Aktiver"}
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function ShopGrid({
  items,
  coins,
  hasFanpass,
  orgId,
  onPurchased,
}: {
  items:        ShopItemData[];
  coins:        number;
  hasFanpass: boolean;
  orgId:        string;
  onPurchased:  (itemId: string) => void;
}) {
  const [confirm,    setConfirm]    = useState<ShopItemData | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [toast,      setToast]      = useState<string | null>(null);

  async function confirmPurchase(item: ShopItemData) {
    setPurchasing(true);
    const res = await fetch("/api/shop/purchase", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ shopItemId: item.id, orgId }),
    });
    setPurchasing(false);
    setConfirm(null);
    if (res.ok) {
      onPurchased(item.id);
      setToast(`🎉 ${item.name} er nå ditt!`);
      setTimeout(() => setToast(null), 3000);
    }
  }

  const grouped = Object.entries(SHOP_TYPE_LABELS).map(([type, label]) => ({
    type,
    label,
    items: items.filter((i) => i.type === type),
  })).filter((g) => g.items.length > 0);

  function ItemPreview({ item }: { item: ShopItemData }) {
    if (item.type === "NAME_COLOR") {
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: item.value + "33" }}>
          <span className="text-lg font-bold" style={{ color: item.value }}>Aa</span>
        </div>
      );
    }
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-2xl">
        {item.value}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <h3 className="mb-3 text-base font-semibold text-white">Bekreft kjøp</h3>
            <p className="mb-1 text-sm text-zinc-400">
              Kjøpe <strong className="text-white">{confirm.name}</strong> for{" "}
              <strong className="text-violet-400">{confirm.coinCost.toLocaleString("no-NO")} coins</strong>?
            </p>
            <p className="mb-5 text-sm text-zinc-500">
              Du har <strong className="text-white">{(coins - confirm.coinCost).toLocaleString("no-NO")} coins</strong> igjen etter kjøpet.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)}
                className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-400 hover:text-white">
                Avbryt
              </button>
              <button onClick={() => void confirmPurchase(confirm)} disabled={purchasing}
                className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
                {purchasing ? "Kjøper…" : "Kjøp nå"}
              </button>
            </div>
          </div>
        </div>
      )}

      {grouped.map(({ type, label, items: groupItems }) => (
        <div key={type}>
          <h3 className="mb-3 text-sm font-semibold text-white">{label}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groupItems.map((item) => {
              const canAfford = coins >= item.coinCost;
              const locked    = item.fanpassOnly && !hasFanpass;
              return (
                <div key={item.id}
                  className={`relative rounded-xl border bg-zinc-900 p-4 transition-colors ${
                    item.purchased ? "border-emerald-500/30" : "border-zinc-800 hover:border-zinc-700"
                  }`}>
                  {item.fanpassOnly && (
                    <span className="absolute right-3 top-3 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
                      FANPASS
                    </span>
                  )}
                  <div className="mb-3 flex items-center gap-3">
                    <ItemPreview item={item} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{item.name}</p>
                      {item.description && <p className="text-xs text-zinc-500">{item.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-violet-400">
                      {item.coinCost.toLocaleString("no-NO")} coins
                    </span>
                    {item.purchased ? (
                      <span className="text-sm text-emerald-400">Kjøpt ✓</span>
                    ) : (
                      <button
                        disabled={!canAfford || locked}
                        onClick={() => setConfirm(item)}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {locked ? "Fanpass" : !canAfford ? "Ikke råd" : "Kjøp"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FanpassTab({ orgId, orgName, hasFanpass, onActivated }: {
  orgId:        string;
  orgName:      string;
  hasFanpass: boolean;
  onActivated:  () => void;
}) {
  const BENEFITS = [
    "1.5x coins på alle aktiviteter",
    "Eksklusive shop-items",
    "Fanpass-badge ved navn",
    "Tilgang til Fanpass-eksklusiv shop",
    `Støtt ${orgName} direkte`,
  ];

  const TABLE_ROWS = [
    { label: "Coins ved innlogging",  free: "+5",    bp: "+8"   },
    { label: "Coins ved innlegg",     free: "+10",   bp: "+15"  },
    { label: "Coins ved kommentar",   free: "+3",    bp: "+5"   },
    { label: "Stream 30 min",         free: "+20",   bp: "+30"  },
    { label: "Daglig maks",           free: "~74",   bp: "~111" },
    { label: "Mnd maks (aktiv)",      free: "~1500", bp: "~2200"},
    { label: "Fanpass fornyelse",     free: "800 🪙", bp: "800 🪙"},
    { label: "Eksklusive items",      free: "❌",    bp: "✅"   },
    { label: "Fanpass badge",         free: "❌",    bp: "✅"   },
  ];

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
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left: info */}
      <div>
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">Fanpass</p>
          <p className="mt-1 text-3xl font-bold text-white">59 kr/mnd</p>
          <p className="mt-1 text-sm text-violet-200">Maks ut din coin-inntjening</p>
        </div>

        <div className="mb-6 space-y-2.5">
          {BENEFITS.map((b) => (
            <div key={b} className="flex items-center gap-3 text-sm text-zinc-300">
              <span className="text-emerald-400">✅</span> {b}
            </div>
          ))}
        </div>

        {!hasFanpass ? (
          <button
            onClick={() => void activate()}
            disabled={activating}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
          >
            {activating ? "Aktiverer…" : "Aktiver Fanpass"}
          </button>
        ) : (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-center text-sm font-semibold text-emerald-400">
            ✅ Fanpass er aktivt
          </div>
        )}
        <p className="mt-2 text-center text-xs text-zinc-600">
          Stripe-betaling kommer snart — nå aktiveres uten betaling (demo)
        </p>
      </div>

      {/* Right: comparison table */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-white">Free vs Fanpass</h3>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <div className="grid grid-cols-3 bg-zinc-800/50 px-4 py-2 text-xs font-semibold text-zinc-400">
            <span></span>
            <span className="text-center">Free</span>
            <span className="text-center text-violet-400">Fanpass</span>
          </div>
          {TABLE_ROWS.map((row, i) => (
            <div key={row.label}
              className={`grid grid-cols-3 items-center px-4 py-3 text-sm ${i < TABLE_ROWS.length - 1 ? "border-b border-zinc-800" : ""}`}>
              <span className="text-zinc-400">{row.label}</span>
              <span className="text-center text-zinc-500">{row.free}</span>
              <span className="text-center font-semibold text-violet-400">{row.bp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryTab({ transactions }: { transactions: Transaction[] }) {
  const [filter, setFilter] = useState<HistoryFilter>("alle");

  const filtered = transactions.filter((t) => {
    if (filter === "tjent") return t.amount > 0;
    if (filter === "brukt") return t.amount < 0;
    return true;
  });

  const totalEarned = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalSpent  = Math.abs(transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  return (
    <div>
      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-xs text-zinc-500">Totalt tjent</p>
          <p className="text-xl font-bold text-emerald-400">+{totalEarned.toLocaleString("no-NO")}</p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
          <p className="text-xs text-zinc-500">Totalt brukt</p>
          <p className="text-xl font-bold text-rose-400">-{totalSpent.toLocaleString("no-NO")}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        {(["alle", "tjent", "brukt"] as HistoryFilter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-zinc-800 py-12 text-zinc-600">
          <p className="text-sm">Ingen transaksjoner ennå</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {filtered.map((tx, i) => (
            <div key={tx.id}
              className={`flex items-center gap-3 px-5 py-3.5 ${i < filtered.length - 1 ? "border-b border-zinc-800" : ""}`}>
              <span className="text-xl">{REASON_ICONS[tx.reason] ?? "💰"}</span>
              <span className="flex-1 text-sm text-zinc-300">{tx.description}</span>
              <span className={`font-semibold tabular-nums ${tx.amount > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString("no-NO")}
              </span>
              <span className="w-20 text-right text-xs text-zinc-600">{timeAgo(tx.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LojalitetPage() {
  const { org } = useOrg();
  const [tab,    setTab]    = useState<Tab>("oversikt");
  const [data,   setData]   = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!org?.id) return;
    setLoading(true);
    const res = await fetch(`/api/loyalty/stats?orgId=${org.id}`);
    if (res.ok) setData(await res.json() as StatsData);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id]);

  const TABS: { id: Tab; label: string }[] = [
    { id: "oversikt",   label: "Oversikt"  },
    { id: "shop",       label: "Shop"      },
    { id: "fanpass", label: "Fanpass"},
    { id: "historikk",  label: "Historikk" },
  ];

  if (!org) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Lojalitet & Coins</h1>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-600">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-500" />
        </div>
      ) : !data ? (
        <p className="text-sm text-zinc-500">Kunne ikke laste data.</p>
      ) : (
        <>
          {/* ── TAB 1: OVERSIKT ── */}
          {tab === "oversikt" && (
            <div className="space-y-6">
              <CoinCard coins={data.coins} coinsPerSecond={0} />

              <FanpassStatus
                fanpass={data.fanpass}
                orgId={org.id}
                orgName={org.name}
                onActivated={loadData}
              />

              <div>
                <h2 className="mb-3 text-sm font-semibold text-white">Denne måneden</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Coins tjent"           value={data.thisMonth.earned}   />
                  <StatCard label="Innlogginger"          value={data.thisMonth.logins}   />
                  <StatCard label="Innlegg & kommentarer" value={data.thisMonth.posts + data.thisMonth.comments} />
                  <StatCard label="Coins totalt"          value={data.coins.toLocaleString("no-NO")} />
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-white">Siste aktivitet</h2>
                {data.recentTransactions.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 py-8 text-center text-sm text-zinc-600">
                    Ingen aktivitet ennå
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-zinc-800">
                    {data.recentTransactions.slice(0, 5).map((tx, i) => (
                      <div key={tx.id}
                        className={`flex items-center gap-3 px-5 py-3 ${i < 4 ? "border-b border-zinc-800" : ""}`}>
                        <span className="text-lg">{REASON_ICONS[tx.reason] ?? "💰"}</span>
                        <span className="flex-1 text-sm text-zinc-300">{tx.description}</span>
                        <span className={`text-sm font-semibold ${tx.amount > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount}
                        </span>
                        <span className="text-xs text-zinc-600">{timeAgo(tx.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: SHOP ── */}
          {tab === "shop" && (
            <ShopGrid
              items={data.shopItems}
              coins={data.coins}
              hasFanpass={!!data.fanpass}
              orgId={org.id}
              onPurchased={(itemId) => {
                setData((prev) =>
                  prev
                    ? {
                        ...prev,
                        shopItems: prev.shopItems.map((i) =>
                          i.id === itemId ? { ...i, purchased: true } : i
                        ),
                        coins: prev.coins - (prev.shopItems.find((i) => i.id === itemId)?.coinCost ?? 0),
                      }
                    : prev
                );
              }}
            />
          )}

          {/* ── TAB 3: FANPASS ── */}
          {tab === "fanpass" && (
            <FanpassTab
              orgId={org.id}
              orgName={org.name}
              hasFanpass={!!data.fanpass}
              onActivated={loadData}
            />
          )}

          {/* ── TAB 4: HISTORIKK ── */}
          {tab === "historikk" && (
            <HistoryTab transactions={data.allTransactions} />
          )}
        </>
      )}
    </div>
  );
}
