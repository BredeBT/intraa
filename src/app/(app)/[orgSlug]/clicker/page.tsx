"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WORLDS, getWorldUpgrades, getUpgradeCost } from "@/lib/clickerUpgrades";
import { Zap, Clock, Trophy, X, MessageSquare, Send, Lock } from "lucide-react";

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

interface UpgradeState  { upgradeId: string; level: number }

interface LeaderboardEntry {
  allTimeHighCoins: number;
  totalClicks:      number;
  prestigeWorld:    number;
  user:             { id: string; name: string | null; avatarUrl: string | null };
}

interface ActiveEvent { type: string; multiplier: number; endsAt: string }

interface ChatMessage {
  id:        string;
  content:   string;
  createdAt: string;
  author:    { id: string; name: string | null; avatarUrl: string | null };
}

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
  const [prestigeModal, setPrestigeModal] = useState(false);
  const [prestiging,    setPrestiging]    = useState(false);
  const [totalClicks,   setTotalClicks]   = useState(0);
  const [hasFanpass,    setHasFanpass]    = useState(false);
  const [isMobile,      setIsMobile]      = useState(false);

  // Chat
  const [chatOpen,     setChatOpen]     = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput,    setChatInput]    = useState("");
  const [chatSending,  setChatSending]  = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

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
      .then((data: { profile: ClickerProfile; upgrades: UpgradeState[]; offlineEarned: number; activeEvent: ActiveEvent | null }) => {
        const dbCoins = typeof data.profile.coins === "number" && isFinite(data.profile.coins)
          ? data.profile.coins : 0;
        serverCoins.current = dbCoins;
        const safeLocalDelta = isFinite(localDelta.current) ? localDelta.current : 0;
        localDelta.current   = safeLocalDelta;
        setProfile(data.profile);
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
  useEffect(() => {
    if (!coinsPerSecond) return;
    const tick = coinsPerSecond * (hasFanpass ? 2 : 1);
    const id = setInterval(() => {
      localDelta.current += tick;
      setDisplayCoins(Math.floor(serverCoins.current + localDelta.current));
    }, 1000);
    return () => clearInterval(id);
  }, [coinsPerSecond, hasFanpass]);

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
          localDelta.current  -= delta;
          clickCount.current  -= clicks;
          serverCoins.current = body.coins;
          setTotalClicks((t) => t + clicks);
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

  // ── Chat polling ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId || !chatOpen) return;
    const poll = async () => {
      const res = await fetch(`/api/stream/chat?orgId=${orgId}`).catch(() => null);
      if (!res?.ok) return;
      const data = await res.json() as { messages: ChatMessage[] };
      setChatMessages(data.messages);
    };
    void poll();
    const id = setInterval(() => void poll(), 4_000);
    return () => clearInterval(id);
  }, [orgId, chatOpen]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Click handler ─────────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!profile) return;
    const multiplier = activeEvent?.type === "multiplier" ? activeEvent.multiplier : 1;
    const cpc = profile.coinsPerClick * multiplier * (hasFanpass ? 1.5 : 1);
    localDelta.current += cpc;
    clickCount.current += 1;
    setDisplayCoins(serverCoins.current + localDelta.current);
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

  // ── Chat send ─────────────────────────────────────────────────────────────
  async function sendChatMessage() {
    if (!orgId || !chatInput.trim() || chatSending) return;
    const content = chatInput.trim();
    setChatInput("");
    setChatSending(true);
    try {
      await fetch("/api/stream/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orgId, content }),
      });
      const res = await fetch(`/api/stream/chat?orgId=${orgId}`);
      if (res.ok) {
        const data = await res.json() as { messages: ChatMessage[] };
        setChatMessages(data.messages);
      }
    } catch { /* ignore */ }
    setChatSending(false);
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "#0d0d14" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "#6c47ff", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const world         = (profile.prestigeWorld ?? 1) as 1 | 2 | 3;
  const worldDef      = WORLDS[world];
  const prestigeCost  = worldDef.prestigeCost;
  const prestigePct   = Math.min(100, (displayCoins / prestigeCost) * 100);
  const canPrestige   = displayCoins >= prestigeCost && world < 3;
  const nextWorld     = Math.min(world + 1, 3) as 1 | 2 | 3;
  const multiplier    = activeEvent?.type === "multiplier" ? activeEvent.multiplier : 1;
  const totalPrestige = profile.totalPrestige;
  const effectiveCpc  = profile.coinsPerClick * multiplier * (hasFanpass ? 1.5 : 1);
  const effectiveCps  = profile.coinsPerSecond * (hasFanpass ? 2 : 1);

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

  // ── Panels ────────────────────────────────────────────────────────────────

  const WorldsPanel = (
    <div className="flex flex-col gap-1.5">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
        Verdener
      </p>

      {([
        { n: 1 as const, label: "Tech"    },
        { n: 2 as const, label: "Eventyr" },
        { n: 3 as const, label: "Romfart" },
      ]).map(({ n, label }) => {
        const isActive  = world === n;
        const unlocked  = n === 1 || (n === 2 && totalPrestige >= 1) || (n === 3 && totalPrestige >= 2);
        const completed = (n === 1 && totalPrestige >= 1) || (n === 2 && totalPrestige >= 2);
        const wDef      = WORLDS[n];
        return (
          <div
            key={n}
            style={
              isActive
                ? { background: "rgba(108,71,255,0.13)", border: "1px solid rgba(108,71,255,0.38)", borderRadius: 10 }
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
                  style={{
                    fontWeight: 500,
                    color: isActive ? "#a78bfa" : "rgba(255,255,255,0.5)",
                  }}
                >
                  Verden {n} — {label}
                </p>
                {!unlocked && (
                  <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.25)" }}>
                    Lås opp med prestige
                  </p>
                )}
                {completed && (
                  <p className="text-[10px] leading-tight" style={{ color: "#34d399" }}>Fullført</p>
                )}
                {isActive && !completed && (
                  <p className="text-[10px] leading-tight" style={{ color: "#a78bfa" }}>Du er her</p>
                )}
              </div>
            </div>

            {isActive && world < 3 && (
              <div className="mt-2">
                <div
                  className="h-[3px] overflow-hidden rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${prestigePct.toFixed(2)}%`, background: "#6c47ff" }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* World 4 — coming soon */}
      <div
        style={{
          background: "rgba(255,255,255,0.01)",
          border: "1px dashed rgba(255,255,255,0.1)",
          borderRadius: 10,
          opacity: 0.3,
        }}
        className="p-2.5"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">❓</span>
          <div>
            <p className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Verden 4</p>
            <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.2)" }}>Kommer snart</p>
          </div>
        </div>
      </div>
    </div>
  );

  const ClickPanel = (
    <div className="flex w-full max-w-sm flex-col items-center">
      {/* Offline toast */}
      {offlineMsg !== null && (
        <div
          className="mb-4 w-full flex items-start gap-3 p-3 rounded-xl"
          style={{ background: "rgba(108,71,255,0.1)", border: "1px solid rgba(108,71,255,0.25)" }}
        >
          <span className="text-xl">😴</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Velkommen tilbake!</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              +<span className="font-bold" style={{ color: "#a78bfa" }}>{fmt(offlineMsg)}</span> coins mens du var borte.
            </p>
          </div>
          <button onClick={() => setOfflineMsg(null)} style={{ color: "rgba(255,255,255,0.3)" }} className="hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
      <div className="mb-1 flex items-baseline gap-2">
        <span
          className="tabular-nums text-white leading-none"
          style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-2px" }}
        >
          {fmt(displayCoins)}
        </span>
      </div>
      <p className="mb-1 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>coins</p>

      {/* Fanpass badges */}
      {(hasFanpass || profile.permanentBonus > 1) && (
        <div className="mb-3 flex flex-wrap justify-center gap-1.5">
          {hasFanpass && (
            <>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs"
                style={{ background: "rgba(108,71,255,0.2)", color: "#a78bfa" }}
              >
                Fanpass 1.5x klikk
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs"
                style={{ background: "rgba(108,71,255,0.2)", color: "#a78bfa" }}
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
      <div className="mb-7 flex gap-6">
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

      {/* Click button */}
      <div className="relative mb-7 flex items-center justify-center">
        {/* Outer pulse ring */}
        {effectiveCps > 0 && (
          <div
            className="pulse-ring pointer-events-none absolute rounded-full"
            style={{
              width: 200,
              height: 200,
              background: "rgba(108,71,255,0.12)",
              border: "2px solid rgba(108,71,255,0.2)",
            }}
          />
        )}

        {/* Outer container */}
        <div
          className="flex items-center justify-center rounded-full transition-all duration-150 hover:scale-[1.02]"
          style={{
            width: 196,
            height: 196,
            background: "#1e1b4b",
            border: "2px solid rgba(108,71,255,0.25)",
          }}
        >
          {/* Floating damage numbers */}
          {floats.map((fl) => (
            <span key={fl.id} className="clicker-float" style={{ left: fl.x, top: fl.y }}>
              +{fmt(fl.value)}
            </span>
          ))}

          {/* Inner clickable circle */}
          <button
            onClick={handleClick}
            style={{
              width: 160,
              height: 160,
              background: "#6c47ff",
              borderRadius: "50%",
              touchAction: "manipulation",
              transition: "transform 0.1s ease",
              boxShadow: "0 0 32px rgba(108,71,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
            className="relative flex select-none items-center justify-center active:scale-[0.96] hover:brightness-110"
          >
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="" className="h-28 w-28 rounded-full object-cover" />
              : <span className="text-6xl">{worldDef.emoji}</span>
            }
          </button>
        </div>
      </div>

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
            Nullstill + {worldDef.fanpassCoins} Fanpass-coins + 10% bonus
          </span>
        </button>
      ) : world < 3 ? (
        <div className="mb-6 w-full">
          <div className="mb-1.5 flex justify-between">
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Prestige fremgang</span>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{fmt(displayCoins)} / {fmt(prestigeCost)}</span>
          </div>
          <div
            className="overflow-hidden rounded-full"
            style={{ height: 6, background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${prestigePct.toFixed(2)}%`,
                background: "linear-gradient(to right, #6c47ff, #a78bfa)",
              }}
            />
          </div>
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
              const w     = (entry.prestigeWorld ?? 1) as 1 | 2 | 3;
              const wDef  = WORLDS[w];
              const wColor = w === 1 ? "#a78bfa" : w === 2 ? "#fbbf24" : "#67e8f9";
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
                      background: "rgba(108,71,255,0.25)",
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
                  <span className="shrink-0 text-xs font-semibold" style={{ color: "#a78bfa" }}>
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
              background: upg.canAfford ? "rgba(108,71,255,0.08)" : "rgba(255,255,255,0.03)",
              border: upg.canAfford
                ? "1px solid rgba(108,71,255,0.3)"
                : upg.level > 0
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10,
            }}
          >
            {/* Icon */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ background: "rgba(108,71,255,0.2)" }}
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
                  style={{ background: "rgba(108,71,255,0.25)", color: "#a78bfa" }}
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
                    ? "#6c47ff"
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
              background: upg.canAfford ? "rgba(108,71,255,0.08)" : "rgba(255,255,255,0.04)",
              border: upg.canAfford
                ? "1px solid rgba(108,71,255,0.28)"
                : upg.level > 0
                ? "1px solid rgba(255,255,255,0.07)"
                : "1px solid rgba(255,255,255,0.04)",
              borderRadius: 10,
            }}
          >
            {/* Icon */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg leading-none"
              style={{ background: "rgba(108,71,255,0.2)" }}
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
                  style={{ background: "rgba(108,71,255,0.25)", color: "#a78bfa" }}
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
                    ? "#a78bfa"
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
      style={{ background: "#0d0d14" }}
    >
      {/* Prestige modal */}
      {prestigeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#12121e", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <h3 className="mb-2 text-lg font-bold text-white">Gå i Prestige?</h3>
            <p className="mb-4 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              Nullstiller alle coins og oppgraderinger for Verden {world}.
            </p>
            <ul className="mb-5 space-y-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              <li>🪙 <strong style={{ color: "#fbbf24" }}>{worldDef.fanpassCoins} Fanpass-coins</strong></li>
              <li>{worldDef.badge} Badge lagt til profilen</li>
              <li>⚡ <strong style={{ color: "#34d399" }}>+10% permanent bonus</strong></li>
              {world < 3 && (
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

      {/* Chat slide-over */}
      <div
        className={`fixed right-0 top-0 z-40 flex h-full w-full flex-col transition-transform duration-300 md:w-80 ${chatOpen ? "translate-x-0" : "translate-x-full"}`}
        style={{
          background: "rgba(13,13,20,0.96)",
          backdropFilter: "blur(12px)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="flex shrink-0 items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" style={{ color: "#a78bfa" }} />
            <span className="text-sm font-semibold text-white">Stream Chat</span>
          </div>
          <button
            onClick={() => setChatOpen(false)}
            className="transition-colors hover:text-white"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scrollbar-hide flex-1 overflow-y-auto p-3 space-y-2.5">
          {chatMessages.length === 0
            ? <p className="mt-8 text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Ingen meldinger ennå. Si hei!</p>
            : chatMessages.map((msg) => (
              <div key={msg.id} className="flex gap-2">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: "rgba(108,71,255,0.4)" }}
                >
                  {initials(msg.author.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: "#a78bfa" }}>{msg.author.name ?? "Ukjent"}</p>
                  <p className="break-words text-sm text-white">{msg.content}</p>
                </div>
              </div>
            ))
          }
          <div ref={chatBottomRef} />
        </div>
        <div className="shrink-0 p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendChatMessage(); } }}
              placeholder="Skriv en melding…"
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
            <button
              onClick={() => void sendChatMessage()}
              disabled={!chatInput.trim() || chatSending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: "#6c47ff" }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile tab-bar */}
      <div
        className="flex shrink-0 md:hidden"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#12121e" }}
      >
        {(["verdener", "klikker", "oppgraderinger"] as const).map((tab) => {
          const labels = { klikker: "Klikk", verdener: "Verdener", oppgraderinger: "Oppgrader" };
          return (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className="flex-1 py-2.5 text-xs font-semibold transition-colors"
              style={{
                color: mobileTab === tab ? "#a78bfa" : "rgba(255,255,255,0.35)",
                borderBottom: mobileTab === tab ? "2px solid #6c47ff" : "2px solid transparent",
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
        style={{ background: "#12121e", borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        {WorldsPanel}
      </div>

      {/* Centre — Game */}
      <div className={`${mobileTab === "klikker" ? "flex" : "hidden"} md:flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6 md:px-8`}>
        {ClickPanel}
      </div>

      {/* Right — Upgrades */}
      <div
        className={`${mobileTab === "oppgraderinger" ? "flex" : "hidden"} md:flex w-full md:w-[260px] shrink-0 flex-col overflow-hidden`}
        style={{ background: "#12121e", borderLeft: "1px solid rgba(255,255,255,0.07)" }}
      >
        {UpgradesPanel}
      </div>

      {/* Floating chat button */}
      {!chatOpen && orgId && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full text-white transition-all hover:scale-110 hover:brightness-110 active:scale-95 md:bottom-6"
          style={{
            background: "#6c47ff",
            boxShadow: "0 4px 20px rgba(108,71,255,0.4)",
          }}
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
