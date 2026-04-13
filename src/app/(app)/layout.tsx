"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Rss, Ticket, Folder, Settings,
  Search, CalendarDays, CheckSquare, HelpCircle, Menu, X,
  Trophy, Swords, Star, Radio, Coins,
  LifeBuoy, MessageCircle,
  Home, Mail, UserCircle,
} from "lucide-react";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
import SearchOverlay from "@/components/SearchOverlay";
import BottomBar from "@/components/BottomBar";
import MobileDrawer from "@/components/MobileDrawer";
import { useOrg } from "@/lib/context/OrgContext";
import { useUser } from "@/lib/hooks/useUser";

// ─── Nav definitions ──────────────────────────────────────────────────────────

const COMPANY_NAV = [
  { href: "/feed",     label: "Feed",     icon: Rss,           feature: "feed" },
  { href: "/chat",     label: "Chat",     icon: MessageCircle, feature: "chat" },
  { href: "/tickets",  label: "Tickets",  icon: Ticket,        feature: "tickets" },
  { href: "/kalender", label: "Kalender", icon: CalendarDays,  feature: "calendar" },
  { href: "/oppgaver", label: "Oppgaver", icon: CheckSquare,   feature: "tasks" },
  { href: "/filer",    label: "Filer",    icon: Folder,        feature: "files" },
];

function communityNav(slug: string) {
  return [
    { href: `/${slug}/feed`,         label: "Feed",         icon: Rss,            feature: "community_feed" },
    { href: `/chat`,                 label: "Chat",         icon: MessageCircle,  feature: "community_chat" },
    { href: `/${slug}/rangering`,    label: "Rangering",    icon: Trophy,         feature: "community_leaderboard" },
    { href: `/${slug}/konkurranser`, label: "Konkurranser", icon: Swords,         feature: "community_contests" },
    { href: `/${slug}/lojalitet`,    label: "Lojalitet",    icon: Star,           feature: "community_loyalty" },
  ];
}


const PAGE_TITLES: Record<string, string> = {
  "/home":               "Hjem",
  "/meldinger":          "Meldinger",
  "/profil/meg":         "Min profil",
  "/feed":               "Feed",
  "/chat":               "Chat",
  "/tickets":            "Tickets",
  "/filer":              "Filer",
  "/medlemmer":          "Medlemmer",
  "/kalender":           "Kalender",
  "/oppgaver":           "Oppgaver",
  "/admin":              "Admin — Oversikt",
  "/admin/brukere":      "Admin — Brukere",
  "/admin/innstillinger":"Admin — Innstillinger",
  "/profil":             "Profil",
  "/notifikasjoner":     "Notifikasjoner",
  "/soek":               "Søk",
  "/innstillinger":      "Innstillinger",
  "/hjelp":              "Hjelp & Support",
  "/support":            "Mine support-saker",
  "/bytt-org":           "Bytt organisasjon",
  "/community/rangering":    "Rangering",
  "/community/konkurranser": "Konkurranser",
  "/community/lojalitet":    "Lojalitet",
  "/community/chat":         "Chat",
  "/community/abonnement":   "Abonnement",
  "/community/admin":        "Admin",
};

// ─── Support Modal ────────────────────────────────────────────────────────────

const SUPPORT_CATEGORIES = ["Teknisk problem", "Faktura", "Funksjonalitet", "Annet"];

function SupportModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle]   = useState("");
  const [desc, setDesc]     = useState("");
  const [cat, setCat]       = useState(SUPPORT_CATEGORIES[0]);
  const [error, setError]   = useState("");
  const [ok, setOk]         = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!title.trim() || !desc.trim()) { setError("Fyll ut alle felt"); return; }
    setPending(true);
    setError("");
    const res = await fetch("/api/support/ticket", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ title, description: desc, category: cat }),
    });
    if (res.ok) { setOk(true); }
    else {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Noe gikk galt");
    }
    setPending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Kontakt Intraa support</h2>
          <button onClick={onClose} className="text-zinc-400 transition-colors hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        {ok ? (
          <div className="px-5 py-8 text-center">
            <p className="text-2xl">✅</p>
            <p className="mt-2 text-sm font-medium text-white">Henvendelsen er sendt!</p>
            <p className="mt-1 text-xs text-zinc-500">Vi svarer vanligvis innen 1–2 arbeidsdager.</p>
            <button onClick={onClose} className="mt-5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-80">Lukk</button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 px-5 py-5">
              {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Tittel</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Hva gjelder henvendelsen?"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Beskrivelse</label>
                <textarea
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Beskriv problemet eller spørsmålet ditt…"
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Kategori</label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                >
                  {SUPPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
              <button onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white">Avbryt</button>
              <button onClick={submit} disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40">
                {pending ? "Sender…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantTheme {
  logoUrl: string | null;
}

interface LiveStatus {
  isLive:      boolean;
  title:       string;
  viewerCount: number;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function SidebarContent({
  pathname, org, orgLoaded, onNavClick, isSuperAdmin, userName, enabledFeatures, tenantTheme, liveStatus, mobile, collapsed, onToggleCollapse, onOpenSupport, unreadCount, mounted,
}: {
  pathname:          string;
  org:               ReturnType<typeof useOrg>["org"] | null;
  orgLoaded:         boolean;
  onNavClick:        () => void;
  isSuperAdmin:      boolean;
  userName:          string;
  enabledFeatures:   string[] | null;
  tenantTheme:       TenantTheme | null;
  liveStatus:        LiveStatus | null;
  mobile?:           boolean;
  collapsed?:        boolean;
  onToggleCollapse?: () => void;
  onOpenSupport:     () => void;
  unreadCount:       number;
  mounted:           boolean;
}) {
  const isCommunity  = org?.type === "COMMUNITY";
  const allLinks     = isCommunity && org?.slug ? communityNav(org.slug) : COMPANY_NAV;
  const navLinks     = enabledFeatures === null
    ? allLinks
    : allLinks.filter((l) => enabledFeatures.includes(l.feature));
  const accentActive  = isCommunity ? "bg-violet-600" : "bg-indigo-600";
  const liveEnabled   = enabledFeatures === null || enabledFeatures.includes("live");
  const liveIsOnline  = liveStatus?.isLive;
  const liveActive    = pathname.endsWith("/live");

  const orgSwitcher = (
    <div className="flex h-14 shrink-0 items-center border-b border-zinc-800 px-4">
      {!mobile && onToggleCollapse ? (
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
        >
          {collapsed ? (
            <Menu className="h-5 w-5 shrink-0" />
          ) : (
            <>
              <X className="h-5 w-5 shrink-0" />
              <span className="text-sm">Skjul meny</span>
            </>
          )}
        </button>
      ) : (
        <Menu className="h-5 w-5 text-zinc-400" />
      )}
    </div>
  );

  const bottomSection = (
    <div className="shrink-0 border-t border-zinc-800 px-3 py-3">
      <Link href="/hjelp" onClick={onNavClick}
        title={collapsed ? "Hjelp" : undefined}
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${collapsed ? "justify-center" : ""} ${
          pathname === "/hjelp" ? `${accentActive} text-white` : "text-zinc-500 hover:bg-zinc-800 hover:text-white"
        }`}
      >
        <HelpCircle className="h-4 w-4 shrink-0" />
        {!collapsed && "Hjelp"}
      </Link>
      <Link href="/support" onClick={onNavClick}
        title={collapsed ? "Support-saker" : undefined}
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${collapsed ? "justify-center" : ""} ${
          pathname.startsWith("/support") ? `${accentActive} text-white` : "text-zinc-500 hover:bg-zinc-800 hover:text-white"
        }`}
      >
        <LifeBuoy className="h-4 w-4 shrink-0" />
        {!collapsed && "Support-saker"}
      </Link>
      <button
        onClick={() => { onNavClick(); onOpenSupport(); }}
        title={collapsed ? "Kontakt support" : undefined}
        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${collapsed ? "justify-center" : ""} text-zinc-500 hover:bg-zinc-800 hover:text-white`}
      >
        <MessageCircle className="h-4 w-4 shrink-0" />
        {!collapsed && "Kontakt support"}
      </button>
      {mounted && orgLoaded && (org?.userRole === "OWNER" || org?.userRole === "ADMIN") && (
        <Link href="/admin" onClick={onNavClick}
          title={collapsed ? "Admin" : undefined}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${collapsed ? "justify-center" : ""} text-zinc-500 hover:bg-zinc-800 hover:text-white`}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && "Admin"}
        </Link>
      )}
      <div className={`mt-3 flex items-center gap-2 rounded-md px-3 py-2 ${collapsed ? "justify-center" : ""}`}
        title={collapsed ? userName : undefined}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-white">
          {userName ? userName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() : "?"}
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-xs text-zinc-500">{userName}</span>
            {isSuperAdmin && (
              <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-400">
                SA
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Global links always visible regardless of org
  const GLOBAL_NAV = [
    { href: "/home",        label: "Hjem",       icon: Home,       badge: 0 },
    { href: "/meldinger",   label: "Meldinger",  icon: Mail,       badge: unreadCount },
    { href: "/profil/meg",  label: "Min profil", icon: UserCircle, badge: 0 },
  ];

  // Org-specific links are hidden on "global" pages regardless of whether org is set
  const GLOBAL_PREFIXES = [
    "/home", "/meldinger", "/profil", "/u/", "/soek", "/innstillinger",
    "/hjelp", "/support", "/bytt-org", "/notifikasjoner", "/superadmin",
  ];
  const isOnGlobalPage = GLOBAL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || (p.endsWith("/") && pathname.startsWith(p))
  );
  const showOrgLinks = !isOnGlobalPage && mounted && orgLoaded && !!org;

  return (
    <>
      {orgSwitcher}

      {/* Scrollable nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
        {/* Global links */}
        {GLOBAL_NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} onClick={onNavClick}
              title={collapsed ? label : undefined}
              className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${collapsed ? "justify-center" : ""} ${
                active ? `${accentActive} text-white` : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  {badge > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && badge > 0 && (
                <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white" />
              )}
            </Link>
          );
        })}

        {/* Org-specific section — hidden on global pages (home, meldinger, profil…) */}
        {showOrgLinks && (
          <>
            <div className="my-1 border-t border-zinc-800" />

            {/* Live link */}
            {liveEnabled && (
              <Link href={`/${org.slug}/live`} onClick={onNavClick}
                title={collapsed ? "Live" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${collapsed ? "justify-center" : ""} ${
                  liveActive
                    ? "bg-rose-500/20 text-rose-300"
                    : liveIsOnline
                      ? "text-rose-400 hover:bg-rose-500/10"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Radio className="h-3.5 w-3.5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">Live</span>
                    {liveIsOnline && (
                      <span className="ml-auto rounded bg-red-950/50 px-1.5 py-0.5 text-[10px] font-bold text-red-400">LIVE</span>
                    )}
                  </>
                )}
              </Link>
            )}

            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link key={href} href={href} onClick={onNavClick}
                  title={collapsed ? label : undefined}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${collapsed ? "justify-center" : ""} ${
                    active ? `${accentActive} text-white` : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="flex-1">{label}</span>}
                </Link>
              );
            })}
          </>
        )}

        {/* Spill — bare for community på org-sider */}
        {showOrgLinks && isCommunity && org?.slug && (
          <Link href={`/${org.slug}/clicker`} onClick={onNavClick}
            title={collapsed ? "Spill" : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${collapsed ? "justify-center" : ""} ${
              pathname.endsWith("/clicker")
                ? `${accentActive} text-white`
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <Coins className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1">🎮 Spill</span>}
          </Link>
        )}
      </nav>

      {bottomSection}
    </>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

// Paths accessible without any org membership
const NO_ORG_PATHS = [
  "/home", "/hjelp", "/support", "/innstillinger", "/notifikasjoner",
  "/meldinger", "/bytt-org", "/profil", "/soek",
];

// ─── Superadmin impersonate banner ────────────────────────────────────────────

function SuperAdminBanner() {
  const params = useSearchParams();
  if (params.get("sa") !== "1") return null;
  return (
    <div
      className="sticky top-0 z-40 flex items-center justify-between px-4 py-2"
      style={{ background: "#6c47ff", borderBottom: "1px solid rgba(255,255,255,0.15)" }}
    >
      <span className="text-xs font-semibold text-white">Superadmin-modus — du ser denne siden som bruker</span>
      <Link
        href="/superadmin/tenants"
        className="flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-white/25"
      >
        ← Tilbake til superadmin
      </Link>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const router       = useRouter();
  const inAdmin      = pathname.startsWith("/admin");
  const [searchOpen,        setSearchOpen]        = useState(false);
  const [sidebarOpen,       setSidebarOpen]        = useState(false);
  const [drawerOpen,        setDrawerOpen]         = useState(false);
  const [desktopCollapsed,  setDesktopCollapsed]   = useState(false);
  const [mounted,           setMounted]             = useState(false);
  const [supportOpen,       setSupportOpen]        = useState(false);
  const [enabledFeatures,   setEnabledFeatures]    = useState<string[] | null>(null);
  const [tenantTheme,       setTenantTheme]         = useState<TenantTheme | null>(null);
  const [liveStatus,        setLiveStatus]          = useState<LiveStatus | null>(null);
  const [unreadCount,       setUnreadCount]         = useState(0);
  const { org, orgLoaded } = useOrg();
  const { user }           = useUser();

  // Redirect to /home when user has no org and tries to access an org-specific page
  useEffect(() => {
    if (!mounted || !orgLoaded || org !== null) return;
    const isNoOrgPath =
      NO_ORG_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
      pathname.startsWith("/u/");
    if (!isNoOrgPath) {
      router.replace("/home");
    }
  }, [mounted, orgLoaded, org, pathname, router]);

  useEffect(() => {
    setEnabledFeatures(null); // clear stale features immediately on org change
    void Promise.all([
      fetch("/api/org/features").then((r) => r.ok ? r.json() as Promise<{ features: string[] }> : Promise.reject()),
      fetch("/api/tenant/theme").then((r) => r.ok ? r.json() as Promise<{ theme: TenantTheme | null }> : Promise.reject()),
    ]).then(([featData, themeData]) => {
      setEnabledFeatures(featData.features);
      if (themeData.theme) setTenantTheme(themeData.theme);
    }).catch(() => setEnabledFeatures(null));
  }, [org?.id]);

  // Poll live status every 60s
  useEffect(() => {
    if (!org?.id) return;
    const check = () => {
      fetch(`/api/stream/status?orgId=${org.id}`)
        .then((r) => r.ok ? r.json() as Promise<LiveStatus> : Promise.reject())
        .then((data) => setLiveStatus(data.isLive ? data : null))
        .catch(() => null);
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [org?.id]);

  // Poll unread count every 30s, paused when tab is hidden
  useEffect(() => {
    const INTERVAL = 30_000;
    let id: ReturnType<typeof setInterval>;
    const check = () => {
      fetch("/api/user/unread")
        .then((r) => r.ok ? r.json() as Promise<{ total: number }> : Promise.reject())
        .then((d) => setUnreadCount(d.total))
        .catch(() => null);
    };
    check();
    id = setInterval(check, INTERVAL);
    const onVisibility = () => {
      if (document.hidden) clearInterval(id);
      else { check(); id = setInterval(check, INTERVAL); }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  // Persist desktop sidebar collapsed state — read after mount to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") setDesktopCollapsed(true);
  }, []);
  const toggleDesktopCollapsed = useCallback(() => {
    setDesktopCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  }, []);

  useEffect(() => { setSidebarOpen(false); setDrawerOpen(false); }, [pathname]);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); openSearch(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openSearch]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  // Derive title — for /[orgSlug]/[feature] routes, use the segment after the slug
  const SLUG_SEGMENT_TITLES: Record<string, string> = {
    feed: "Feed", rangering: "Rangering", konkurranser: "Konkurranser",
    lojalitet: "Lojalitet", chat: "Chat", live: "Live",
    clicker: "Spill", admin: "Admin", medals: "Rangering",
  };
  function resolveTitle(path: string): string {
    if (PAGE_TITLES[path]) return PAGE_TITLES[path];
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const seg = parts[parts.length - 1];
      return SLUG_SEGMENT_TITLES[seg] ?? "Intraa";
    }
    return "Intraa";
  }
  const title = resolveTitle(pathname);

  // Use mounted to avoid SSR/client mismatch on collapsed state (localStorage unavailable on server)
  const effectiveCollapsed = mounted && desktopCollapsed;
  const sidebarW = inAdmin ? "w-0 overflow-hidden" : effectiveCollapsed ? "w-14" : "w-48";
  const mainPl   = inAdmin ? ""                    : effectiveCollapsed ? "md:pl-14" : "md:pl-48";

  const sidebarProps = {
    pathname, org, orgLoaded,
    onNavClick:      () => setSidebarOpen(false),
    isSuperAdmin:    user?.isSuperAdmin ?? false,
    userName:        user?.name ?? "",
    enabledFeatures,
    tenantTheme,
    liveStatus,
    unreadCount,
    mounted,
    collapsed:        effectiveCollapsed,
    onToggleCollapse: toggleDesktopCollapsed,
    onOpenSupport:    () => setSupportOpen(true),
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Desktop sidebar — hidden when in admin (admin has its own) */}
      <aside className={`fixed left-0 top-0 z-30 hidden h-screen flex-col border-r border-zinc-800 bg-zinc-900 transition-all duration-200 ease-in-out md:flex ${sidebarW}`}>
        {!inAdmin && <SidebarContent {...sidebarProps} />}
      </aside>

      {/* Mobile sidebar drawer — hidden when in admin */}
      {sidebarOpen && !inAdmin && (
        <>
          <div className="sidebar-backdrop md:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-zinc-800 bg-zinc-900 md:hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
              <span className="text-sm font-semibold text-white">Meny</span>
              <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent {...sidebarProps} mobile collapsed={false} />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className={`flex min-h-screen min-w-0 flex-col transition-all duration-200 ease-in-out ${mainPl}`}>
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 pt-[env(safe-area-inset-top)] min-h-14">
          {/* Left: title */}
          <div className="flex shrink-0 items-center md:w-36">
            <span className="truncate text-sm font-semibold text-white">{title}</span>
          </div>

          {/* Center: search bar — hidden on mobile */}
          <div className="hidden flex-1 justify-center md:flex">
            <button
              onClick={openSearch}
              className="flex w-full max-w-md items-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2 text-sm text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Søk etter personer, communities...</span>
              <kbd className="hidden rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-600 sm:inline">⌘K</kbd>
            </button>
          </div>

          {/* Right: actions */}
          <div className="ml-auto flex shrink-0 items-center gap-2 md:w-36 md:justify-end">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {user?.isSuperAdmin && (
            <Suspense>
              <SuperAdminBanner />
            </Suspense>
          )}
          {children}
        </main>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      {supportOpen && <SupportModal onClose={() => setSupportOpen(false)} />}

      {/* Mobile bottom bar — hidden in admin */}
      {!inAdmin && (
        <>
          <BottomBar
            pathname={pathname}
            unreadCount={unreadCount}
            isCommunity={org?.type === "COMMUNITY"}
            onSearch={openSearch}
            onMenu={() => setDrawerOpen(true)}
          />
          <MobileDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            pathname={pathname}
            org={org ? { slug: org.slug, type: org.type, userRole: org.userRole } : null}
            enabledFeatures={enabledFeatures}
            liveStatus={liveStatus}
            isSuperAdmin={user?.isSuperAdmin ?? false}
            onOpenSupport={() => setSupportOpen(true)}
          />
        </>
      )}
    </div>
  );
}
