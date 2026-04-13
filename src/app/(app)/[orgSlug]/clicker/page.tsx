"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WORLDS, getWorldUpgrades, getUpgradeCost } from "@/lib/clickerUpgrades";
import { Coins, Zap, Clock, Trophy, X, MessageSquare, Send } from "lucide-react";

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
      setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 900);
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
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const world        = (profile.prestigeWorld ?? 1) as 1 | 2 | 3;
  const worldDef     = WORLDS[world];
  const prestigeCost = worldDef.prestigeCost;
  const prestigePct  = Math.min(100, (displayCoins / prestigeCost) * 100);
  const canPrestige  = displayCoins >= prestigeCost && world < 3;
  const nextWorld    = Math.min(world + 1, 3) as 1 | 2 | 3;
  const multiplier   = activeEvent?.type === "multiplier" ? activeEvent.multiplier : 1;
  const totalPrestige = profile.totalPrestige;
  const effectiveCpc = profile.coinsPerClick * multiplier * (hasFanpass ? 1.5 : 1);
  const effectiveCps = profile.coinsPerSecond * (hasFanpass ? 2 : 1);

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

  const worldGradients: Record<string, string> = {
    violet: "from-violet-600 to-indigo-700",
    amber:  "from-amber-500 to-orange-600",
    cyan:   "from-cyan-500 to-blue-600",
  };
  const btnGradient = worldGradients[worldDef.color] ?? worldGradients.violet;

  const MEDAL_CLS = ["text-amber-400", "text-zinc-300", "text-amber-700"];
  const AVATAR_CLS = [
    "ring-1 ring-amber-500/60  bg-amber-500/20",
    "ring-1 ring-zinc-400/40   bg-zinc-500/20",
    "ring-1 ring-amber-700/40  bg-amber-800/20",
  ];

  // Prestige bar color based on progress
  const barCls = prestigePct >= 80
    ? "bg-gradient-to-r from-amber-400 to-orange-500"
    : prestigePct >= 50
    ? "bg-gradient-to-r from-violet-500 to-amber-400"
    : "bg-violet-500";
  const barGlow = prestigePct >= 80 ? "shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "";

  // ── Panels ────────────────────────────────────────────────────────────────

  const WorldsPanel = (
    <div className="flex flex-col gap-1.5">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Verdener</p>
      {([
        { n: 1 as const, label: "Tech",    accentCls: "border-violet-600/40 bg-violet-600/10", hereCls: "text-violet-400" },
        { n: 2 as const, label: "Eventyr", accentCls: "border-amber-600/40  bg-amber-600/10",  hereCls: "text-amber-400"  },
        { n: 3 as const, label: "Romfart", accentCls: "border-cyan-600/40   bg-cyan-600/10",   hereCls: "text-cyan-400"   },
      ]).map(({ n, label, accentCls, hereCls }) => {
        const isActive  = world === n;
        const unlocked  = n === 1 || (n === 2 && totalPrestige >= 1) || (n === 3 && totalPrestige >= 2);
        const completed = (n === 1 && totalPrestige >= 1) || (n === 2 && totalPrestige >= 2);
        const wDef      = WORLDS[n];
        return (
          <div key={n} className={`rounded-lg border p-2.5 transition-all ${
            isActive  ? `border ${accentCls}`
            : unlocked ? "border-zinc-800 bg-zinc-900/60 opacity-70"
            : "border-zinc-800/50 bg-zinc-900/30 opacity-25"
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">{unlocked ? wDef.emoji : "🔒"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white leading-tight">Verden {n} — {label}</p>
                {!unlocked && <p className="text-[10px] text-zinc-500 leading-tight">Lås opp med prestige</p>}
                {completed  && <p className="text-[10px] text-emerald-400 leading-tight">Fullfort</p>}
                {isActive   && <p className={`text-[10px] leading-tight ${hereCls}`}>Du er her</p>}
              </div>
            </div>
            {isActive && world < 3 && (
              <div className="mt-2">
                <div className="mb-0.5 flex justify-between text-[9px] text-zinc-600">
                  <span>Til prestige</span>
                  <span>{fmt(Math.max(0, prestigeCost - displayCoins))}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
                  <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${prestigePct.toFixed(1)}%` }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div className="mt-1 rounded-lg border border-dashed border-zinc-800 p-2.5 opacity-25">
        <div className="flex items-center gap-2">
          <span className="text-base">❓</span>
          <div>
            <p className="text-xs font-semibold text-zinc-500 leading-tight">Verden 4</p>
            <p className="text-[10px] text-zinc-600 leading-tight">Kommer snart</p>
          </div>
        </div>
      </div>
    </div>
  );

  const ClickPanel = (
    <div className="flex w-full max-w-sm flex-col items-center">
      {/* Offline toast */}
      {offlineMsg !== null && (
        <div className="mb-4 w-full flex items-start gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3">
          <span className="text-xl">😴</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Velkommen tilbake!</p>
            <p className="text-xs text-zinc-400">
              +<span className="font-bold text-indigo-400">{fmt(offlineMsg)}</span> coins mens du var borte.
            </p>
          </div>
          <button onClick={() => setOfflineMsg(null)} className="text-zinc-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Event banner */}
      {activeEvent && activeEvent.type === "multiplier" && new Date(activeEvent.endsAt) > new Date() && (
        <div className="mb-4 w-full flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <span>⚡</span>
          <p className="text-sm text-amber-300">
            <span className="font-bold">{activeEvent.multiplier}x multiplier</span> aktiv!
          </p>
        </div>
      )}

      {/* Coin counter */}
      <div className="mb-1 flex items-center gap-2">
        <Coins className="h-8 w-8 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
        <span className="text-4xl font-bold tabular-nums text-white md:text-5xl">
          {fmt(displayCoins)}
        </span>
        <span className="text-xl text-zinc-400">coins</span>
      </div>
      {profile.allTimeHighCoins > 0 && (
        <p className="mb-1 text-xs text-zinc-600">
          Rekord: <span className="text-zinc-500">{fmt(profile.allTimeHighCoins)}</span>
        </p>
      )}

      {/* Badges */}
      {(hasFanpass || profile.permanentBonus > 1) && (
        <div className="mb-3 flex flex-wrap justify-center gap-1.5">
          {hasFanpass && (
            <>
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">Fanpass 1.5x klikk</span>
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">Fanpass 2x passiv</span>
            </>
          )}
          {profile.permanentBonus > 1 && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
              +{((profile.permanentBonus - 1) * 100).toFixed(0)}% prestige
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 flex gap-5 text-sm text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-yellow-500" />{fmt(effectiveCpc)}/klikk
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-indigo-400" />{fmt(effectiveCps)}/sek
        </span>
      </div>

      {/* Click button */}
      <div className="relative mb-6">
        {/* Passive income pulse ring */}
        {effectiveCps > 0 && (
          <span
            className="pointer-events-none absolute inset-0 rounded-full animate-ping opacity-[0.15]"
            style={{ background: worldDef.color === "violet" ? "#7c3aed" : worldDef.color === "amber" ? "#d97706" : "#0891b2" }}
          />
        )}
        {/* Floating damage numbers */}
        {floats.map((fl) => (
          <span key={fl.id} className="clicker-float" style={{ left: fl.x, top: fl.y }}>
            +{fmt(fl.value)}
          </span>
        ))}
        <button
          onClick={handleClick}
          style={{ touchAction: "manipulation" }}
          className={`relative flex h-56 w-56 select-none items-center justify-center rounded-full bg-gradient-to-br ${btnGradient} shadow-2xl transition-transform duration-75 active:scale-95 hover:scale-[1.03] md:h-48 md:w-48`}
        >
          {logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logoUrl} alt="" className="h-36 w-36 rounded-full object-cover md:h-32 md:w-32" />
            : <span className="text-7xl">{worldDef.emoji}</span>
          }
        </button>
      </div>

      <p className="mb-4 text-xs text-zinc-600">
        {fmt(totalClicks)} totale klikk{totalPrestige > 0 && ` · Prestige ${totalPrestige}`}
      </p>

      {/* Prestige bar / button */}
      {canPrestige ? (
        <button
          onClick={() => setPrestigeModal(true)}
          className="mb-6 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 font-bold text-white shadow-lg shadow-amber-500/30 transition-all hover:shadow-amber-500/50"
        >
          PRESTIGE! Verden {world} → {nextWorld}
          <span className="mt-0.5 block text-xs font-normal opacity-80">
            Nullstill + {worldDef.fanpassCoins} Fanpass-coins + 10% bonus
          </span>
        </button>
      ) : world < 3 ? (
        <div className="mb-6 w-full">
          <div className="mb-1 flex justify-between text-[10px] text-zinc-600">
            <span>Prestige fremgang</span>
            <span>{prestigePct.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barCls} ${barGlow}`}
              style={{ width: `${prestigePct.toFixed(2)}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[10px] text-zinc-700">{fmt(displayCoins)} / {fmt(prestigeCost)}</p>
        </div>
      ) : null}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Topp 5</p>
            <span className="ml-auto text-[10px] text-zinc-600">etter rekord</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {leaderboard.map((entry, i) => {
              const w    = (entry.prestigeWorld ?? 1) as 1 | 2 | 3;
              const wDef = WORLDS[w];
              const wColor = w === 1 ? "text-violet-400" : w === 2 ? "text-amber-400" : "text-cyan-400";
              return (
                <div key={entry.user.id} className="flex items-center gap-2.5">
                  <span className={`w-5 shrink-0 text-center text-xs font-bold ${MEDAL_CLS[i] ?? "text-zinc-600"}`}>
                    {i + 1}.
                  </span>
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${AVATAR_CLS[i] ?? "bg-indigo-800/30"}`}>
                    {initials(entry.user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-zinc-300">{entry.user.name ?? "Ukjent"}</p>
                    <p className={`text-[10px] leading-tight ${wColor}`}>{wDef.emoji} Verden {w}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-amber-400">{fmt(entry.allTimeHighCoins)}</span>
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
      <div className="shrink-0 border-b border-zinc-800 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{worldDef.emoji} Oppgraderinger</p>
        <p className="text-[10px] text-zinc-600">{upgradeRows.length} tilgjengelige</p>
      </div>

      {/* Mobile: full-width */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2 md:hidden">
        {upgradeRows.map((upg) => (
          <div key={upg.id} className={`rounded-lg border p-3 flex items-center gap-3 transition-colors ${
            upg.canAfford  ? "border-indigo-500/30 bg-indigo-500/5"
            : upg.level > 0 ? "border-zinc-700 bg-zinc-800/50"
            : "border-zinc-800 bg-zinc-900/50"
          }`}>
            <span className="text-2xl shrink-0">{upg.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white truncate">{upg.name}</p>
                {upg.level > 0 && (
                  <span className="shrink-0 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">Lv{upg.level}</span>
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
              className={`shrink-0 min-h-[44px] min-w-[64px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors active:scale-95 ${
                upg.level >= upg.maxLevel ? "cursor-default bg-zinc-800 text-zinc-600"
                : upg.canAfford ? "bg-indigo-600 text-white hover:bg-indigo-500"
                : "cursor-not-allowed bg-zinc-800 text-zinc-600"
              }`}>
              {upg.level >= upg.maxLevel ? "Maks" : buying === upg.id ? "…" : `${fmt(upg.cost)} 🪙`}
            </button>
          </div>
        ))}
      </div>

      {/* Desktop: compact */}
      <div className="hidden md:block flex-1 overflow-y-auto py-3 px-2 space-y-1.5">
        {upgradeRows.map((upg) => (
          <div key={upg.id} className={`rounded-lg border p-2 transition-colors ${
            upg.canAfford  ? "border-indigo-500/30 bg-indigo-500/5"
            : upg.level > 0 ? "border-zinc-700 bg-zinc-800/50"
            : "border-zinc-800 bg-zinc-900/50"
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base leading-none">{upg.emoji}</span>
              <p className="text-xs font-semibold text-white leading-tight truncate flex-1">{upg.name}</p>
              {upg.level > 0 && (
                <span className="shrink-0 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-300 leading-none">{upg.level}</span>
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
              className={`w-full rounded py-1.5 text-[10px] font-semibold transition-colors ${
                upg.level >= upg.maxLevel ? "cursor-default bg-zinc-800 text-zinc-600"
                : upg.canAfford ? "bg-indigo-600 text-white hover:bg-indigo-500"
                : "cursor-not-allowed bg-zinc-800 text-zinc-600"
              }`}>
              {upg.level >= upg.maxLevel ? "Maks" : buying === upg.id ? "…" : `${fmt(upg.cost)} 🪙`}
            </button>
          </div>
        ))}
      </div>
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col md:flex-row h-[calc(100dvh-7rem)] md:h-[calc(100vh-56px)] bg-zinc-950">

      {/* Prestige modal */}
      {prestigeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-white">Gå i Prestige?</h3>
            <p className="mb-4 text-sm text-zinc-400">
              Nullstiller alle coins og oppgraderinger for Verden {world}.
            </p>
            <ul className="mb-5 space-y-2 text-sm text-zinc-300">
              <li>🪙 <strong className="text-amber-400">{worldDef.fanpassCoins} Fanpass-coins</strong></li>
              <li>{worldDef.badge} Badge lagt til profilen</li>
              <li>⚡ <strong className="text-emerald-400">+10% permanent bonus</strong></li>
              {world < 3 && (
                <li>🌍 Låser opp <strong className="text-white">Verden {nextWorld}: {WORLDS[nextWorld].name} {WORLDS[nextWorld].emoji}</strong></li>
              )}
            </ul>
            <div className="flex gap-3">
              <button onClick={() => setPrestigeModal(false)}
                className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-400 transition-colors hover:text-white">
                Nei, fortsett
              </button>
              <button onClick={() => void handlePrestige()} disabled={prestiging}
                className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
                {prestiging ? "Prestiger…" : "Ja, Prestige!"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat slide-over */}
      <div className={`fixed right-0 top-0 z-40 flex h-full w-full flex-col border-l border-zinc-800 bg-zinc-950/95 backdrop-blur-md transition-transform duration-300 md:w-80 ${chatOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">Stream Chat</span>
          </div>
          <button onClick={() => setChatOpen(false)} className="text-zinc-500 transition-colors hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {chatMessages.length === 0
            ? <p className="mt-8 text-center text-xs text-zinc-600">Ingen meldinger ennå. Si hei!</p>
            : chatMessages.map((msg) => (
              <div key={msg.id} className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-700/60 text-[10px] font-bold text-white">
                  {initials(msg.author.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-indigo-300">{msg.author.name ?? "Ukjent"}</p>
                  <p className="break-words text-sm text-zinc-300">{msg.content}</p>
                </div>
              </div>
            ))
          }
          <div ref={chatBottomRef} />
        </div>
        <div className="shrink-0 border-t border-zinc-800 p-3">
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendChatMessage(); } }}
              placeholder="Skriv en melding…"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={() => void sendChatMessage()}
              disabled={!chatInput.trim() || chatSending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile tab-bar */}
      <div className="flex shrink-0 border-b border-zinc-800 bg-zinc-900 md:hidden">
        {(["verdener", "klikker", "oppgraderinger"] as const).map((tab) => {
          const labels = { klikker: "Klikk", verdener: "Verdener", oppgraderinger: "Oppgrader" };
          return (
            <button key={tab} onClick={() => setMobileTab(tab)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                mobileTab === tab ? "border-b-2 border-indigo-500 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}>
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Left — Worlds */}
      <div className={`${mobileTab === "verdener" ? "flex" : "hidden"} md:flex w-full md:w-[200px] shrink-0 flex-col border-r border-zinc-800 overflow-y-auto py-4 px-3`}>
        {WorldsPanel}
      </div>

      {/* Centre — Game */}
      <div className={`${mobileTab === "klikker" ? "flex" : "hidden"} md:flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6 md:px-8`}>
        {ClickPanel}
      </div>

      {/* Right — Upgrades */}
      <div className={`${mobileTab === "oppgraderinger" ? "flex" : "hidden"} md:flex w-full md:w-[260px] shrink-0 flex-col border-l border-zinc-800 overflow-hidden`}>
        {UpgradesPanel}
      </div>

      {/* Floating chat button */}
      {!chatOpen && orgId && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 shadow-lg shadow-indigo-500/30 transition-all hover:scale-110 hover:bg-indigo-500 active:scale-95 md:bottom-6"
        >
          <MessageSquare className="h-5 w-5 text-white" />
        </button>
      )}
    </div>
  );
}
