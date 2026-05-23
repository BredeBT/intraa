"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WORLDS, MAX_WORLD, getWorldUpgrades, getUpgradeCost, PRESTIGE_PERKS, calcPerkConfig } from "@/lib/clickerUpgrades";
import { Zap, Clock, Trophy, X, Lock, ShoppingBag } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClickerProfile {
  id:               string;
  coins:            number;
  allTimeHighCoins: number;
  totalClicks:      number;
  coinsPerClick:    number;
  coinsPerSecond:   number;
  lastSeen:            string;
  prestigeLevel:       number;
  prestigeWorld:       number;
  permanentBonus:      number;
  totalPrestige:       number;
  prestigeShop:        Record<string, number>;
  prestigePointsSpent: number;
}

interface UpgradeState  { upgradeId: string; level: number }

interface LeaderboardEntry {
  allTimeHighCoins: number;
  totalClicks:      number;
  prestigeWorld:    number;
  user:             { id: string; name: string | null; avatarUrl: string | null };
}

interface ActiveEvent { type: string; multiplier: number; endsAt: string }

interface FloatItem { id: number; x: number; y: number; value: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (!isFinite(n) || n < 0) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toLocaleString("no-NO");
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function OfflineToast({ value, onDismiss }: { value: number | null; onDismiss: () => void }) {
  useEffect(() => {
    if (value === null) return;
    const id = setTimeout(onDismiss, 8000);
    return () => clearTimeout(id);
  }, [value, onDismiss]);

  if (value === null) return null;
  return (
    <button
      type="button"
      onClick={onDismiss}
      className="mb-4 w-full flex items-start gap-3 p-3 rounded-xl text-left transition-opacity hover:opacity-80 active:opacity-60"
      style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)" }}
    >
      <span className="text-xl shrink-0">😴</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Velkommen tilbake!</p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
          +<span className="font-bold" style={{ color: "#A855F7" }}>{fmt(value)}</span> coins mens du var borte. Klikk for å lukke.
        </p>
      </div>
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "rgba(168,85,247,0.2)", color: "rgba(255,255,255,0.7)" }}
      >
        <X className="h-4 w-4" />
      </span>
    </button>
  );
}

// ── localStorage cache ────────────────────────────────────────────────────────
const CK = {
  coins:       "clicker_coins",
  profile:     "clicker_profile",
  upgrades:    "clicker_upgrades",
  totalClicks: "clicker_totalClicks",
} as const;

const ls = {
  get:    (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } },
  set:    (key: string, value: string): void => { try { localStorage.setItem(key, value); } catch { /* quota */ } },
  remove: (key: string): void => { try { localStorage.removeItem(key); } catch { /* denied */ } },
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClickerPage() {
  const [mobileTab,     setMobileTab]     = useState<"klikker" | "verdener" | "oppgraderinger">("klikker");
  const [orgId,         setOrgId]         = useState<string | null>(null);
  const [profile,       setProfile]       = useState<ClickerProfile | null>(null);
  const [upgrades,      setUpgrades]      = useState<UpgradeState[]>([]);
  const [leaderboard,   setLeaderboard]   = useState<LeaderboardEntry[]>([]);
  const [activeEvent,   setActiveEvent]   = useState<ActiveEvent | null>(null);
  const [offlineMsg,    setOfflineMsg]    = useState<number | null>(null);
  const [floats,        setFloats]        = useState<FloatItem[]>([]);
  const [buying,        setBuying]        = useState<string | null>(null);
  const [displayCoins,  setDisplayCoins]  = useState(0);
  const [logoUrl,       setLogoUrl]       = useState<string | null>(null);
  const [prestigeModal,     setPrestigeModal]     = useState(false);
  const [prestiging,        setPrestiging]        = useState(false);
  const [shopModal,         setShopModal]         = useState(false);
  const [shopBuying,        setShopBuying]        = useState<string | null>(null);
  const [shopResetting,     setShopResetting]     = useState(false);
  const [totalClicks,   setTotalClicks]   = useState(0);
  const [hasFanpass,    setHasFanpass]    = useState(false);
  const [isMobile,      setIsMobile]      = useState(false);

  // Chat

  // Coin refs
  const serverCoins    = useRef(0);
  const localDelta     = useRef(0);
  const clickCount     = useRef(0);
  const totalClicksRef = useRef(0);
  const floatId        = useRef(0);
  const orgIdRef       = useRef<string | null>(null);

  // ── Mobile detection ──────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Restore from localStorage on mount ────────────────────────────────────
  useEffect(() => {
    try {
      const p = ls.get(CK.profile);
      if (p) {
        const parsed = JSON.parse(p) as ClickerProfile;
        const cachedCoins  = parseFloat(ls.get(CK.coins) ?? "");
        const profileCoins = typeof parsed.coins === "number" ? parsed.coins : 0;
        const coins        = isFinite(cachedCoins) ? cachedCoins : profileCoins;
        setProfile(parsed);
        serverCoins.current = coins;
        console.log("[setCoins #1 INIT localStorage]", { coins, cachedCoins, profileCoins });
        setDisplayCoins(coins);
      }
      const u = ls.get(CK.upgrades);
      if (u) setUpgrades(JSON.parse(u) as UpgradeState[]);
      const tc = ls.get(CK.totalClicks);
      if (tc) { const n = parseInt(tc, 10); if (isFinite(n)) setTotalClicks(n); }
    } catch { /* corrupt cache */ }
  }, []);

  useEffect(() => { ls.set(CK.coins, String(Math.floor(displayCoins))); }, [displayCoins]);
  useEffect(() => { totalClicksRef.current = totalClicks; }, [totalClicks]);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/user/org")
      .then((r) => r.json())
      .then((data: { id: string }) => { setOrgId(data.id); orgIdRef.current = data.id; });
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
      .then((data: { profile: ClickerProfile & { prestigeShop?: Record<string, number>; prestigePointsSpent?: number }; upgrades: UpgradeState[]; offlineEarned: number; activeEvent: ActiveEvent | null }) => {
        const dbCoins = typeof data.profile.coins === "number" && isFinite(data.profile.coins)
          ? data.profile.coins : 0;
        serverCoins.current = dbCoins;
        const safeLocalDelta = isFinite(localDelta.current) ? localDelta.current : 0;
        localDelta.current   = safeLocalDelta;
        // Ensure shop fields exist
        data.profile.prestigeShop        = data.profile.prestigeShop ?? {};
        data.profile.prestigePointsSpent = data.profile.prestigePointsSpent ?? 0;
        setProfile(data.profile);
        console.log("[setCoins #2 DB-fetch]", { dbCoins, safeLocalDelta, result: dbCoins + safeLocalDelta, rawCoins: data.profile.coins });
        setDisplayCoins(dbCoins + safeLocalDelta);
        setTotalClicks(Math.max(data.profile.totalClicks, totalClicksRef.current));
        setUpgrades(data.upgrades);
        setActiveEvent(data.activeEvent);
        if (data.offlineEarned > 0) setOfflineMsg(data.offlineEarned);
        writeCache(data.profile, data.upgrades, dbCoins + safeLocalDelta);
      });

    fetch(`/api/clicker/leaderboard?orgId=${orgId}`)
      .then((r) => r.json())
      .then(setLeaderboard);
  }, [orgId]);

  // ── Passive income tick ───────────────────────────────────────────────────
  const coinsPerSecond = profile?.coinsPerSecond ?? 0;
  const passivePerkMul = profile ? calcPerkConfig(profile.prestigeShop ?? {}).incomeBonus * calcPerkConfig(profile.prestigeShop ?? {}).passiveBonus : 1;
  useEffect(() => {
    if (!coinsPerSecond) return;
    const tick = coinsPerSecond * (hasFanpass ? 2 : 1) * passivePerkMul;
    const id = setInterval(() => {
      localDelta.current += tick;
      const val3 = Math.floor(serverCoins.current + localDelta.current);
      if (val3 < 5) console.warn("[setCoins #3 PASSIV — LITEN VERDI!]", { serverCoins: serverCoins.current, localDelta: localDelta.current, tick, val3 });
      setDisplayCoins(val3);
    }, 1000);
    return () => clearInterval(id);
  }, [coinsPerSecond, hasFanpass, passivePerkMul]);

  // ── Delta sync every 5s ───────────────────────────────────────────────────
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
          console.log("[SYNC #4 respons — server bekreftet]", {
            sentDelta: delta,
            bodyCoins: body.coins,
            serverCoinsBefore: serverCoins.current,
            localDeltaBefore:  localDelta.current,
          });
          // IKKE overskriv serverCoins med body.coins —
          // klienten er fasit under aktiv spilling.
          // Flytt sendt delta fra localDelta til serverCoins.
          localDelta.current  -= delta;
          serverCoins.current += delta;
          clickCount.current  -= clicks;
          setTotalClicks((t) => t + clicks);
        } else {
          console.warn("[SYNC #4 FEIL]", { status: res.status });
        }
      } catch { /* retry next interval */ }
    };
    const id = setInterval(() => void sync(), 5_000);
    return () => clearInterval(id);
  }, []);

  // ── Flush on leave ────────────────────────────────────────────────────────
  useEffect(() => {
    const flush = () => {
      if (localDelta.current <= 0 || !orgIdRef.current) return;
      const delta  = localDelta.current;
      const clicks = clickCount.current;
      localDelta.current = 0;
      clickCount.current = 0;
      navigator.sendBeacon(
        "/api/clicker/sync",
        new Blob([JSON.stringify({ orgId: orgIdRef.current, delta, clicks })], { type: "application/json" }),
      );
    };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flush();
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  // ── Click handler ─────────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!profile) return;
    const multiplier = activeEvent?.type === "multiplier" ? activeEvent.multiplier : 1;
    const shop    = profile.prestigeShop ?? {};
    const pCfg    = calcPerkConfig(shop);
    let baseCpc   = profile.coinsPerClick * multiplier * (hasFanpass ? 1.5 : 1) * pCfg.incomeBonus * pCfg.clickBonus;
    // Lucky click: X% chance for 3×
    if (pCfg.luckyChance > 0 && Math.random() < pCfg.luckyChance) baseCpc *= 3;
    // Mega click: Y% chance for 10× (rolls independently)
    if (pCfg.megaChance > 0 && Math.random() < pCfg.megaChance) baseCpc *= 10;
    const cpc = baseCpc;
    localDelta.current += cpc;
    clickCount.current += 1;
    const val5 = serverCoins.current + localDelta.current;
    if (val5 < 5) console.warn("[setCoins #5 KLIKK — LITEN VERDI!]", { serverCoins: serverCoins.current, localDelta: localDelta.current, cpc });
    setDisplayCoins(val5);
    if (!isMobile) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + (Math.random() * 40 - 20);
      const y = e.clientY - rect.top  - 20;
      const id = floatId.current++;
      setFloats((f) => {
        const next = f.length >= 8 ? f.slice(1) : f;
        return [...next, { id, x, y, value: cpc }];
      });
      setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 800);
    }
  }, [profile, activeEvent, hasFanpass, isMobile]);

  // ── Buy upgrade ───────────────────────────────────────────────────────────
  async function buyUpgrade(upgradeId: string) {
    if (!orgId || !profile || buying) return;
    const owned        = upgrades.find((u) => u.upgradeId === upgradeId);
    const currentLevel = owned?.level ?? 0;
    const cost         = getUpgradeCost(upgradeId, currentLevel);
    if (displayCoins < cost) return;
    setBuying(upgradeId);
    const delta  = localDelta.current;
    const clicks = clickCount.current;
    localDelta.current = 0;
    clickCount.current = 0;
    serverCoins.current = Math.max(0, serverCoins.current + delta - cost);
    console.log("[setCoins #6 KJØP optimistisk]", { serverCoins: serverCoins.current, delta, cost });
    setDisplayCoins(serverCoins.current + localDelta.current);
    const res = await fetch("/api/clicker/upgrade", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId, upgradeId, delta, clicks }),
    });
    if (res.ok) {
      const data = await res.json() as { profile: ClickerProfile; upgrades: UpgradeState[] };
      setProfile((prev) => prev ? {
        ...prev,
        coinsPerClick:  data.profile.coinsPerClick,
        coinsPerSecond: data.profile.coinsPerSecond,
        totalClicks:    data.profile.totalClicks,
      } : prev);
      setUpgrades(data.upgrades);
      writeCache(data.profile, data.upgrades, serverCoins.current + localDelta.current);
    } else {
      serverCoins.current = serverCoins.current - delta + cost;
      localDelta.current  += delta;
      clickCount.current  += clicks;
      console.warn("[setCoins #7 KJØP rollback]", { serverCoins: serverCoins.current, delta, cost });
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
      data.profile.prestigeShop        = data.profile.prestigeShop ?? {};
      data.profile.prestigePointsSpent = data.profile.prestigePointsSpent ?? 0;
      setProfile(data.profile);
      const startCoins = data.profile.coins ?? 0;
      serverCoins.current = startCoins;
      localDelta.current  = 0;
      clickCount.current  = 0;
      console.log("[setCoins #8 PRESTIGE — reset]");
      setDisplayCoins(startCoins);
      setUpgrades([]);
      clearCache();
    }
    setPrestigeModal(false);
    setPrestiging(false);
  }

  // ── Prestige shop ─────────────────────────────────────────────────────────
  async function buyPerk(perkId: string) {
    if (!orgId || !profile || shopBuying) return;
    setShopBuying(perkId);
    const res = await fetch("/api/clicker/prestige-shop", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId, action: "buy", perkId }),
    });
    if (res.ok) {
      const data = await res.json() as { prestigeShop: Record<string, number>; prestigePointsSpent: number };
      setProfile((prev) => prev ? {
        ...prev,
        prestigeShop:        data.prestigeShop,
        prestigePointsSpent: data.prestigePointsSpent,
      } : prev);
    }
    setShopBuying(null);
  }

  async function resetShop() {
    if (!orgId || !profile || shopResetting) return;
    setShopResetting(true);
    const res = await fetch("/api/clicker/prestige-shop", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId, action: "reset" }),
    });
    if (res.ok) {
      setProfile((prev) => prev ? {
        ...prev,
        prestigeShop:        {},
        prestigePointsSpent: 0,
      } : prev);
    }
    setShopResetting(false);
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "#050816" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "#A855F7", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const world         = profile.prestigeWorld ?? 1;
  const worldDef      = WORLDS[world];

  // World-color name → hex. Brukes for tema-glow + float-numbers.
  const worldHex: Record<string, string> = {
    violet: "#A855F7", amber:  "#FBBF24", cyan:   "#22D3EE",
    blue:   "#60A5FA", green:  "#34D399", pink:   "#EC4899",
    orange: "#FB923C", indigo: "#818CF8", gold:   "#F59E0B",
  };
  const wColor = worldHex[worldDef?.color ?? "violet"] ?? "#A855F7";
  const prestigeCost  = worldDef?.prestigeCost ?? 0;
  const canPrestige   = prestigeCost > 0 && displayCoins >= prestigeCost;
  const nextWorld     = Math.min(world + 1, MAX_WORLD);
  const prestigePct   = prestigeCost > 0 ? Math.min(100, (displayCoins / prestigeCost) * 100) : 100;
  const multiplier    = activeEvent?.type === "multiplier" ? activeEvent.multiplier : 1;
  const totalPrestige = profile.totalPrestige;
  const shopData      = profile.prestigeShop ?? {};
  const pointsSpent   = profile.prestigePointsSpent ?? 0;
  const pointsAvail   = totalPrestige - pointsSpent;
  const perkCfg       = calcPerkConfig(shopData);
  const effectiveCpc  = profile.coinsPerClick * multiplier * (hasFanpass ? 1.5 : 1) * perkCfg.incomeBonus * perkCfg.clickBonus;
  const effectiveCps  = profile.coinsPerSecond * (hasFanpass ? 2 : 1) * perkCfg.incomeBonus * perkCfg.passiveBonus;

  const worldUpgrades = getWorldUpgrades(world);
  const upgradeRows = worldUpgrades.map((def) => {
    const owned     = upgrades.find((u) => u.upgradeId === def.id);
    const level     = owned?.level ?? 0;
    const rawCost   = getUpgradeCost(def.id, level);
    const cost      = Math.floor(rawCost * perkCfg.costMultiplier);
    const canAfford = displayCoins >= cost && level < def.maxLevel;
    return { ...def, level, cost, canAfford };
  }).sort((a, b) => {
    if (a.canAfford && !b.canAfford) return -1;
    if (!a.canAfford && b.canAfford) return 1;
    return a.cost - b.cost;
  });

  // Neste milepæl = cheapest non-maxed upgrade. Brukes til progress-bar
  // under hovedsirkelen så man ser «jeg er X% mot neste oppgradering».
  const nextMilestone = upgradeRows.find((u) => u.level < u.maxLevel) ?? null;
  const milestonePct  = nextMilestone
    ? Math.min(100, (displayCoins / nextMilestone.cost) * 100)
    : 0;

  // ── Panels ────────────────────────────────────────────────────────────────

  const WorldsPanel = (
    <div className="flex flex-col gap-1.5">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
        Verdener
      </p>

      {Array.from({ length: MAX_WORLD }, (_, i) => i + 1).map((n) => {
        const isActive  = world === n;
        const unlocked  = totalPrestige >= n - 1;
        const completed = totalPrestige >= n;
        const isFinal   = n === MAX_WORLD;
        const wDef      = WORLDS[n];
        return (
          <div
            key={n}
            style={
              isActive
                ? { background: "rgba(168,85,247,0.13)", border: "1px solid rgba(168,85,247,0.38)", borderRadius: 10 }
                : unlocked
                ? { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, opacity: 0.7 }
                : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, opacity: 0.5 }
            }
            className="p-2.5"
          >
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">
                {unlocked ? wDef.emoji : <Lock className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-xs leading-tight"
                  style={{ fontWeight: 500, color: isActive ? "#A855F7" : "rgba(255,255,255,0.5)" }}
                >
                  {n}. {wDef.name}
                </p>
                {!unlocked && (
                  <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.25)" }}>
                    Lås opp med prestige
                  </p>
                )}
                {completed && !isActive && (
                  <p className="text-[10px] leading-tight" style={{ color: "#34d399" }}>Fullført ✓</p>
                )}
                {isActive && isFinal && (
                  <p className="text-[10px] leading-tight" style={{ color: "#fbbf24" }}>Siste verden 👑</p>
                )}
                {isActive && !isFinal && !completed && (
                  <p className="text-[10px] leading-tight" style={{ color: "#A855F7" }}>Du er her</p>
                )}
              </div>
            </div>

            {isActive && !isFinal && (
              <div className="mt-2">
                <div className="h-[3px] overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${prestigePct.toFixed(2)}%`, background: "#A855F7" }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Prestige shop */}
      <div className="mt-3">
        <button
          onClick={() => setShopModal(true)}
          className="w-full rounded-xl px-3 py-2.5 text-left transition-all hover:brightness-110"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10 }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 shrink-0" style={{ color: "#fbbf24" }} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold leading-tight" style={{ color: "#fbbf24" }}>Prestige-butikk</p>
              <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>
                {pointsAvail} poeng tilgjengelig
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  const ClickPanel = (
    <div className="flex w-full max-w-sm flex-col items-center">
      {/* Offline toast — hele kortet er klikkbart for å dismisse,
          + auto-dismiss etter 8s slik at den ikke står og henger. */}
      <OfflineToast value={offlineMsg} onDismiss={() => setOfflineMsg(null)} />


      {/* Event banner */}
      {activeEvent && activeEvent.type === "multiplier" && new Date(activeEvent.endsAt) > new Date() && (
        <div
          className="mb-4 w-full flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}
        >
          <span>⚡</span>
          <p className="text-sm" style={{ color: "#fcd34d" }}>
            <span className="font-bold">{activeEvent.multiplier}x multiplier</span> aktiv!
          </p>
        </div>
      )}

      {/* Coin counter */}
      <div className="mb-0.5 flex items-baseline gap-2">
        <span
          className="tabular-nums text-white leading-none text-[40px] md:text-[52px]"
          style={{ fontWeight: 700, letterSpacing: "-2px" }}
        >
          {fmt(displayCoins)}
        </span>
      </div>
      <p className="mb-1 text-xs md:text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>coins</p>

      {/* Fanpass badges */}
      {(hasFanpass || profile.permanentBonus > 1) && (
        <div className="mb-3 flex flex-wrap justify-center gap-1.5">
          {hasFanpass && (
            <>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs"
                style={{ background: "rgba(168,85,247,0.2)", color: "#A855F7" }}
              >
                Fanpass 1.5x klikk
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs"
                style={{ background: "rgba(168,85,247,0.2)", color: "#A855F7" }}
              >
                Fanpass 2x passiv
              </span>
            </>
          )}
          {profile.permanentBonus > 1 && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs"
              style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}
            >
              +{((profile.permanentBonus - 1) * 100).toFixed(0)}% prestige
            </span>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="mb-3 md:mb-7 flex gap-5 md:gap-6">
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4" style={{ color: "#fbbf24" }} />
          <span className="text-sm font-semibold text-white">{fmt(effectiveCpc)}</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>/klikk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" style={{ color: "#818cf8" }} />
          <span className="text-sm font-semibold text-white">{fmt(effectiveCps)}</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>/sek</span>
        </div>
      </div>

      {/* ─── Hovedsirkel — sentralt og dramatisk ─────────────────────────── */}
      <div className="relative mb-4 md:mb-5 flex h-[260px] w-[260px] md:h-[340px] md:w-[340px] items-center justify-center">
        {/* World-themed radial glow bak alt */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[-40px] rounded-full"
          style={{
            background: `radial-gradient(circle at center, ${wColor}40 0%, ${wColor}15 35%, transparent 70%)`,
            filter:     "blur(20px)",
          }}
        />

        {/* Ytre pulserende ringer (kun når passiv inntekt finnes) */}
        {effectiveCps > 0 && (
          <>
            <div
              className="pulse-ring pointer-events-none absolute rounded-full h-[240px] w-[240px] md:h-[320px] md:w-[320px]"
              style={{ border: `2px solid ${wColor}50`, animationDuration: "2.4s" }}
            />
            <div
              className="pulse-ring pointer-events-none absolute rounded-full h-[210px] w-[210px] md:h-[280px] md:w-[280px]"
              style={{ border: `2px solid ${wColor}30`, animationDuration: "2.4s", animationDelay: "0.6s" }}
            />
          </>
        )}

        {/* Float-numbers — bevisst lagt utenfor button slik at de
            ikke trigger pointer-events-clash på mobil. */}
        {floats.map((fl) => (
          <span
            key={fl.id}
            className="clicker-float"
            style={{ left: fl.x, top: fl.y, color: wColor }}
          >
            +{fmt(fl.value)}
          </span>
        ))}

        {/* Hovedknapp — selve klikket */}
        <button
          onClick={handleClick}
          aria-label={`Klikk for å tjene ${fmt(effectiveCpc)} coins`}
          style={{
            background:    `radial-gradient(circle at 35% 30%, ${wColor}, ${wColor}cc 70%)`,
            borderRadius:  "50%",
            touchAction:   "manipulation",
            transition:    "transform 0.12s ease, filter 0.12s ease",
            boxShadow: `
              0 0 60px ${wColor}55,
              0 0 100px ${wColor}30,
              inset 0 2px 0 rgba(255,255,255,0.25),
              inset 0 -8px 24px rgba(0,0,0,0.25)
            `,
            border: `3px solid ${wColor}`,
          }}
          className="relative z-10 flex select-none items-center justify-center active:scale-[0.94] hover:brightness-110 hover:scale-[1.02] h-[190px] w-[190px] md:h-[240px] md:w-[240px]"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="rounded-full object-cover h-[130px] w-[130px] md:h-40 md:w-40" />
          ) : (
            <span
              className="text-[68px] md:text-[88px]"
              style={{ lineHeight: 1, filter: `drop-shadow(0 4px 12px rgba(0,0,0,0.5))` }}
            >
              {worldDef.emoji}
            </span>
          )}
        </button>
      </div>

      {/* Milepæl-bar — fremgang mot neste oppgradering du kan kjøpe */}
      {nextMilestone && (
        <div className="mb-5 w-full">
          <div className="mb-1 flex items-baseline justify-between text-[11px]">
            <span style={{ color: "rgba(255,255,255,0.5)" }}>
              Neste: <span style={{ color: wColor }}>{nextMilestone.emoji} {nextMilestone.name}</span>
            </span>
            <span style={{ color: "rgba(255,255,255,0.4)" }} className="tabular-nums">
              {fmt(displayCoins)} / {fmt(nextMilestone.cost)}
            </span>
          </div>
          <div className="overflow-hidden rounded-full" style={{ height: 4, background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${milestonePct.toFixed(2)}%`,
                background: `linear-gradient(to right, ${wColor}aa, ${wColor})`,
                boxShadow: `0 0 8px ${wColor}80`,
              }}
            />
          </div>
        </div>
      )}

      <p className="mb-5 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
        {fmt(totalClicks)} totale klikk{totalPrestige > 0 && ` · Prestige ${totalPrestige}`}
      </p>

      {/* Prestige bar / button */}
      {canPrestige ? (
        <button
          onClick={() => setPrestigeModal(true)}
          className="mb-6 w-full rounded-xl px-4 py-3 font-bold text-white transition-all hover:brightness-110"
          style={{
            background: "linear-gradient(to right, #f59e0b, #ea580c)",
            boxShadow: "0 4px 20px rgba(245,158,11,0.35)",
          }}
        >
          PRESTIGE! Verden {world} → {nextWorld}
          <span className="mt-0.5 block text-xs font-normal opacity-80">
            Nullstill + {worldDef?.fanpassCoins ?? 0} Fanpass-coins + {Math.round((0.10 + perkCfg.prestigeExtraBonus) * 100)}% bonus
          </span>
        </button>
      ) : prestigeCost > 0 ? (
        <div className="mb-6 w-full">
          <div className="mb-1.5 flex justify-between">
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Prestige fremgang</span>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{fmt(displayCoins)} / {fmt(prestigeCost)}</span>
          </div>
          <div className="overflow-hidden rounded-full" style={{ height: 6, background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${prestigePct.toFixed(2)}%`, background: "linear-gradient(to right, #5EEAD4, #A855F7)" }}
            />
          </div>
        </div>
      ) : world === MAX_WORLD ? (
        <div className="mb-6 w-full rounded-xl px-4 py-3 text-center" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <p className="text-sm font-semibold" style={{ color: "#fbbf24" }}>👑 Du er i den siste verden!</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Ingen prestige herfra</p>
        </div>
      ) : null}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div
          className="w-full rounded-xl p-4"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
          }}
        >
          <div className="mb-3 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" style={{ color: "#fbbf24" }} />
            <p
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              TOPP 5 — etter rekord
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            {leaderboard.map((entry, i) => {
              const w     = entry.prestigeWorld ?? 1;
              const wDef  = WORLDS[w] ?? WORLDS[1];
              const wColor = w <= 1 ? "#A855F7" : w === 2 ? "#fbbf24" : w <= 3 ? "#67e8f9" : w <= 5 ? "#34d399" : w <= 7 ? "#fb923c" : "#f59e0b";
              const medalColor =
                i === 0 ? "#fbbf24"
                : i === 1 ? "#94a3b8"
                : i === 2 ? "#b45309"
                : "rgba(255,255,255,0.3)";
              const avatarRing =
                i === 0 ? "rgba(251,191,36,0.5)"
                : i === 1 ? "rgba(148,163,184,0.4)"
                : i === 2 ? "rgba(180,83,9,0.4)"
                : "rgba(255,255,255,0.1)";
              return (
                <div key={entry.user.id} className="flex items-center gap-2.5">
                  <span className="w-5 shrink-0 text-center text-xs font-bold" style={{ color: medalColor }}>
                    {i + 1}.
                  </span>
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{
                      background: "rgba(168,85,247,0.25)",
                      outline: `1.5px solid ${avatarRing}`,
                    }}
                  >
                    {initials(entry.user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-white">{entry.user.name ?? "Ukjent"}</p>
                    <p className="text-[10px] leading-tight" style={{ color: wColor }}>
                      {wDef.emoji} Verden {w}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold" style={{ color: "#A855F7" }}>
                    {fmt(entry.allTimeHighCoins)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const UpgradesPanel = (
    <>
      <div
        className="shrink-0 px-3 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
          {worldDef.emoji} Oppgraderinger
        </p>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{upgradeRows.length} tilgjengelige</p>
      </div>

      {/* Mobile: full-width cards */}
      <div className="scrollbar-hide flex-1 overflow-y-auto py-3 px-3 space-y-2 md:hidden">
        {upgradeRows.map((upg) => (
          <div
            key={upg.id}
            className="flex items-center gap-3 rounded-xl p-3 transition-all"
            style={{
              background: upg.canAfford ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.03)",
              border: upg.canAfford
                ? "1px solid rgba(168,85,247,0.3)"
                : upg.level > 0
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10,
            }}
          >
            {/* Icon */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ background: "rgba(168,85,247,0.2)" }}
            >
              {upg.emoji}
            </div>
            {/* Name + stat */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{upg.name}</p>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                {upg.coinsPerClick  > 0 && `+${upg.coinsPerClick}/klikk`}
                {upg.coinsPerClick  > 0 && upg.coinsPerSecond > 0 && " · "}
                {upg.coinsPerSecond > 0 && `+${upg.coinsPerSecond}/sek`}
              </p>
            </div>
            {/* Level + price */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {upg.level > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: "rgba(168,85,247,0.25)", color: "#A855F7" }}
                >
                  Lv {upg.level}
                </span>
              )}
              <button
                onClick={() => void buyUpgrade(upg.id)}
                disabled={!upg.canAfford || buying === upg.id || upg.level >= upg.maxLevel}
                className="min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: upg.level >= upg.maxLevel
                    ? "rgba(255,255,255,0.05)"
                    : upg.canAfford
                    ? "#A855F7"
                    : "rgba(255,255,255,0.05)",
                  color: upg.level >= upg.maxLevel
                    ? "rgba(255,255,255,0.25)"
                    : upg.canAfford
                    ? "#fff"
                    : "rgba(255,255,255,0.25)",
                  cursor: upg.canAfford && upg.level < upg.maxLevel ? "pointer" : "default",
                }}
              >
                {upg.level >= upg.maxLevel ? "Maks" : buying === upg.id ? "…" : `${fmt(upg.cost)} 🪙`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: compact cards */}
      <div className="scrollbar-hide hidden md:block flex-1 overflow-y-auto py-3 px-2.5 space-y-1.5">
        {upgradeRows.map((upg) => (
          <div
            key={upg.id}
            className="flex items-center gap-2 rounded-xl p-2.5 transition-all"
            style={{
              background: upg.canAfford ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.04)",
              border: upg.canAfford
                ? "1px solid rgba(168,85,247,0.28)"
                : upg.level > 0
                ? "1px solid rgba(255,255,255,0.07)"
                : "1px solid rgba(255,255,255,0.04)",
              borderRadius: 10,
            }}
          >
            {/* Icon */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg leading-none"
              style={{ background: "rgba(168,85,247,0.2)" }}
            >
              {upg.emoji}
            </div>

            {/* Name + stat */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white leading-tight truncate">{upg.name}</p>
              <p className="text-[11px] leading-tight" style={{ color: "rgba(255,255,255,0.25)" }}>
                {upg.coinsPerClick  > 0 && `+${upg.coinsPerClick}/klikk`}
                {upg.coinsPerClick  > 0 && upg.coinsPerSecond > 0 && " · "}
                {upg.coinsPerSecond > 0 && `+${upg.coinsPerSecond}/sek`}
              </p>
            </div>

            {/* Level badge + price */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {upg.level > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none"
                  style={{ background: "rgba(168,85,247,0.25)", color: "#A855F7" }}
                >
                  Lv {upg.level}
                </span>
              )}
              <button
                onClick={() => void buyUpgrade(upg.id)}
                disabled={!upg.canAfford || buying === upg.id || upg.level >= upg.maxLevel}
                className="rounded-lg px-2 py-1 text-[11px] font-semibold transition-all active:scale-95"
                style={{
                  color: upg.level >= upg.maxLevel
                    ? "rgba(255,255,255,0.2)"
                    : upg.canAfford
                    ? "#A855F7"
                    : "rgba(255,255,255,0.2)",
                  cursor: upg.canAfford && upg.level < upg.maxLevel ? "pointer" : "default",
                  fontWeight: upg.canAfford ? 600 : 400,
                }}
              >
                {upg.level >= upg.maxLevel ? "Maks" : buying === upg.id ? "…" : `${fmt(upg.cost)} 🪙`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative flex flex-col md:flex-row h-[calc(100dvh-7rem)] md:h-[calc(100vh-56px)]"
      style={{ background: "#050816" }}
    >
      {/* Prestige modal */}
      {prestigeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#0B1027", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <h3 className="mb-2 text-lg font-bold text-white">Gå i Prestige?</h3>
            <p className="mb-4 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              Nullstiller alle coins og oppgraderinger for Verden {world}.
            </p>
            <ul className="mb-5 space-y-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              <li>🪙 <strong style={{ color: "#fbbf24" }}>{worldDef?.fanpassCoins ?? 0} Fanpass-coins</strong></li>
              <li>{worldDef?.badge} Badge lagt til profilen</li>
              <li>⚡ <strong style={{ color: "#34d399" }}>+{Math.round((0.10 + perkCfg.prestigeExtraBonus) * 100)}% permanent bonus</strong></li>
              <li>🏆 <strong style={{ color: "#A855F7" }}>+1 Prestige-poeng til butikken</strong></li>
              {world < MAX_WORLD && WORLDS[nextWorld] && (
                <li>🌍 Låser opp <strong className="text-white">Verden {nextWorld}: {WORLDS[nextWorld].name} {WORLDS[nextWorld].emoji}</strong></li>
              )}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setPrestigeModal(false)}
                className="flex-1 rounded-lg py-2.5 text-sm transition-colors hover:text-white"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
              >
                Nei, fortsett
              </button>
              <button
                onClick={() => void handlePrestige()}
                disabled={prestiging}
                className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
                style={{ background: "linear-gradient(to right, #f59e0b, #ea580c)" }}
              >
                {prestiging ? "Prestiger…" : "Ja, Prestige!"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prestige shop modal */}
      {shopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div
            className="flex w-full max-w-md flex-col rounded-2xl"
            style={{ background: "#0B1027", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "85vh" }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <h3 className="text-base font-bold text-white">Prestige-butikk</h3>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {pointsAvail} poeng tilgjengelig · {pointsSpent} brukt av {totalPrestige} totalt
                </p>
              </div>
              <button onClick={() => setShopModal(false)} style={{ color: "rgba(255,255,255,0.35)" }} className="hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Perk list */}
            <div className="scrollbar-hide flex-1 overflow-y-auto p-4 space-y-3">
              {(["income", "quality", "special"] as const).map((cat) => {
                const catLabel = { income: "💰 Inntekt", quality: "✨ Livskvalitet", special: "🎲 Spesial" }[cat];
                const perks = PRESTIGE_PERKS.filter((p) => p.category === cat);
                return (
                  <div key={cat}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>{catLabel}</p>
                    <div className="space-y-2">
                      {perks.map((perk) => {
                        const owned    = shopData[perk.id] ?? 0;
                        const maxed    = owned >= perk.maxPurchases;
                        const canBuy   = !maxed && pointsAvail >= perk.cost;
                        return (
                          <div
                            key={perk.id}
                            className="flex items-center gap-3 rounded-xl p-3"
                            style={{
                              background: maxed ? "rgba(52,211,153,0.06)" : canBuy ? "rgba(168,85,247,0.07)" : "rgba(255,255,255,0.03)",
                              border: maxed ? "1px solid rgba(52,211,153,0.2)" : canBuy ? "1px solid rgba(168,85,247,0.25)" : "1px solid rgba(255,255,255,0.06)",
                              borderRadius: 10,
                            }}
                          >
                            <span className="text-xl shrink-0">{perk.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white leading-tight">{perk.name}</p>
                              <p className="text-[11px] leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>{perk.description}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10px] font-semibold" style={{ color: maxed ? "#34d399" : "#A855F7" }}>
                                  {maxed ? `Maks (${owned}/${perk.maxPurchases})` : `${owned}/${perk.maxPurchases} kjøpt`}
                                </span>
                                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{perk.effect}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => void buyPerk(perk.id)}
                              disabled={!canBuy || shopBuying === perk.id}
                              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-40"
                              style={{
                                background: maxed ? "rgba(52,211,153,0.15)" : canBuy ? "#A855F7" : "rgba(255,255,255,0.06)",
                                color: maxed ? "#34d399" : canBuy ? "#fff" : "rgba(255,255,255,0.3)",
                                cursor: canBuy ? "pointer" : "default",
                              }}
                            >
                              {shopBuying === perk.id ? "…" : maxed ? "Maks" : `${perk.cost}p`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer with reset */}
            <div className="shrink-0 px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              {pointsSpent > 0 ? (
                <button
                  onClick={() => void resetShop()}
                  disabled={shopResetting}
                  className="w-full rounded-lg py-2.5 text-sm transition-colors hover:brightness-110 disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
                >
                  {shopResetting ? "Nullstiller…" : "Nullstill alle kjøp (refunderer poeng)"}
                </button>
              ) : (
                <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Ingen kjøp å nullstille ennå
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile tab-bar */}
      <div
        className="flex shrink-0 md:hidden"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0B1027" }}
      >
        {(["verdener", "klikker", "oppgraderinger"] as const).map((tab) => {
          const labels = { klikker: "Klikk", verdener: "Verdener", oppgraderinger: "Oppgrader" };
          return (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className="flex-1 py-2.5 text-xs font-semibold transition-colors"
              style={{
                color: mobileTab === tab ? "#A855F7" : "rgba(255,255,255,0.35)",
                borderBottom: mobileTab === tab ? "2px solid #A855F7" : "2px solid transparent",
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Left — Worlds */}
      <div
        className={`${mobileTab === "verdener" ? "flex" : "hidden"} md:flex w-full md:w-[180px] shrink-0 flex-col overflow-y-auto py-4 px-3 scrollbar-hide`}
        style={{ background: "#0B1027", borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        {WorldsPanel}
      </div>

      {/* Centre — Game */}
      <div className={`${mobileTab === "klikker" ? "flex" : "hidden"} md:flex flex-1 flex-col items-center md:justify-center overflow-y-auto px-4 pt-4 pb-6 md:px-8 md:py-6`}>
        {ClickPanel}
      </div>

      {/* Right — Upgrades */}
      <div
        className={`${mobileTab === "oppgraderinger" ? "flex" : "hidden"} md:flex w-full md:w-[260px] shrink-0 flex-col overflow-hidden`}
        style={{ background: "#0B1027", borderLeft: "1px solid rgba(255,255,255,0.07)" }}
      >
        {UpgradesPanel}
      </div>

    </div>
  );
}
