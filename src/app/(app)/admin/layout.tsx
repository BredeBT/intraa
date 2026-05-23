"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, UserCog, SlidersHorizontal,
  AlertTriangle, ArrowLeft,
} from "lucide-react";
import { useOrg } from "@/lib/context/OrgContext";
import { useUser } from "@/lib/hooks/useUser";

const S = {
  bg:       "#050816",
  surface:  "#0B1027",
  surface2: "#131A35",
  line:     "rgba(240,244,255,0.08)",
  text:     "#F0F4FF",
  muted:    "rgba(240,244,255,0.6)",
  subtle:   "rgba(240,244,255,0.4)",
  teal:     "#5EEAD4",
  rose:     "#F87171",
} as const;

const ADMIN_NAV = [
  { href: "/admin",               label: "Oversikt",      icon: LayoutDashboard  },
  { href: "/admin/brukere",       label: "Brukere",       icon: UserCog          },
  { href: "/admin/innstillinger", label: "Innstillinger", icon: SlidersHorizontal },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const { org }   = useOrg();
  const { user }  = useUser();
  const isOwner   = org?.userRole === "OWNER";

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100dvh-7rem)] md:min-h-[calc(100dvh-3.5rem)]">
      {/* Admin sidebar — desktop only */}
      <aside
        className="hidden w-56 shrink-0 flex-col md:flex"
        style={{ background: S.surface, borderRight: `1px solid ${S.line}` }}
      >
        <div className="flex flex-col gap-0.5 overflow-y-auto px-3 py-4">
          {/* Back link */}
          <Link
            href="/feed"
            className="mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors hover:bg-white/[0.04]"
            style={{ color: S.subtle }}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">← {org?.name ?? "Tilbake"}</span>
          </Link>

          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: S.subtle }}>
            Admin
          </p>

          {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  background: active ? S.surface2 : "transparent",
                  color:      active ? S.text     : S.muted,
                  boxShadow:  active ? `inset 0 0 0 1px ${S.teal}40` : undefined,
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}

          {isOwner && (
            <>
              <div className="my-2" style={{ borderTop: `1px solid ${S.line}` }} />
              <Link
                href="/admin/faresone"
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  background: pathname === "/admin/faresone" ? `${S.rose}15` : "transparent",
                  color:      S.rose,
                  boxShadow:  pathname === "/admin/faresone" ? `inset 0 0 0 1px ${S.rose}40` : undefined,
                }}
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Faresone
              </Link>
            </>
          )}
        </div>

        {/* User info at bottom */}
        <div className="mt-auto px-4 py-3" style={{ borderTop: `1px solid ${S.line}` }}>
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{ background: S.surface2, color: S.text }}
            >
              {(user?.name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <span className="truncate text-xs" style={{ color: S.muted }}>{user?.name ?? ""}</span>
          </div>
        </div>
      </aside>

      {/* Mobile tab bar — horizontal scrollable, hidden on desktop */}
      <div className="shrink-0 md:hidden" style={{ background: S.surface, borderBottom: `1px solid ${S.line}` }}>
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
          <Link
            href="/feed"
            className="shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
            style={{ color: S.subtle }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <div className="relative flex-1 overflow-hidden">
            <div className="flex overflow-x-auto gap-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className="shrink-0 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      background: active ? S.surface2 : "transparent",
                      color:      active ? S.text     : S.muted,
                      boxShadow:  active ? `inset 0 0 0 1px ${S.teal}40` : undefined,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                );
              })}
              {isOwner && (
                <Link
                  href="/admin/faresone"
                  className="shrink-0 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    background: pathname === "/admin/faresone" ? `${S.rose}15` : "transparent",
                    color:      S.rose,
                  }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Faresone</span>
                </Link>
              )}
            </div>
            {/* Fade hint for scroll */}
            <div
              className="pointer-events-none absolute right-0 top-0 h-full w-6"
              style={{ background: `linear-gradient(to left, ${S.surface}, transparent)` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
