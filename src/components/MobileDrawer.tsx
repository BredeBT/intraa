"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  X, Newspaper, MessageCircle, Ticket, Folder,
  CalendarDays, CheckSquare, Home, LifeBuoy,
  Trophy, Swords, Star, Radio, Gamepad2, Settings,
} from "lucide-react";

interface NavLink {
  href:    string;
  label:   string;
  icon:    React.ElementType;
  feature: string;
}

interface OrgInfo {
  slug:     string;
  type:     string;
  userRole: string;
}

interface LiveStatus {
  isLive: boolean;
  title:  string;
}

interface Props {
  open:            boolean;
  onClose:         () => void;
  pathname:        string;
  org:             OrgInfo | null;
  enabledFeatures: string[] | null;
  liveStatus:      LiveStatus | null;
  isSuperAdmin:    boolean;
}

const COMPANY_NAV: NavLink[] = [
  { href: "/feed",     label: "Feed",     icon: Newspaper,     feature: "feed" },
  { href: "/chat",     label: "Chat",     icon: MessageCircle, feature: "chat" },
  { href: "/tickets",  label: "Tickets",  icon: Ticket,        feature: "tickets" },
  { href: "/kalender", label: "Kalender", icon: CalendarDays,  feature: "calendar" },
  { href: "/oppgaver", label: "Oppgaver", icon: CheckSquare,   feature: "tasks" },
  { href: "/filer",    label: "Filer",    icon: Folder,        feature: "files" },
];

function communityNav(slug: string): NavLink[] {
  return [
    { href: `/${slug}/feed`,         label: "Feed",         icon: Newspaper,     feature: "community_feed" },
    { href: `/chat`,                 label: "Chat",         icon: MessageCircle, feature: "community_chat" },
    { href: `/${slug}/rangering`,    label: "Rangering",    icon: Trophy,        feature: "community_leaderboard" },
    { href: `/${slug}/konkurranser`, label: "Konkurranser", icon: Swords,        feature: "community_contests" },
    { href: `/${slug}/lojalitet`,    label: "Lojalitet",    icon: Star,          feature: "community_loyalty" },
  ];
}

export default function MobileDrawer({
  open, onClose, pathname, org, enabledFeatures, liveStatus, isSuperAdmin,
}: Props) {
  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const isCommunity = org?.type === "COMMUNITY";
  const accent      = isCommunity ? "bg-violet-600" : "bg-indigo-600";

  const allLinks = isCommunity && org?.slug ? communityNav(org.slug) : COMPANY_NAV;
  const navLinks = enabledFeatures === null
    ? allLinks
    : allLinks.filter((l) => enabledFeatures.includes(l.feature));

  const liveEnabled  = enabledFeatures === null || enabledFeatures.includes("live");
  const liveIsOnline = liveStatus?.isLive;

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link href={href} onClick={onClose}
        className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-colors ${
          active ? `${accent} text-white` : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
        }`}
      >
        <Icon className="h-5 w-5" />
        <span className="text-[10px] font-medium leading-tight">{label}</span>
      </Link>
    );
  }

  const isAdmin = org?.userRole === "OWNER" || org?.userRole === "ADMIN";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 md:hidden"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-zinc-800 bg-zinc-900 pb-[calc(env(safe-area-inset-bottom)+56px)] md:hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-zinc-700" />
        </div>

        {/* Close button */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <span className="text-sm font-semibold text-white">
            {org ? (isCommunity ? "Community" : org.slug) : "Navigasjon"}
          </span>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Global nav */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Generelt</p>
            <div className="grid grid-cols-4 gap-2">
              <NavItem href="/home"     label="Hjem"    icon={Home} />
              <NavItem href="/meldinger" label="Meldinger" icon={MessageCircle} />
              <NavItem href="/support"  label="Support" icon={LifeBuoy} />
            </div>
          </div>

          {/* Org-specific nav */}
          {org && navLinks.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {isCommunity ? "Community" : "Bedrift"}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {liveEnabled && org.slug && (
                  <Link
                    href={`/${org.slug}/live`}
                    onClick={onClose}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-colors ${
                      pathname.endsWith("/live")
                        ? "bg-rose-500/20 text-rose-300"
                        : liveIsOnline
                          ? "bg-zinc-800 text-rose-400"
                          : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Radio className="h-5 w-5" />
                    <span className="text-[10px] font-medium leading-tight">
                      Live{liveIsOnline ? " 🔴" : ""}
                    </span>
                  </Link>
                )}
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <NavItem key={href} href={href} label={label} icon={Icon} />
                ))}
                {isCommunity && org.slug && (
                  <NavItem href={`/${org.slug}/spill`} label="Spill" icon={Gamepad2} />
                )}
              </div>
            </div>
          )}

          {/* Admin */}
          {(isAdmin || isSuperAdmin) && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Admin</p>
              <div className="grid grid-cols-4 gap-2">
                {isAdmin && <NavItem href="/admin" label="Admin" icon={Settings} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
