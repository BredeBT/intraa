"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, UserCog, SlidersHorizontal,
  AlertTriangle, ArrowLeft, Ticket,
} from "lucide-react";
import { useOrg } from "@/lib/context/OrgContext";
import { useUser } from "@/lib/hooks/useUser";

const ADMIN_NAV = [
  { href: "/admin",               label: "Oversikt",     icon: LayoutDashboard },
  { href: "/admin/brukere",       label: "Brukere",      icon: UserCog },
  { href: "/admin/tickets",       label: "Tickets",      icon: Ticket },
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
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 md:flex">
        <div className="flex flex-col gap-0.5 overflow-y-auto px-3 py-4">
          {/* Back link */}
          <Link
            href="/feed"
            className="mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">← {org?.name ?? "Tilbake"}</span>
          </Link>

          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            Admin
          </p>

          {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}

          {isOwner && (
            <>
              <div className="my-2 border-t border-zinc-800" />
              <Link
                href="/admin/faresone"
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === "/admin/faresone"
                    ? "bg-red-600 text-white"
                    : "text-red-500 hover:bg-red-500/10 hover:text-red-400"
                }`}
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Faresone
              </Link>
            </>
          )}
        </div>

        {/* User info at bottom */}
        <div className="mt-auto border-t border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-white">
              {(user?.name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <span className="truncate text-xs text-zinc-500">{user?.name ?? ""}</span>
          </div>
        </div>
      </aside>

      {/* Mobile tab bar — horizontal scrollable, hidden on desktop */}
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-900 md:hidden">
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
          <Link
            href="/feed"
            className="shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <div className="flex overflow-x-auto gap-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  pathname === href
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
            {isOwner && (
              <Link
                href="/admin/faresone"
                className={`shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  pathname === "/admin/faresone"
                    ? "bg-red-600 text-white"
                    : "text-red-500 hover:bg-red-500/10"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Faresone
              </Link>
            )}
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
