"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, UserCog, Settings,
  ArrowLeft,
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
} as const;

const ADMIN_NAV = [
  { href: "/admin",               label: "Oversikt",      icon: LayoutDashboard },
  { href: "/admin/brukere",       label: "Brukere",       icon: UserCog         },
  { href: "/admin/innstillinger", label: "Innstillinger", icon: Settings        },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { org }  = useOrg();
  const { user } = useUser();

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
                className="nav-link flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium"
                data-active={active || undefined}
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

      {/* Mobile tab bar — 3 items, fits uten scroll */}
      <div className="shrink-0 md:hidden" style={{ background: S.surface, borderBottom: `1px solid ${S.line}` }}>
        <div className="flex items-center gap-2 px-3 py-2">
          <Link
            href="/feed"
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            style={{ background: S.surface2, color: S.muted }}
            aria-label="Tilbake til feed"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="nav-link flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium"
                data-active={active || undefined}
                style={{
                  background: active ? S.surface2 : "transparent",
                  color:      active ? S.text     : S.muted,
                  boxShadow:  active ? `inset 0 0 0 1px ${S.teal}40` : undefined,
                }}
                aria-label={label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
