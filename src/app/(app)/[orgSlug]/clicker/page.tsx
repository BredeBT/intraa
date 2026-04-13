"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WORLDS, getWorldUpgrades, getUpgradeCost } from "@/lib/clickerUpgrades";
import { Coins, Zap, Clock, Trophy, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClickerProfile {
  id:               string;
  coins:            number;
  allTimeHighCoins: number;
  totalClicks:      number;
  coinsPerClick:    number;
  coinsPerSecond:   number;
  lastSeen:         string;
  prestigeLevel:    number;
  prestigeWorld:    number;
  permanentBonus:   number;
  totalPrestige:    number;
}

interface UpgradeState {
  upgradeId: string;
  level:     number;
}

interface LeaderboardEntry {
  allTimeHighCoins: number;
  totalClicks:      number;
  prestigeWorld:    number;
  user:             { id: string; name: string | null; avatarUrl: string | null };
}

interface ActiveEvent {
  type:       string;
  multiplier: number;
  endsAt:     string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toLocaleString("no-NO");
}

function fmtTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return null as unknown as string;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}t ${m}min`;
  if (m > 0) return `${m}min`;
  return `${Math.ceil(seconds)}s`;
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

interface FloatItem { id: number; x: number; y: number; value: number }

// ─── Component ────────────────────────────────────────────────────────────────

// MOBIL-MØNSTER: Bruk tabs for alle spill med flere seksjoner
// Tab 1: Spill (klikk-knapp + stats + leaderboard)
// Tab 2: Statistikk/verdener
// Tab 3: Shop/Oppgraderinger

// ── localStorage cache keys ───────────────────────────────────────────────────
const CK = {
  coins:       "clicker_coins",
  profile:     "clicker_profile",
  upgrades:    "clicker_upgrades",
  totalClicks: "clicker_totalClicks",
} as const;

// Safe localStorage wrapper — Chrome incognito and some embedded WebViews throw
// on any localStorage access; this prevents crashes in those environments.
const ls = {
  get:    (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } },
  set:    (key: string, value: string): void => { try { localStorage.setItem(key, value); } catch { /* quota / access denied */ } },
  remove: (key: string): void => { try { localStorage.removeItem(key); } catch { /* access denied */ } },
};

function writeCache(profile: ClickerProfile, upgrades: UpgradeState[], coins?: number) {
  ls.set(CK.profile,     JSON.stringify(profile));
  ls.set(CK.upgrades,    JSON.stringify(upgrades));
  ls.set(CK.totalClicks, String(profile.totalClicks));
  if (coins !== undefined) ls.set(CK.coins, String(Math.floor(coins)));
}

function clearCache() {
  Object.values(CK).forEach((k) => ls.remove(k));
}

export default function ClickerPage() {
  const [mobileTab,     setMobileTab]     = useState<"klikker" | "verdener" | "oppgraderinger">("klikker");
  const [orgId,         setOrgId]         = useState<string | null>(null);
  const [profile,       setProfile]       = useState<ClickerProfile | null>(null);
  const [upgrades,      setUpgrades]      = useState<UpgradeState[]>([]);
  const [leaderboard,   setLeaderboard]   = useState<LeaderboardEntry[]>([]);
  const [activeEvent,   setActiveEvent]   = useState<ActiveEvent | null>(null);
  const [offlineMsg,    setOfflineMsg]    = useState<number | null>(null);
  const [floats,        setFloats]        = useState<FloatItem[]>([]);
  // clicking state removed — handled by CSS :active on the button
  const [buying,        setBuying]        = useState<string | null>(null);
  const [displayCoins,  setDisplayCoins]  = useState(0);
  const [logoUrl,       setLogoUrl]       = useState<string | null>(null);
  const [prestigeModal, setPrestigeModal] = useState(false);
  const [prestiging,    setPrestiging]    = useState(false);
  const [totalClicks,   setTotalClicks]   = useState(0);
  const [hasFanpass,    setHasFanpass]    = useState(false);

  // Coin state: server-confirmed value + local delta accumulated since last sync
  const serverCoins    = useRef(0);
  const localDelta     = useRef(0);
  const clickCount     = useRef(0); // raw click count for totalClicks
  const totalClicksRef = useRef(0); // mirrors totalClicks state for use in effects
  const floatId        = useRef(0);
  const orgIdRef       = useRef<string | null>(null);

  // ── Restore from localStorage on mount (before DB fetch) ─────────────────
  useEffect(() => {
    try {
      const p = ls.get(CK.profile);
      if (p) {
        const parsed = JSON.parse(p) as ClickerProfile;
        // Guard against null/NaN from cache written by old buggy code
        const cachedCoins = parseFloat(ls.get(CK.coins) ?? "");
        const profileCoins = typeof parsed.coins === "number" ? parsed.coins : 0;
        const coins = isFinite(cachedCoins) ? cachedCoins : profileCoins;
        setProfile(parsed);
        serverCoins.current = coins;
        setDisplayCoins(coins);
      }
      const u = ls.get(CK.upgrades);
      if (u) setUpgrades(JSON.parse(u) as UpgradeState[]);
      const tc = ls.get(CK.totalClicks);
      if (tc) {
        const parsed = parseInt(tc, 10);
        if (isFinite(parsed)) setTotalClicks(parsed);
      }
    } catch { /* stale/corrupt cache — ignore */ }
  }, []);

  // ── Persist displayCoins to localStorage ─────────────────────────────────
  useEffect(() => {
    ls.set(CK.coins, String(Math.floor(displayCoins)));
  }, [displayCoins]);

  // ── Keep totalClicksRef in sync ──────────────────────────────────────────
  useEffect(() => { totalClicksRef.current = totalClicks; }, [totalClicks]);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/user/org")
      .then((r) => r.json())
      .then((data: { id: string }) => {
        setOrgId(data.id);
        orgIdRef.current = data.id;
      });
    fetch("/api/tenant/theme")
      .then((r) => r.json())
      .then((data: { theme?: { logoUrl?: string | null } }) => {
        if (data.theme?.logoUrl) setLogoUrl(data.theme.logoUrl);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/loyalty/stats?orgId=${orgId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { fanpass: { status: string; cancelledAt: string | null } | null } | null) => {
        setHasFanpass(data?.fanpass?.status === "ACTIVE" && !data.fanpass.cancelledAt);
      })
      .catch(() => null);
    fetch(`/api/clicker?orgId=${orgId}`)
      .then((r) => r.json())
      .then((data: { profile: ClickerProfile; upgrades: UpgradeState[]; offlineEarned: number; activeEvent: ActiveEvent | null }) => {
        // DB is authoritative on initial load — always use dbCoins as baseline.
        // Local cache was only for instant display before DB responded.
        // dbCoins already includes offline income (server credited it server-side).
        const dbCoins = typeof data.profile.coins === "number" && isFinite(data.profile.coins)
          ? data.profile.coins
          : 0;
        serverCoins.current = dbCoins;
        // localDelta holds clicks made between mount and now — keep them.
        const safeLocalDelta = isFinite(localDelta.current) ? localDelta.current : 0;
        localDelta.current   = safeLocalDelta;

        console.log("[Load] dbCoins:", dbCoins, "offlineEarned:", data.offlineEarned, "localDelta:", safeLocalDelta);

        setProfile(data.profile);
        setDisplayCoins(dbCoins + safeLocalDelta);
        setTotalClicks(Math.max(data.profile.totalClicks, totalClicksRef.current));
        setUpgrades(data.upgrades);
        setActiveEvent(data.activeEvent);
        if (data.offlineEarned > 0) setOfflineMsg(data.offlineEarned);
        writeCache(data.profile, data.upgrades, serverCoins.current + localDelta.current);
      });
    fetch(`/api/clicker/leaderboard?orgId=${orgId}`)
      .then((r) => r.json())
      .then(setLeaderboard);
  }, [orgId]);

  // ── Passive income tick ───────────────────────────────────────────────────
  const coinsPerSecond = profile?.coinsPerSecond ?? 0;
  useEffect(() => {
    if (!coinsPerSecond) return;
    const passiveMultiplier = hasFanpass ? 2 : 1;
    const tick = coinsPerSecond * passiveMultiplier;
    const interval = setInterval(() => {
      localDelta.current += tick;
      setDisplayCoins(Math.floor(serverCoins.current + localDelta.current));
    }, 1000);
    return () => clearInterval(interval);
  }, [coinsPerSecond, hasFanpass]);

  // ── Delta sync to server every 10s ────────────────────────────────────────
  // Snapshot delta but only subtract what was sent — ticks arriving during
  // the fetch stay in localDelta and are picked up next round.
  useEffect(() => {
    const sync = async () => {
      if (localDelta.current <= 0 || !orgIdRef.current) return;
      const delta  = localDelta.current;
      const clicks = clickCount.current;
      try {
        const res = await fetch("/api/clicker/sync", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ orgId: orgIdRef.current, delta, clicks }),
        });
        if (res.ok) {
          const body = await res.json() as { coins: number };
          // Subtract what we sent from localDelta — ticks arriving during the fetch stay.
          localDelta.current -= delta;
          clickCount.current -= clicks;
          // Server returns actual DB coins after applying the (capped) delta.
          // Use this as the new serverCoins baseline to prevent drift.
          serverCoins.current = body.coins;
          setTotalClicks((t) => t + clicks);
        }
        // On error: leave localDelta/clickCount untouched, retry next interval
      } catch {
        // Network error: leave localDelta/clickCount untouched, retry next interval
      }
    };
    const interval = setInterval(() => void sync(), 5_000);
    return () => clearInterval(interval);
  }, []);

  // ── Flush on refresh / tab hide / React navigation ────────────────────────
  useEffect(() => {
    const syncBeforeLeave = () => {
      if (localDelta.current <= 0 || !orgIdRef.current) return;
      const delta  = localDelta.current;
      const clicks = clickCount.current;
      localDelta.current = 0;
      clickCount.current = 0;
      // sendBeacon with Blob ensures request fires even during page unload
      navigator.sendBeacon(
        "/api/clicker/sync",
        new Blob([JSON.stringify({ orgId: orgIdRef.current, delta, clicks })], { type: "application/json" }),
      );
    };
    const onHide = () => { if (document.visibilityState === "hidden") syncBeforeLeave(); };
    window.addEventListener("beforeunload", syncBeforeLeave);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      syncBeforeLeave(); // React navigation (not refresh)
      window.removeEventListener("beforeunload", syncBeforeLeave);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  // ── Click handler ─────────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!profile) return;
    const multiplier = activeEvent?.type === "multiplier" ? activeEvent.multiplier : 1;
    const cpc = profile.coinsPerClick * multiplier * (hasFanpass ? 1.5 : 1);
    localDelta.current += cpc;
    clickCount.current += 1;
    setDisplayCoins(serverCoins.current + localDelta.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (Math.random() * 40 - 20);
    const y = e.clientY - rect.top  - 20;
    const id = floatId.current++;
    // Cap at 8 visible floats — drop oldest if over limit, avoids DOM accumulation
    setFloats((f) => {
      const next = f.length >= 8 ? f.slice(1) : f;
      return [...next, { id, x, y, value: cpc }];
    });
    setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 800);
  }, [profile, activeEvent, hasFanpass]);

  // ── Buy upgrade ───────────────────────────────────────────────────────────
  async function buyUpgrade(upgradeId: string) {
    if (!orgId || !profile || buying) return;

    // Calculate cost before doing anything
    const owned        = upgrades.find((u) => u.upgradeId === upgradeId);
    const currentLevel = owned?.level ?? 0;
    const cost         = getUpgradeCost(upgradeId, currentLevel);

    // Guard: not enough coins (local view is authoritative for UX)
    if (displayCoins < cost) return;

    setBuying(upgradeId);

    // Capture pending delta to send atomically with the upgrade request.
    const delta  = localDelta.current;
    const clicks = clickCount.current;
    localDelta.current = 0;
    clickCount.current = 0;

    // Deduct cost IMMEDIATELY in local state — don't wait for server.
    // serverCoins absorbs the pending delta then subtracts cost.
    serverCoins.current = Math.max(0, serverCoins.current + delta - cost);
    setDisplayCoins(serverCoins.current + localDelta.current);

    console.log("[Buy] upgradeId:", upgradeId, "cost:", cost, "delta sent:", delta);
    console.log("[Buy] serverCoins after local deduction:", serverCoins.current);

    const res = await fetch("/api/clicker/upgrade", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId, upgradeId, delta, clicks }),
    });

    console.log("[Buy] response status:", res.status);

    if (res.ok) {
      const data = await res.json() as { profile: ClickerProfile; upgrades: UpgradeState[] };
      console.log("[Buy] OK — coinsPerClick:", data.profile.coinsPerClick, "coinsPerSecond:", data.profile.coinsPerSecond, "serverCoins (local):", serverCoins.current);
      // Update profile stats (coinsPerClick, coinsPerSecond) — NOT coins (local is authoritative)
      setProfile((prev) => prev ? {
        ...prev,
        coinsPerClick:  data.profile.coinsPerClick,
        coinsPerSecond: data.profile.coinsPerSecond,
        totalClicks:    data.profile.totalClicks,
      } : prev);
      setUpgrades(data.upgrades);
      writeCache(data.profile, data.upgrades, serverCoins.current + localDelta.current);
    } else {
      const errText = await res.text().catch(() => "(unreadable)");
      console.error("[Buy] purchase failed — status:", res.status, "body:", errText);
      // Undo local deduction and restore delta
      serverCoins.current = serverCoins.current - delta + cost;
      localDelta.current  += delta;
      clickCount.current  += clicks;
      setDisplayCoins(serverCoins.current + localDelta.current);
    }
    setBuying(null);
  }

  // ── Prestige ──────────────────────────────────────────────────────────────
  async function handlePrestige() {
    if (!orgId || !profile || prestiging) return;
    setPrestiging(true);
    const res = await fetch("/api/clicker/prestige", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId }),
    });
    if (res.ok) {
      const data = await res.json() as { profile: ClickerProfile };
      setProfile(data.profile);
      serverCoins.current = 0;
      localDelta.current  = 0;
      clickCount.current  = 0;
      setDisplayCoins(0);
      setUpgrades([]);
      clearCache();
    }
    setPrestigeModal(false);
    setPrestiging(false);
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const world        = (profile.prestigeWorld ?? 1) as 1 | 2 | 3;
  const worldDef     = WORLDS[world];
  const prestigeCost = worldDef.prestigeCost;
  const canPrestige  = displayCoins >= prestigeCost && world < 3;
  const nextWorld    = Math.min(world + 1, 3) as 1 | 2 | 3;
  const multiplier   = activeEvent?.type === "multiplier" ? activeEvent.multiplier : 1;
  const totalPrestige = profile.totalPrestige;

  const worldUpgrades = getWorldUpgrades(world);
  const upgradeRows = worldUpgrades.map((def) => {
    const owned     = upgrades.find((u) => u.upgradeId === def.id);
    const level     = owned?.level ?? 0;
    const cost      = getUpgradeCost(def.id, level);
    const canAfford = displayCoins >= cost && level < def.maxLevel;
    return { ...def, level, cost, canAfford };
  }).sort((a, b) => {
    if (a.canAfford && !b.canAfford) return -1;
    if (!a.canAfford && b.canAfford) return 1;
    return a.cost - b.cost;
  });

  const worldColors: Record<string, string> = {
    violet: "from-violet-600 to-indigo-700",
    amber:  "from-amber-500 to-orange-600",
    cyan:   "from-cyan-500 to-blue-600",
  };
  const btnGradient = worldColors[worldDef.color] ?? worldColors.violet;

  // ── Shared sub-sections (used in both mobile and desktop) ───────────────

  const WorldsPanel = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 px-2">Verdener</p>
      {([
        { n: 1, emoji: totalPrestige >= 1 ? "🖥️" : "🖥️", label: "Tech",    active: "violet", color: "violet" },
        { n: 2, emoji: totalPrestige >= 1 ? "⚔️" : "🔒",  label: "Eventyr", active: "amber",  color: "amber"  },
        { n: 3, emoji: totalPrestige >= 2 ? "🚀" : "🔒",  label: "Romfart", active: "cyan",   color: "cyan"   },
      ] as const).map(({ n, emoji, label, active }) => {
        const isActive  = world === n;
        const unlocked  = n === 1 || (n === 2 && totalPrestige >= 1) || (n === 3 && totalPrestige >= 2);
        const completed = n === 1 ? totalPrestige >= 1 : n === 2 ? totalPrestige >= 2 : false;
        const borderCls = isActive
          ? active === "violet" ? "bg-violet-600/20 border border-violet-600/40"
          : active === "amber"  ? "bg-amber-600/20 border border-amber-600/40"
          : "bg-cyan-600/20 border border-cyan-600/40"
          : unlocked ? "opacity-70" : "opacity-25";
        const hereCls   = active === "violet" ? "text-violet-400" : active === "amber" ? "text-amber-400" : "text-cyan-400";
        return (
          <div key={n} className={`rounded-lg p-2 mb-1.5 ${borderCls}`}>
            <div className="flex items-center gap-1.5">
              <span className="text-base">{emoji}</span>
              <div>
                <p className="text-xs font-semibold text-white leading-tight">Verden {n}</p>
                <p className="text-[10px] text-zinc-400 leading-tight">{label}</p>
              </div>
            </div>
            {!unlocked && <p className="text-[10px] text-zinc-600 mt-1">Lås opp med prestige</p>}
            {completed   && <p className="text-[10px] text-green-400 mt-1">✓ Fullført</p>}
            {isActive    && <p className={`text-[10px] mt-1 ${hereCls}`}>← Du er her</p>}
          </div>
        );
      })}
      <div className="rounded-lg p-2 mb-1.5 opacity-40 border border-dashed border-zinc-700">
        <div className="flex items-center gap-1.5">
          <span className="text-base">❓</span>
          <div>
            <p className="text-xs font-semibold text-zinc-400 leading-tight">Verden 4</p>
            <p className="text-[10px] text-zinc-500 leading-tight">Kommer snart...</p>
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-lg p-2 opacity-30">
        <p className="text-[10px] text-zinc-500 text-center">Mer på vei 👀</p>
      </div>
    </>
  );

  const ClickPanel = (
    <>
      {/* Offline toast */}
      {offlineMsg !== null && (
        <div className="mb-4 flex w-full max-w-sm items-start gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3">
          <span className="text-xl">😴</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Velkommen tilbake!</p>
            <p className="text-xs text-zinc-400">+<span className="font-bold text-indigo-400">{fmt(offlineMsg)}</span> coins mens du var borte.</p>
          </div>
          <button onClick={() => setOfflineMsg(null)} className="text-zinc-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Event banner */}
      {activeEvent && activeEvent.type === "multiplier" && new Date(activeEvent.endsAt) > new Date() && (
        <div className="mb-4 flex w-full max-w-sm items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <span>⚡</span>
          <p className="text-sm text-amber-300"><span className="font-bold">{activeEvent.multiplier}x multiplier</span> aktiv!</p>
        </div>
      )}
      {/* Coin counter */}
      <div className="mb-0.5 flex items-center gap-2">
        <Coins className="h-7 w-7 text-amber-400" />
        <span className="text-4xl md:text-5xl font-bold tabular-nums text-white">{fmt(displayCoins)}</span>
        <span className="text-lg md:text-xl text-zinc-400">coins</span>
      </div>
      {profile.allTimeHighCoins > 0 && (
        <p className="mb-0.5 text-xs text-zinc-600">
          Rekord: <span className="text-zinc-500">{fmt(profile.allTimeHighCoins)}</span> coins
        </p>
      )}
      {/* Active multiplier badges */}
      {(hasFanpass || profile.permanentBonus > 1) && (
        <div className="mb-2 flex flex-wrap justify-center gap-1.5">
          {hasFanpass && (
            <>
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                Fanpass: 1.5x klikk
              </span>
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                Fanpass: 2x passiv
              </span>
            </>
          )}
          {profile.permanentBonus > 1 && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
              +{((profile.permanentBonus - 1) * 100).toFixed(0)}% prestige
            </span>
          )}
        </div>
      )}
      <div className="mb-6 flex gap-6 text-sm text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-yellow-500" />
          {fmt(profile.coinsPerClick * multiplier * (hasFanpass ? 1.5 : 1))}/klikk
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-indigo-400" />
          {fmt(profile.coinsPerSecond * (hasFanpass ? 2 : 1))}/sek
        </span>
      </div>
      {/* Click button */}
      <div className="relative mb-6">
        {floats.map((fl) => (
          <span key={fl.id}
            className="pointer-events-none absolute z-10 animate-bounce text-sm font-bold text-amber-300"
            style={{ left: fl.x, top: fl.y, animationDuration: "0.8s", opacity: 0 }}>
            +{fmt(fl.value)}
          </span>
        ))}
        <button
          onClick={handleClick}
          className={`relative flex h-56 w-56 md:h-48 md:w-48 select-none items-center justify-center rounded-full bg-gradient-to-br ${btnGradient} shadow-2xl transition-transform duration-75 active:scale-95 hover:scale-105`}
        >
          {logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logoUrl} alt="" className="h-36 w-36 md:h-32 md:w-32 rounded-full object-cover" />
            : <span className="text-7xl">{worldDef.emoji}</span>
          }
        </button>
      </div>
      <p className="mb-4 text-xs text-zinc-600">{fmt(totalClicks)} totale klikk{totalPrestige > 0 && ` · 🏆 ${totalPrestige} prestige`}</p>
      {/* Prestige button / progress */}
      {canPrestige ? (
        <button
          onClick={() => setPrestigeModal(true)}
          className="mb-6 w-full max-w-sm rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 font-bold text-white shadow-lg shadow-amber-500/30 transition-all hover:shadow-amber-500/50"
        >
          ✨ PRESTIGE! Verden {world} → {nextWorld}
          <span className="mt-0.5 block text-xs font-normal opacity-80">
            Nullstill alt + få {worldDef.fanpassCoins} Fanpass-coins + 10% bonus
          </span>
        </button>
      ) : world < 3 ? (
        <div className="mb-6 w-full max-w-sm">
          <div className="mb-1 flex justify-between text-[10px] text-zinc-600">
            <span>Prestige fremgang</span>
            <span>{fmt(displayCoins)} / {fmt(prestigeCost)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${Math.min(100, (displayCoins / prestigeCost) * 100).toFixed(2)}%` }}
            />
          </div>
        </div>
      ) : null}
      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <Trophy className="h-3.5 w-3.5 text-amber-500" /> Topp 5
            </p>
            <p className="text-[10px] text-zinc-600">sortert etter rekord</p>
          </div>
          <div className="flex flex-col gap-2">
            {leaderboard.map((entry, i) => {
              const w = (entry.prestigeWorld ?? 1) as 1 | 2 | 3;
              const wDef = WORLDS[w];
              const worldColor = w === 1 ? "text-violet-400" : w === 2 ? "text-amber-400" : "text-cyan-400";
              return (
                <div key={entry.user.id} className="flex items-center gap-2.5">
                  <span className={`w-5 shrink-0 text-center text-xs font-bold ${
                    i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-400" : i === 2 ? "text-amber-700" : "text-zinc-600"
                  }`}>{i + 1}.</span>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-700 text-[10px] font-bold text-white">
                    {initials(entry.user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-zinc-300">{entry.user.name ?? "Ukjent"}</p>
                    <p className={`text-[10px] leading-tight ${worldColor}`}>{wDef.emoji} Verden {w}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-amber-400">{fmt(entry.allTimeHighCoins)} 🪙</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-7rem)] md:h-[calc(100vh-56px)] bg-zinc-950">

      {/* ── Prestige modal ────────────────────────────────────────────────── */}
      {prestigeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-white">✨ Gå i Prestige?</h3>
            <p className="mb-4 text-sm text-zinc-400">
              Dette nullstiller alle coins og oppgraderinger for Verden {world}.
            </p>
            <ul className="mb-5 space-y-2 text-sm text-zinc-300">
              <li>🪙 <strong className="text-amber-400">{worldDef.fanpassCoins} Fanpass-coins</strong></li>
              <li>{worldDef.badge} <strong className="text-white">{worldDef.badge} badge</strong> lagt til profilen</li>
              <li>⚡ <strong className="text-emerald-400">+10% permanent bonus</strong> for alltid</li>
              {world < 3 && (
                <li>🌍 Låser opp <strong className="text-white">Verden {nextWorld}: {WORLDS[nextWorld].name} {WORLDS[nextWorld].emoji}</strong></li>
              )}
            </ul>
            <div className="flex gap-3">
              <button onClick={() => setPrestigeModal(false)}
                className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-400 hover:text-white">
                Nei, fortsett
              </button>
              <button onClick={() => void handlePrestige()} disabled={prestiging}
                className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
                {prestiging ? "Prestiger…" : "Ja, gå i Prestige!"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBIL TAB-BAR ─────────────────────────────────────────────────── */}
      <div className="flex shrink-0 border-b border-zinc-800 bg-zinc-900 md:hidden">
        {(["verdener", "klikker", "oppgraderinger"] as const).map((tab) => {
          const labels = { klikker: "🎮 Klikk", verdener: "🌍 Verdener", oppgraderinger: "⬆️ Oppgrader" };
          return (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                mobileTab === tab
                  ? "border-b-2 border-indigo-500 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* ── VENSTRE 15% – Verdensoversikt ─────────────────────────────────── */}
      <div className={`${mobileTab === "verdener" ? "flex" : "hidden"} md:flex w-full md:w-[15%] flex-col border-r border-zinc-800 overflow-y-auto py-4 px-3`}>
        {WorldsPanel}
      </div>

      {/* ── MIDTRE 70% – Selve spillet ────────────────────────────────────── */}
      <div className={`${mobileTab === "klikker" ? "flex" : "hidden"} md:flex w-full md:w-[70%] flex-col items-center justify-center px-4 md:px-8 overflow-y-auto py-6`}>
        {ClickPanel}
      </div>

      {/* ── HØYRE 15% – Oppgraderinger ────────────────────────────────────── */}
      <div className={`${mobileTab === "oppgraderinger" ? "flex" : "hidden"} md:flex w-full md:w-[15%] flex-col border-l border-zinc-800 overflow-hidden`}>
        <div className="shrink-0 border-b border-zinc-800 px-3 py-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {worldDef.emoji} Oppgraderinger
          </p>
          <p className="text-[10px] text-zinc-600">{upgradeRows.length} tilgjengelige</p>
        </div>

        {/* Mobile: full-width list */}
        <div className="md:hidden flex-1 overflow-y-auto py-3 px-3 space-y-2">
          {upgradeRows.map((upg) => (
            <div key={upg.id}
              className={`rounded-lg border p-3 flex items-center gap-3 transition-colors ${
                upg.canAfford
                  ? "border-indigo-500/30 bg-indigo-500/5"
                  : upg.level > 0
                  ? "border-zinc-700 bg-zinc-800/50"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}>
              <span className="text-2xl shrink-0">{upg.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white truncate">{upg.name}</p>
                  {upg.level > 0 && (
                    <span className="shrink-0 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">Lv{upg.level}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  {upg.coinsPerClick  > 0 && `+${upg.coinsPerClick}/klikk`}
                  {upg.coinsPerClick  > 0 && upg.coinsPerSecond > 0 && " · "}
                  {upg.coinsPerSecond > 0 && `+${upg.coinsPerSecond}/sek`}
                </p>
              </div>
              <button
                onClick={() => void buyUpgrade(upg.id)}
                disabled={!upg.canAfford || buying === upg.id || upg.level >= upg.maxLevel}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  upg.level >= upg.maxLevel
                    ? "cursor-default bg-zinc-800 text-zinc-600"
                    : upg.canAfford
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : "cursor-not-allowed bg-zinc-800 text-zinc-600"
                }`}>
                {upg.level >= upg.maxLevel ? "Maks" : buying === upg.id ? "…" : `${fmt(upg.cost)} 🪙`}
              </button>
            </div>
          ))}
        </div>

        {/* Desktop: compact cards */}
        <div className="hidden md:block flex-1 overflow-y-auto py-3 px-2 space-y-2">
          {upgradeRows.map((upg) => (
            <div key={upg.id}
              className={`rounded-lg border p-2 transition-colors ${
                upg.canAfford
                  ? "border-indigo-500/30 bg-indigo-500/5"
                  : upg.level > 0
                  ? "border-zinc-700 bg-zinc-800/50"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base leading-none">{upg.emoji}</span>
                <p className="text-xs font-semibold text-white leading-tight truncate flex-1">{upg.name}</p>
                {upg.level > 0 && (
                  <span className="shrink-0 rounded-full bg-zinc-700 px-1 py-0.5 text-[9px] font-semibold text-zinc-400">
                    {upg.level}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-600 mb-1.5 leading-tight">
                {upg.coinsPerClick  > 0 && `+${upg.coinsPerClick}/klikk`}
                {upg.coinsPerClick  > 0 && upg.coinsPerSecond > 0 && " · "}
                {upg.coinsPerSecond > 0 && `+${upg.coinsPerSecond}/sek`}
              </p>
              <button
                onClick={() => void buyUpgrade(upg.id)}
                disabled={!upg.canAfford || buying === upg.id || upg.level >= upg.maxLevel}
                className={`w-full rounded py-1 text-[10px] font-semibold transition-colors ${
                  upg.level >= upg.maxLevel
                    ? "cursor-default bg-zinc-800 text-zinc-600"
                    : upg.canAfford
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : "cursor-not-allowed bg-zinc-800 text-zinc-600"
                }`}>
                {upg.level >= upg.maxLevel ? "Maks" : buying === upg.id ? "…" : `${fmt(upg.cost)} 🪙`}
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
