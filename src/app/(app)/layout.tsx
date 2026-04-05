"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Rss, MessageSquare, Ticket, Folder, Users, Settings,
  LayoutDashboard, UserCog, Building2, SlidersHorizontal, Search,
  CalendarDays, CheckSquare, HelpCircle, ChevronDown, ArrowLeftRight, Menu, X,
  Trophy, Swords, Star, CreditCard,
} from "lucide-react";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
import SearchOverlay from "@/components/SearchOverlay";
import OnboardingModal from "@/components/OnboardingModal";
import { useOrg } from "@/lib/context/OrgContext";
import { useUser } from "@/lib/hooks/useUser";

// ─── Nav definitions ──────────────────────────────────────────────────────────

const COMPANY_NAV = [
  { href: "/feed",      label: "Feed",      icon: Rss,           badge: null },
  { href: "/chat",      label: "Chat",      icon: MessageSquare, badge: null },
  { href: "/tickets",   label: "Tickets",   icon: Ticket,        badge: null },
  { href: "/kalender",  label: "Kalender",  icon: CalendarDays,  badge: null },
  { href: "/oppgaver",  label: "Oppgaver",  icon: CheckSquare,   badge: null },
  { href: "/filer",     label: "Filer",     icon: Folder,        badge: null },
  { href: "/medlemmer", label: "Medlemmer", icon: Users,         badge: null },
];

const COMMUNITY_NAV = [
  { href: "/community/feed",         label: "Feed",         icon: Rss,           badge: null },
  { href: "/community/medlemmer",    label: "Medlemmer",    icon: Users,         badge: null },
  { href: "/community/rangering",    label: "Rangering",    icon: Trophy,        badge: null },
  { href: "/community/konkurranser", label: "Konkurranser", icon: Swords,        badge: null },
  { href: "/community/lojalitet",    label: "Lojalitet",    icon: Star,          badge: null },
  { href: "/community/chat",         label: "Chat",         icon: MessageSquare, badge: null },
  { href: "/community/abonnement",   label: "Abonnement",   icon: CreditCard,    badge: null },
];

const ADMIN_LINKS = [
  { href: "/admin",               label: "Oversikt",      icon: LayoutDashboard },
  { href: "/admin/brukere",       label: "Brukere",       icon: UserCog },
  { href: "/admin/organisasjon",  label: "Organisasjon",  icon: Building2 },
  { href: "/admin/innstillinger", label: "Innstillinger", icon: SlidersHorizontal },
];

const PAGE_TITLES: Record<string, string> = {
  "/feed":                      "Feed",
  "/chat":                      "Chat",
  "/tickets":                   "Tickets",
  "/filer":                     "Filer",
  "/medlemmer":                 "Medlemmer",
  "/kalender":                  "Kalender",
  "/oppgaver":                  "Oppgaver",
  "/admin":                     "Admin — Oversikt",
  "/admin/brukere":             "Admin — Brukere",
  "/admin/organisasjon":        "Admin — Organisasjon",
  "/admin/innstillinger":       "Admin — Innstillinger",
  "/profil":                    "Profil",
  "/notifikasjoner":            "Notifikasjoner",
  "/soek":                      "Søk",
  "/innstillinger":             "Innstillinger",
  "/hjelp":                     "Hjelp & Support",
  "/bytt-org":                  "Bytt organisasjon",
  "/community/feed":            "Feed",
  "/community/medlemmer":       "Medlemmer",
  "/community/rangering":       "Rangering",
  "/community/konkurranser":    "Konkurranser",
  "/community/lojalitet":       "Lojalitet",
  "/community/chat":            "Chat",
  "/community/abonnement":      "Abonnement",
  "/community/admin":           "Admin",
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function SidebarContent({
  pathname, inAdmin, org, orgMenuOpen, orgMenuRef, setOrgMenuOpen, onNavClick, isSuperAdmin, userName,
}: {
  pathname:      string;
  inAdmin:       boolean;
  org:           ReturnType<typeof useOrg>["org"] | null;
  orgMenuOpen:   boolean;
  orgMenuRef:    React.RefObject<HTMLDivElement | null>;
  setOrgMenuOpen:(v: boolean | ((p: boolean) => boolean)) => void;
  onNavClick:    () => void;
  isSuperAdmin:  boolean;
  userName:      string;
}) {
  const isCommunity = org?.type === "COMMUNITY";
  const navLinks    = isCommunity ? COMMUNITY_NAV : COMPANY_NAV;
  const accentActive = isCommunity ? "bg-violet-600" : "bg-indigo-600";

  return (
    <>
      {/* Org switcher */}
      <div ref={orgMenuRef} className="relative border-b border-zinc-800 px-3 py-3">
        <button
          onClick={() => setOrgMenuOpen(p => !p)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-zinc-800"
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: org?.accentColor ?? "#6366f1" }}
          >
            {org?.initials ?? "…"}
          </div>
          <span className="flex-1 truncate text-left text-sm font-semibold text-white">{org?.name ?? "…"}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${orgMenuOpen ? "rotate-180" : ""}`} />
        </button>

        {orgMenuOpen && (
          <div className="absolute left-3 right-3 top-full z-50 mt-1 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
            <Link href="/bytt-org" onClick={() => { setOrgMenuOpen(false); onNavClick(); }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">
              <ArrowLeftRight className="h-4 w-4 shrink-0" /> Bytt organisasjon
            </Link>
            <Link href="/admin/organisasjon" onClick={() => { setOrgMenuOpen(false); onNavClick(); }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">
              <Settings className="h-4 w-4 shrink-0" /> Organisasjonsinnstillinger
            </Link>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 py-3">
        {navLinks.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} onClick={onNavClick}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active ? `${accentActive} text-white` : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge !== null && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="mt-auto border-t border-zinc-800 px-3 py-3">
        <Link href="/hjelp" onClick={onNavClick}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            pathname === "/hjelp" ? `${accentActive} text-white` : "text-zinc-500 hover:bg-zinc-800 hover:text-white"
          }`}
        >
          <HelpCircle className="h-4 w-4 shrink-0" /> Hjelp
        </Link>
        {(org?.userRole === "OWNER" || org?.userRole === "ADMIN") && (
          <>
            <Link href="/admin" onClick={onNavClick}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                inAdmin ? "text-white" : "text-zinc-500 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className="flex-1">Admin</span>
            </Link>
            {inAdmin && (
              <div className="mt-1 flex flex-col gap-0.5 pl-3">
                {ADMIN_LINKS.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={onNavClick}
                    className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                      pathname === href ? `${accentActive} font-medium text-white` : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" /> {label}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* User row */}
        <div className="mt-3 flex items-center gap-2 rounded-md px-3 py-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-white">
            {userName ? userName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() : "?"}
          </div>
          <span className="flex-1 truncate text-xs text-zinc-500">{userName}</span>
          {isSuperAdmin && (
            <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-400">
              SA
            </span>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const inAdmin      = pathname.startsWith("/admin");
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const orgMenuRef   = useRef<HTMLDivElement>(null);
  const { org }      = useOrg();
  const { user }     = useUser();

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (orgMenuRef.current && !orgMenuRef.current.contains(e.target as Node)) {
        setOrgMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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

  const title = PAGE_TITLES[pathname] ?? "Intraa";

  const sidebarProps = {
    pathname, inAdmin, org, orgMenuOpen, orgMenuRef, setOrgMenuOpen,
    onNavClick: () => setSidebarOpen(false),
    isSuperAdmin: user?.isSuperAdmin ?? false,
    userName: user?.name ?? "",
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <>
          <div className="sidebar-backdrop md:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-zinc-800 bg-zinc-900 md:hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
              <span className="text-sm font-semibold text-white">Meny</span>
              <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
              <SidebarContent {...sidebarProps} />
            </div>
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white md:hidden"
              aria-label="Åpne meny"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-white">{title}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openSearch}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white sm:px-3"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Søk</span>
              <kbd className="ml-1 hidden rounded border border-zinc-700 px-1 py-0.5 text-[10px] text-zinc-600 sm:inline">⌘K</kbd>
            </button>
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <OnboardingModal />
    </div>
  );
}
