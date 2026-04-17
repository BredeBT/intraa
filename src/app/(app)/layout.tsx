"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Newspaper, Ticket, Folder, Settings,
  Search, CalendarDays, CheckSquare, Menu, X,
  Trophy, Swords, Star, Radio, Gamepad2,
  LifeBuoy, MessageCircle,
  Home, Mail, UserCircle,
} from "lucide-react";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
import SearchOverlay from "@/components/SearchOverlay";
import BottomBar from "@/components/BottomBar";
import MobileDrawer from "@/components/MobileDrawer";
import { useOrg, type Org } from "@/lib/context/OrgContext";
import { useUser } from "@/lib/hooks/useUser";
import { WebRTCProvider } from "@/context/WebRTCContext";
import { IncomingCallBanner } from "@/components/IncomingCallBanner";
import { GlobalCallBar } from "@/components/GlobalCallBar";

// ─── Nav definitions ──────────────────────────────────────────────────────────

const COMPANY_NAV = [
  { href: "/feed",     label: "Feed",     icon: Newspaper,           feature: "feed" },
  { href: "/chat",     label: "Chat",     icon: MessageCircle, feature: "chat" },
  { href: "/tickets",  label: "Tickets",  icon: Ticket,        feature: "tickets" },
  { href: "/kalender", label: "Kalender", icon: CalendarDays,  feature: "calendar" },
  { href: "/oppgaver", label: "Oppgaver", icon: CheckSquare,   feature: "tasks" },
  { href: "/filer",    label: "Filer",    icon: Folder,        feature: "files" },
];

function communityNav(slug: string) {
  return [
    { href: `/${slug}/feed`,         label: "Feed",         icon: Newspaper,            feature: "community_feed" },
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
  "/support":            "Support",
  "/bytt-org":           "Bytt organisasjon",
  "/community/rangering":    "Rangering",
  "/community/konkurranser": "Konkurranser",
  "/community/lojalitet":    "Lojalitet",
  "/community/chat":         "Chat",
  "/community/abonnement":   "Abonnement",
  "/community/admin":        "Admin",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantTheme {
  logoUrl: string | null;
}

interface OrgSummary {
  id:          string;
  slug:        string;
  name:        string;
  initials:    string;
  type:        string;
  plan:        string;
  accentColor: string;
  userRole:    string;
}

interface LiveStatus {
  isLive:      boolean;
  title:       string;
  viewerCount: number;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function SidebarContent({
  pathname, org, orgLoaded, onNavClick, isSuperAdmin, userName, enabledFeatures, tenantTheme, liveStatus, mobile, collapsed, onToggleCollapse, unreadCount, mounted, allCommunities, onSwitchOrg,
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
  unreadCount:       number;
  mounted:           boolean;
  allCommunities:    OrgSummary[];
  onSwitchOrg:       (c: OrgSummary) => void;
}) {
  const isCommunity = org?.type === "COMMUNITY";
  const allLinks    = isCommunity && org?.slug ? communityNav(org.slug) : COMPANY_NAV;
  const navLinks    = enabledFeatures === null
    ? allLinks
    : allLinks.filter((l) => enabledFeatures.includes(l.feature));

  const accentActiveBg   = isCommunity ? "bg-violet-500/15" : "bg-indigo-500/15";
  const accentActiveText = isCommunity ? "text-violet-200"  : "text-indigo-200";
  const accentActive     = `${accentActiveBg} ${accentActiveText}`;

  const liveEnabled  = enabledFeatures === null || enabledFeatures.includes("live");
  const liveIsOnline = liveStatus?.isLive;
  const liveActive   = pathname.endsWith("/live");

  const initials = userName
    ? userName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const item = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
      active
        ? accentActive
        : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
    }`;

  // ── Header ───────────────────────────────────────────────────────────
  const orgSwitcher = (
    <div className="flex h-14 shrink-0 items-center border-b border-zinc-800/60 px-4">
      {!mobile && onToggleCollapse ? (
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2.5 text-zinc-500 transition-colors hover:text-zinc-200"
        >
          {collapsed ? (
            <Menu className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <>
              <X className="h-[18px] w-[18px] shrink-0" />
              <span className="text-sm font-medium">Skjul meny</span>
            </>
          )}
        </button>
      ) : (
        <Menu className="h-[18px] w-[18px] text-zinc-500" />
      )}
    </div>
  );

  // ── Bottom section ────────────────────────────────────────────────────
  const bottomSection = (
    <div className="shrink-0 border-t border-zinc-800/60 px-2 py-3 space-y-0.5">
      <Link href="/support" onClick={onNavClick}
        title={collapsed ? "Support" : undefined}
        className={`${item(pathname.startsWith("/support"))} ${collapsed ? "justify-center" : ""}`}
      >
        <LifeBuoy className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1">Support</span>}
      </Link>

      {mounted && orgLoaded && (org?.userRole === "OWNER" || org?.userRole === "ADMIN") && (
        <Link href="/admin" onClick={onNavClick}
          title={collapsed ? "Admin" : undefined}
          className={`${item(pathname.startsWith("/admin"))} ${collapsed ? "justify-center" : ""}`}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="flex-1">Admin</span>}
        </Link>
      )}

      {/* User card */}
      <div className="pt-1">
        {!collapsed ? (
          <div
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.04)" }}
            title={userName}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #6c47ff 0%, #a78bfa 100%)" }}
            >
              {initials}
            </div>
            <span className="flex-1 truncate text-xs font-medium text-zinc-300">{userName}</span>
            {isSuperAdmin && (
              <span className="rounded-md bg-violet-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-300">
                SA
              </span>
            )}
          </div>
        ) : (
          <div
            className="mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #6c47ff 0%, #a78bfa 100%)" }}
            title={userName}
          >
            {initials}
          </div>
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

  const showOrgLinks = mounted && orgLoaded && !!org;

  return (
    <>
      {orgSwitcher}

      {/* Scrollable nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3 scrollbar-hide">
        {/* Global links */}
        {GLOBAL_NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} onClick={onNavClick}
              title={collapsed ? label : undefined}
              className={`relative ${item(active)} ${collapsed ? "justify-center" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  {badge > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && badge > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
              )}
            </Link>
          );
        })}

        {/* Org-specific section */}
        {showOrgLinks && (
          <>
            {/* Section label — shows org name */}
            {!collapsed ? (
              <div className="mx-1 mb-1 mt-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="max-w-[96px] truncate text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
                  {org.name}
                </span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
            ) : (
              <div className="my-2 border-t border-zinc-800" />
            )}

            {/* Community quick-switcher — shown when user belongs to multiple communities */}
            {!collapsed && isCommunity && allCommunities.length > 1 && (
              <div className="mb-1 flex flex-col gap-0.5">
                {allCommunities.map((c) => {
                  const isActive = org.id === c.id;
                  return (
                    <Link
                      key={c.id}
                      href={`/${c.slug}/feed`}
                      onClick={() => { onSwitchOrg(c); onNavClick(); }}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-violet-500/15 text-violet-200"
                          : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100"
                      }`}
                    >
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
                        style={{ background: c.accentColor }}
                      >
                        {c.initials}
                      </div>
                      <span className="flex-1 truncate">{c.name}</span>
                      {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />}
                    </Link>
                  );
                })}
                <div className="mx-1 my-1 h-px bg-zinc-800" />
              </div>
            )}

            {/* Collapsed: small community dots for switching */}
            {collapsed && isCommunity && allCommunities.length > 1 && (
              <div className="mb-1 flex flex-col items-center gap-1">
                {allCommunities.map((c) => {
                  const isActive = org.id === c.id;
                  return (
                    <Link
                      key={c.id}
                      href={`/${c.slug}/feed`}
                      onClick={() => { onSwitchOrg(c); onNavClick(); }}
                      title={c.name}
                      className={`flex h-7 w-7 items-center justify-center rounded text-[9px] font-bold text-white transition-all duration-150 ${
                        isActive ? "ring-2 ring-violet-400" : "opacity-60 hover:opacity-100"
                      }`}
                      style={{ background: c.accentColor }}
                    >
                      {c.initials}
                    </Link>
                  );
                })}
                <div className="my-1 w-4 border-t border-zinc-800" />
              </div>
            )}

            {/* Live link */}
            {liveEnabled && (
              <Link href={`/${org.slug}/live`} onClick={onNavClick}
                title={collapsed ? "Live" : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${collapsed ? "justify-center" : ""} ${
                  liveActive
                    ? "bg-rose-500/15 text-rose-200"
                    : liveIsOnline
                      ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                      : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
                }`}
              >
                <Radio className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">Live</span>
                    {liveIsOnline && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                      </span>
                    )}
                  </>
                )}
                {collapsed && liveIsOnline && (
                  <span className="absolute right-1.5 top-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                  </span>
                )}
              </Link>
            )}

            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link key={href} href={href} onClick={onNavClick}
                  title={collapsed ? label : undefined}
                  className={`${item(active)} ${collapsed ? "justify-center" : ""}`}
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
          <Link href={`/${org.slug}/spill`} onClick={onNavClick}
            title={collapsed ? "Spill" : undefined}
            className={`${item(pathname.includes("/spill") || pathname.endsWith("/clicker"))} ${collapsed ? "justify-center" : ""}`}
          >
            <Gamepad2 className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1">Spill</span>}
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
  "/home", "/support", "/innstillinger", "/notifikasjoner",
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
  const [enabledFeatures,   setEnabledFeatures]    = useState<string[] | null>(null);
  const [tenantTheme,       setTenantTheme]         = useState<TenantTheme | null>(null);
  const [liveStatus,        setLiveStatus]          = useState<LiveStatus | null>(null);
  const [unreadCount,       setUnreadCount]         = useState(0);
  const [allCommunities,    setAllCommunities]       = useState<OrgSummary[]>([]);
  const { org, orgLoaded, setOrg } = useOrg();
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
    fetch("/api/layout/bootstrap")
      .then((r) => r.ok ? r.json() as Promise<{ features: string[]; theme: TenantTheme | null }> : Promise.reject())
      .then((data) => {
        setEnabledFeatures(data.features);
        if (data.theme) setTenantTheme(data.theme);
      })
      .catch(() => setEnabledFeatures(null));
  }, [org?.id]);

  // Fetch all communities once on mount for quick-switcher
  useEffect(() => {
    fetch("/api/user/orgs")
      .then((r) => r.ok ? r.json() as Promise<OrgSummary[]> : Promise.reject())
      .then((data) => setAllCommunities(data.filter((o) => o.type === "COMMUNITY")))
      .catch(() => {});
  }, []);

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

  // Poll unread count every 60s, paused when tab is hidden
  useEffect(() => {
    const INTERVAL = 60_000;
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
    allCommunities,
    onSwitchOrg: (c: OrgSummary) => setOrg(c as unknown as Org),
  };

  return (
    <WebRTCProvider userId={user?.id ?? ""} userName={user?.name ?? undefined}>
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
          />
        </>
      )}

      <IncomingCallBanner />
      <GlobalCallBar />
    </div>
    </WebRTCProvider>
  );
}
