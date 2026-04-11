"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Users, ExternalLink, Wifi, WifiOff, Settings, Pen,
  Heart, MessageCircle, ChevronRight, Send, Sparkles, X,
  Coins, Zap, Clock,
} from "lucide-react";
import Link from "next/link";
import type { StreamStatus } from "@/app/api/stream/status/route";
import type { PostWithAuthor } from "@/lib/types";
import { UPGRADES, getUpgradeCost } from "@/lib/clickerUpgrades";
import StreamChat from "./StreamChat";
import CountdownTimer from "./CountdownTimer";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  orgId:             string;
  userId:            string;
  orgName:           string;
  orgSlug:           string;
  logoUrl:           string | null;
  twitchChannel:     string | null;
  youtubeChannel:    string | null;
  preferredPlatform: "twitch" | "youtube";
  isAdmin:           boolean;
}

type PanelTab  = "feed" | "chat" | "spill" | "poll" | "giveaway";
type MobileTab = "stream" | "twitch-chat" | "feed" | "chat";

const CHAT_OPEN_MINUTES = 60;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function relativeTime(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Nå";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}t`;
  return new Date(date).toLocaleDateString("no-NO", { day: "numeric", month: "short" });
}

const domain = typeof window !== "undefined"
  ? window.location.hostname
  : (process.env.NEXT_PUBLIC_DOMAIN ?? "intraa.net");

// ─── FeedTab ─────────────────────────────────────────────────────────────────

function FeedTab({ orgId, userId, isAdmin }: { orgId: string; userId: string; isAdmin: boolean }) {
  const [posts,     setPosts]     = useState<PostWithAuthor[]>([]);
  const [newCount,  setNewCount]  = useState(0);
  const [composing, setComposing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [posting,   setPosting]   = useState(false);
  const firstLoad = useRef(true);
  const knownIds  = useRef<Set<string>>(new Set());

  async function fetchPosts() {
    try {
      const res   = await fetch(`/api/posts?orgId=${orgId}`);
      if (!res.ok) return;
      const fresh = await res.json() as PostWithAuthor[];
      if (firstLoad.current) {
        firstLoad.current = false;
        fresh.forEach((p) => knownIds.current.add(p.id));
        setPosts(fresh.slice(0, 5));
        return;
      }
      const newOnes = fresh.filter((p) => !knownIds.current.has(p.id));
      newOnes.forEach((p) => knownIds.current.add(p.id));
      if (newOnes.length > 0) setNewCount((n) => n + newOnes.length);
      setPosts(fresh.slice(0, 5));
    } catch { /* silent */ }
  }

  useEffect(() => {
    void fetchPosts();
    const interval = setInterval(fetchPosts, 15_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function handleLike(postId: string, likedByMe: boolean) {
    setPosts((prev) => prev.map((p) => p.id === postId
      ? { ...p, likedByMe: !likedByMe, likeCount: likedByMe ? p.likeCount - 1 : p.likeCount + 1 }
      : p));
    await fetch("/api/likes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    }).catch(() => null);
  }

  async function handlePost() {
    const text = draftText.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      await fetch("/api/posts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, content: text }),
      });
      setDraftText(""); setComposing(false);
      await fetchPosts();
    } catch { /* silent */ } finally { setPosting(false); }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-violet-900/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-violet-300">Siste innlegg</span>
          {newCount > 0 && (
            <button onClick={() => setNewCount(0)}
              className="animate-pulse rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
              {newCount} nytt
            </button>
          )}
        </div>
        {isAdmin && (
          <button onClick={() => setComposing((p) => !p)}
            className="flex items-center gap-1 rounded-md border border-violet-800 px-2 py-1 text-[11px] text-violet-400 transition-colors hover:border-violet-600 hover:text-violet-200">
            <Pen className="h-3 w-3" /> Opprett
          </button>
        )}
      </div>
      {composing && (
        <div className="shrink-0 border-b border-violet-900/40 p-3">
          <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handlePost(); }}
            rows={3} placeholder="Del noe med organisasjonen…"
            className="w-full resize-none rounded-lg border border-violet-800/60 bg-violet-950/40 px-3 py-2 text-xs text-white placeholder-violet-600 outline-none focus:border-violet-500" />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-violet-700">⌘↵ for å sende</span>
            <div className="flex gap-2">
              <button onClick={() => setComposing(false)} className="text-xs text-zinc-500 hover:text-zinc-300">Avbryt</button>
              <button onClick={() => void handlePost()} disabled={!draftText.trim() || posting}
                className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
                <Send className="h-3 w-3" /> {posting ? "…" : "Del"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {posts.length === 0
          ? <p className="px-3 py-6 text-center text-xs text-zinc-600">Ingen innlegg ennå</p>
          : (
            <div className="divide-y divide-violet-900/30">
              {posts.map((post) => (
                <div key={post.id} className="px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-800/50 text-[9px] font-semibold text-violet-200">
                      {initials(post.author.name ?? "?")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="truncate text-[11px] font-semibold text-white">{post.author.name}</span>
                        <span className="shrink-0 text-[10px] text-zinc-600">{relativeTime(post.createdAt)}</span>
                      </div>
                      {post.content && <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-400">{post.content}</p>}
                      <div className="mt-1.5 flex items-center gap-3">
                        <button onClick={() => void handleLike(post.id, post.likedByMe)}
                          className={`flex items-center gap-1 text-[10px] transition-colors ${post.likedByMe ? "text-rose-400" : "text-zinc-600 hover:text-rose-400"}`}>
                          <Heart className="h-3 w-3" fill={post.likedByMe ? "currentColor" : "none"} />
                          {post.likeCount > 0 && post.likeCount}
                        </button>
                        <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                          <MessageCircle className="h-3 w-3" />
                          {post.comments.length > 0 && post.comments.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
      <div className="shrink-0 border-t border-violet-900/40 px-3 py-2">
        <Link href="/feed" className="flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:text-violet-300">
          Se alle innlegg <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── ComingSoon ───────────────────────────────────────────────────────────────

function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="rounded-full border border-amber-700/50 bg-amber-900/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
        Kommer snart
      </span>
      <p className="text-sm font-medium text-zinc-400">{title}</p>
      <p className="text-xs text-zinc-600">{desc}</p>
    </div>
  );
}

// ─── SpillTab ─────────────────────────────────────────────────────────────────

interface ClickerProfile { coins: number; totalClicks: number; coinsPerClick: number; coinsPerSecond: number }
interface ClickerUpgradeState { upgradeId: string; level: number }

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toLocaleString("no-NO");
}

function SpillTab({ orgId, orgSlug, logoUrl }: { orgId: string; orgSlug: string; logoUrl: string | null }) {
  const [profile,  setProfile]  = useState<ClickerProfile | null>(null);
  const [upgrades, setUpgrades] = useState<ClickerUpgradeState[]>([]);
  const [coins,    setCoins]    = useState(0);
  const [clicking, setClicking] = useState(false);
  const [buying,   setBuying]   = useState<string | null>(null);
  const clickBuffer = useRef(0);

  useEffect(() => {
    fetch(`/api/clicker?orgId=${orgId}`)
      .then((r) => r.json())
      .then((data: { profile: ClickerProfile; upgrades: ClickerUpgradeState[] }) => {
        setProfile(data.profile);
        setCoins(data.profile.coins);
        setUpgrades(data.upgrades);
      })
      .catch(() => null);
  }, [orgId]);

  // Passive income tick
  useEffect(() => {
    if (!profile?.coinsPerSecond) return;
    const interval = setInterval(() => setCoins((c) => c + profile.coinsPerSecond), 1000);
    return () => clearInterval(interval);
  }, [profile?.coinsPerSecond]);

  // Batch click flush every 2s
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!clickBuffer.current) return;
      const batch = clickBuffer.current;
      clickBuffer.current = 0;
      const res = await fetch("/api/clicker/click", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, clicks: batch }),
      });
      if (res.ok) {
        const data = await res.json() as { coins: number };
        setCoins(data.coins);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [orgId]);

  const handleClick = useCallback(() => {
    if (!profile) return;
    clickBuffer.current++;
    setCoins((c) => c + profile.coinsPerClick);
    setClicking(true);
    setTimeout(() => setClicking(false), 100);
  }, [profile]);

  async function buyUpgrade(upgradeId: string) {
    if (!orgId || buying) return;
    setBuying(upgradeId);
    const res = await fetch("/api/clicker/upgrade", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, upgradeId }),
    });
    if (res.ok) {
      const data = await res.json() as { profile: ClickerProfile; upgrades: ClickerUpgradeState[] };
      setProfile(data.profile); setCoins(data.profile.coins); setUpgrades(data.upgrades);
    }
    setBuying(null);
  }

  if (!profile) {
    return <div className="flex flex-1 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>;
  }

  // 3 cheapest affordable upgrades
  const affordableUpgrades = UPGRADES
    .map((def) => {
      const owned = upgrades.find((u) => u.upgradeId === def.id);
      const level = owned?.level ?? 0;
      const cost  = getUpgradeCost(def.id, level);
      return { ...def, level, cost, canAfford: coins >= cost && level < def.maxLevel };
    })
    .filter((u) => u.level < u.maxLevel)
    .sort((a, b) => a.cost - b.cost)
    .slice(0, 3);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Stats */}
      <div className="shrink-0 border-b border-violet-900/40 px-3 py-2">
        <div className="flex items-center gap-1.5 text-sm font-bold text-amber-400">
          <Coins className="h-3.5 w-3.5" />
          <span>{fmt(coins)}</span>
        </div>
        <div className="mt-0.5 flex gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-600" />{fmt(profile.coinsPerClick)}/klikk</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-indigo-600" />{fmt(profile.coinsPerSecond)}/sek</span>
        </div>
      </div>

      {/* Click button */}
      <div className="flex shrink-0 justify-center py-4">
        <button
          onClick={handleClick}
          className={`flex h-20 w-20 select-none items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg shadow-violet-500/20 transition-transform ${clicking ? "scale-90" : "hover:scale-105"}`}
        >
          {logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            : <span className="text-3xl">🎮</span>
          }
        </button>
      </div>

      {/* Upgrades */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Oppgraderinger</p>
        <div className="flex flex-col gap-1.5">
          {affordableUpgrades.map((upg) => (
            <button key={upg.id} onClick={() => buyUpgrade(upg.id)}
              disabled={!upg.canAfford || buying === upg.id}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                upg.canAfford ? "border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20" : "border-zinc-800 bg-zinc-900 opacity-50"
              }`}
            >
              <span className="text-base leading-none">{upg.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-white">{upg.name} <span className="font-normal text-zinc-500">Niv.{upg.level}</span></p>
                <p className="text-[10px] text-zinc-500">{fmt(upg.cost)} 🪙</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Link to full clicker */}
      <div className="shrink-0 border-t border-violet-900/40 px-3 py-2">
        <Link href={`/${orgSlug}/clicker`}
          className="flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:text-violet-300">
          Se alle oppgraderinger <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── IntraaPanel ─────────────────────────────────────────────────────────────

function IntraaPanel({
  orgId, orgSlug, logoUrl, userId, isAdmin, panelTab, setPanelTab, adminOpen, setAdminOpen, chatDisabled,
}: {
  orgId:        string;
  orgSlug:      string;
  logoUrl:      string | null;
  userId:       string;
  isAdmin:      boolean;
  panelTab:     PanelTab;
  setPanelTab:  (t: PanelTab) => void;
  adminOpen:    boolean;
  setAdminOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  chatDisabled?: boolean;
}) {
  const PANEL_TABS: { id: PanelTab; label: string; soon?: boolean }[] = [
    { id: "feed",     label: "Feed" },
    { id: "chat",     label: "Chat" },
    { id: "spill",    label: "Spill" },
    { id: "poll",     label: "Poll",     soon: true },
    { id: "giveaway", label: "Giveaway", soon: true },
  ];

  return (
    <>
      {/* Gradient separator */}
      <div className="h-px shrink-0 bg-gradient-to-r from-violet-600 via-violet-400 to-transparent" />

      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b-2 border-violet-700/50 bg-violet-950/50 px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-violet-400" />
        <span className="text-sm font-semibold text-violet-300">Intraa Community</span>
        {isAdmin && (
          <div className="relative ml-auto">
            <button onClick={() => setAdminOpen((p) => !p)}
              className="rounded-md p-1 text-violet-600 transition-colors hover:bg-violet-900/50 hover:text-violet-400">
              <Settings className="h-3.5 w-3.5" />
            </button>
            {adminOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-violet-800/60 bg-zinc-900 shadow-xl">
                <button onClick={() => { setPanelTab("feed"); setAdminOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs text-zinc-300 transition-colors hover:bg-violet-950/60 hover:text-white">
                  <Pen className="h-3.5 w-3.5" /> Opprett innlegg
                </button>
                <div className="flex w-full cursor-not-allowed items-center gap-2.5 px-4 py-2.5 text-xs text-zinc-600">
                  📌 Pin melding <span className="ml-auto text-[9px] text-zinc-700">Snart</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b border-violet-900/40 bg-violet-950/20">
        {PANEL_TABS.map((t) => (
          <button key={t.id} onClick={() => !t.soon && setPanelTab(t.id)}
            className={`relative flex-1 px-2 py-2 text-[11px] font-medium transition-colors ${
              t.soon
                ? "cursor-default text-zinc-600"
                : panelTab === t.id
                  ? "border-b-2 border-violet-500 bg-violet-600/20 text-white"
                  : "text-zinc-400 hover:text-white"
            }`}>
            {t.label}
            {t.soon && (
              <span className="ml-1 rounded-full bg-amber-900/50 px-1.5 py-0.5 text-[8px] font-semibold text-amber-500">Snart</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-violet-950/10">
        {panelTab === "feed"     && <FeedTab orgId={orgId} userId={userId} isAdmin={isAdmin} />}
        {panelTab === "chat"     && <StreamChat orgId={orgId} userId={userId} disabled={chatDisabled} />}
        {panelTab === "spill"    && <SpillTab orgId={orgId} orgSlug={orgSlug} logoUrl={logoUrl} />}
        {panelTab === "poll"     && <ComingSoon title="Avstemninger" desc="Start avstemninger som vises i sanntid under stream" />}
        {panelTab === "giveaway" && <ComingSoon title="Giveaway" desc="Trekk en tilfeldig vinner blant aktive seere" />}
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LiveClient({
  orgId, orgSlug, userId, orgName, logoUrl, twitchChannel, youtubeChannel, preferredPlatform, isAdmin,
}: Props) {
  const [status,      setStatus]      = useState<StreamStatus | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [wasLive,     setWasLive]     = useState(false);
  const [offlineAt,   setOfflineAt]   = useState<Date | null>(null);
  const [chatExpired, setChatExpired] = useState(false);
  const [chatMode,    setChatMode]    = useState<"twitch" | "intraa">(
    preferredPlatform === "twitch" && twitchChannel ? "twitch" : "intraa",
  );
  const [panelTab,   setPanelTab]   = useState<PanelTab>("feed");
  const [mobileTab,  setMobileTab]  = useState<MobileTab>("stream");
  const [adminOpen,  setAdminOpen]  = useState(false);
  const [intraaOpen, setIntraaOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("live_intraa_open") === "true";
  });
  const cleanupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggleIntraa() {
    setIntraaOpen((prev) => {
      const next = !prev;
      localStorage.setItem("live_intraa_open", String(next));
      return next;
    });
  }

  useEffect(() => {
    const check = async () => {
      try {
        const res  = await fetch(`/api/stream/status?orgId=${orgId}`);
        const data = await res.json() as StreamStatus;
        setStatus(data);

        if (data.isLive) {
          setWasLive(true);
          setOfflineAt(null);
          setChatExpired(false);
        } else if (wasLive && !data.isLive && !offlineAt) {
          // Just went offline
          const now = new Date();
          setOfflineAt(now);
          // Schedule cleanup after 60 min
          cleanupTimer.current = setTimeout(() => {
            fetch("/api/cron/cleanup-stream-chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ organizationId: orgId }),
            }).catch(() => null);
          }, CHAT_OPEN_MINUTES * 60 * 1000);
        }
      } catch { /* silent */ } finally { setLoading(false); }
    };
    void check();
    const interval = setInterval(check, 30_000);
    return () => {
      clearInterval(interval);
      if (cleanupTimer.current) clearTimeout(cleanupTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, wasLive, offlineAt]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  const hasChannel = preferredPlatform === "twitch" ? !!twitchChannel : !!youtubeChannel;

  // ── Offline (never went live / no settings) ───────────────────────────────

  if (!hasChannel || (!status?.isLive && !offlineAt)) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={orgName} className="h-full w-full rounded-2xl object-cover" />
          ) : (
            <span className="text-2xl font-bold text-white">{initials(orgName)}</span>
          )}
        </div>
        <div className="mb-3 flex items-center justify-center gap-2">
          <WifiOff className="h-5 w-5 text-zinc-600" />
          <span className="text-sm font-medium text-zinc-500">Offline</span>
        </div>
        <h1 className="mb-2 text-xl font-bold text-white">{orgName}</h1>
        <p className="text-sm text-zinc-500">
          {!hasChannel ? "Stream-innstillinger er ikke konfigurert ennå." : `${orgName} streamer ikke akkurat nå.`}
        </p>
        {hasChannel && <p className="mt-6 text-xs text-zinc-600">Siden oppdateres automatisk når streamen starter.</p>}
      </div>
    );
  }

  // ── Post-stream offline mode ──────────────────────────────────────────────

  if (offlineAt && !status?.isLive) {
    return (
      <div className="mx-auto flex h-[calc(100vh-56px)] max-w-3xl flex-col px-4 py-6">
        {/* Offline banner */}
        <div className="mb-5 shrink-0 rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-center">
          <div className="mb-2 text-4xl">📺</div>
          <h2 className="text-xl font-bold text-white">{orgName} er ferdig for i dag</h2>
          <p className="mt-1 text-sm text-zinc-400">Takk for at du var med! Chatten er åpen en stund til.</p>
          <div className="mt-3 text-sm text-zinc-500">
            {chatExpired ? (
              <span className="text-rose-400">Chatten er nå lukket</span>
            ) : (
              <CountdownTimer
                endedAt={offlineAt}
                minutes={CHAT_OPEN_MINUTES}
                onExpire={() => setChatExpired(true)}
              />
            )}
          </div>
        </div>

        {/* Full-width Intraa chat + feed */}
        <div className="flex min-h-0 flex-1 gap-4">
          {/* Chat */}
          <div className="flex flex-col rounded-xl border border-violet-900/50 bg-violet-950/20" style={{ flex: "0 0 55%" }}>
            <div className="flex shrink-0 items-center gap-2 border-b border-violet-900/40 bg-violet-950/50 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-violet-400" />
              <span className="text-sm font-semibold text-violet-300">Intraa Chat</span>
            </div>
            <StreamChat orgId={orgId} userId={userId} disabled={chatExpired} />
          </div>

          {/* Feed */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900" style={{ flex: "0 0 45%" }}>
            <div className="shrink-0 border-b border-zinc-800 px-3 py-2">
              <span className="text-sm font-semibold text-zinc-300">Feed</span>
            </div>
            <FeedTab orgId={orgId} userId={userId} isAdmin={isAdmin} />
          </div>
        </div>
      </div>
    );
  }

  // ── Live ──────────────────────────────────────────────────────────────────

  const twitchEmbedSrc  = twitchChannel ? `https://player.twitch.tv/?channel=${twitchChannel}&parent=${domain}&autoplay=true` : null;
  const youtubeEmbedSrc = youtubeChannel ? `https://www.youtube.com/embed/live_stream?channel=${youtubeChannel}&autoplay=1` : null;
  const twitchChatSrc   = twitchChannel ? `https://www.twitch.tv/embed/${twitchChannel}/chat?parent=${domain}&darkpopout` : null;
  const embedSrc        = preferredPlatform === "youtube" ? youtubeEmbedSrc : twitchEmbedSrc;

  const MOBILE_TABS: { id: MobileTab; label: string }[] = [
    { id: "stream",      label: "Stream" },
    { id: "twitch-chat", label: "Chat" },
    { id: "feed",        label: "Feed" },
    { id: "chat",        label: "Intraa" },
  ];

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">

      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2.5">
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Live nå</span>
        </span>
        <span className="max-w-xs truncate text-sm font-semibold text-white">{status?.title}</span>
        {(status?.viewerCount ?? 0) > 0 && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-500">
            <Users className="h-3.5 w-3.5" />
            {status!.viewerCount.toLocaleString("no-NO")} seere
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={toggleIntraa}
            className={`hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors md:flex ${
              intraaOpen ? "bg-zinc-700 text-white hover:bg-zinc-600" : "bg-violet-600 text-white hover:bg-violet-500"
            }`}>
            {intraaOpen ? <X className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {intraaOpen ? "Lukk Intraa" : "Åpne Intraa"}
          </button>
          {twitchChannel && (
            <a href={`https://twitch.tv/${twitchChannel}`} target="_blank" rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white">
              <ExternalLink className="h-3 w-3" /> Twitch
            </a>
          )}
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="flex shrink-0 border-b border-zinc-800 md:hidden">
        {MOBILE_TABS.map((t) => (
          <button key={t.id} onClick={() => setMobileTab(t.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              mobileTab === t.id ? "border-b-2 border-indigo-500 text-white" : "text-zinc-500"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Desktop 3-column */}
      <div className="hidden min-h-0 flex-1 md:flex">
        {/* Stream */}
        <div className="flex flex-col bg-black" style={{ flex: intraaOpen ? "0 0 55%" : "0 0 70%" }}>
          {embedSrc
            ? <iframe src={embedSrc} className="h-full w-full" allowFullScreen allow="autoplay; fullscreen" title="Stream" />
            : <div className="flex flex-1 items-center justify-center text-zinc-600"><Wifi className="h-8 w-8" /></div>
          }
        </div>

        {/* Twitch chat */}
        <div className="flex flex-col border-l border-zinc-800 bg-zinc-900" style={{ flex: intraaOpen ? "0 0 22%" : "0 0 30%" }}>
          {twitchChatSrc && (
            <div className="flex shrink-0 border-b border-zinc-800">
              {(["twitch", "intraa"] as const).map((mode) => (
                <button key={mode} onClick={() => setChatMode(mode)}
                  className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
                    chatMode === mode ? "border-b-2 border-indigo-500 text-white" : "text-zinc-500 hover:text-white"
                  }`}>
                  {mode === "twitch" ? "Twitch-chat" : "Intraa-chat"}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {chatMode === "twitch" && twitchChatSrc
              ? <iframe src={twitchChatSrc} className="h-full w-full" title="Twitch Chat" />
              : <div className="flex h-full items-center justify-center p-4 text-center"><p className="text-xs text-zinc-600">Intraa-chat-integrasjon kommer snart.</p></div>
            }
          </div>
        </div>

        {/* Intraa panel */}
        {intraaOpen && (
          <div className="flex flex-col border-l border-violet-900/60 bg-zinc-900" style={{ flex: "0 0 23%" }}>
            <IntraaPanel
              orgId={orgId} orgSlug={orgSlug} logoUrl={logoUrl} userId={userId} isAdmin={isAdmin}
              panelTab={panelTab} setPanelTab={setPanelTab}
              adminOpen={adminOpen} setAdminOpen={setAdminOpen}
              chatDisabled={false}
            />
          </div>
        )}
      </div>

      {/* Mobile content */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        {mobileTab === "stream" && (
          <div className="flex-1 bg-black">
            {embedSrc
              ? <iframe src={embedSrc} className="h-full w-full" allowFullScreen allow="autoplay; fullscreen" title="Stream" />
              : <div className="flex h-full items-center justify-center text-zinc-600"><Wifi className="h-8 w-8" /></div>
            }
          </div>
        )}
        {mobileTab === "twitch-chat" && (
          <div className="flex flex-1 flex-col">
            {twitchChatSrc && (
              <div className="flex shrink-0 border-b border-zinc-800">
                {(["twitch", "intraa"] as const).map((mode) => (
                  <button key={mode} onClick={() => setChatMode(mode)}
                    className={`flex-1 py-2 text-xs font-medium ${chatMode === mode ? "border-b-2 border-indigo-500 text-white" : "text-zinc-500"}`}>
                    {mode === "twitch" ? "Twitch-chat" : "Intraa-chat"}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              {chatMode === "twitch" && twitchChatSrc
                ? <iframe src={twitchChatSrc} className="h-full w-full" title="Twitch Chat" />
                : <div className="flex h-full items-center justify-center p-4"><p className="text-xs text-zinc-600">Intraa-chat kommer snart.</p></div>
              }
            </div>
          </div>
        )}
        {mobileTab === "feed" && (
          <div className="flex flex-1 flex-col overflow-hidden bg-violet-950/10">
            <div className="flex shrink-0 items-center gap-2 border-b border-violet-800/40 bg-violet-950/50 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-violet-400" />
              <span className="text-xs font-semibold text-violet-300">Intraa Community</span>
            </div>
            <FeedTab orgId={orgId} userId={userId} isAdmin={isAdmin} />
          </div>
        )}
        {mobileTab === "chat" && (
          <div className="flex flex-1 flex-col overflow-hidden bg-violet-950/10">
            <div className="flex shrink-0 items-center gap-2 border-b border-violet-800/40 bg-violet-950/50 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-violet-400" />
              <span className="text-xs font-semibold text-violet-300">Intraa Chat</span>
            </div>
            <StreamChat orgId={orgId} userId={userId} disabled={false} />
          </div>
        )}
      </div>
    </div>
  );
}
