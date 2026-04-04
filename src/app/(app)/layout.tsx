"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Rss, MessageSquare, Ticket, Folder, Users, Settings } from "lucide-react";

const navLinks = [
  { href: "/feed", label: "Feed", icon: Rss, badge: null },
  { href: "/chat", label: "Chat", icon: MessageSquare, badge: 3 },
  { href: "/tickets", label: "Tickets", icon: Ticket, badge: null },
  { href: "/filer", label: "Filer", icon: Folder, badge: null },
  { href: "/medlemmer", label: "Medlemmer", icon: Users, badge: null },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      <aside className="flex w-60 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="px-6 py-5">
          <span className="text-xl font-bold tracking-tight text-white">Intraa</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {navLinks.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
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
        <div className="mt-auto border-t border-zinc-800 px-3 py-3">
          <Link
            href="/admin"
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-indigo-600 text-white"
                : "text-zinc-500 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Admin
          </Link>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <Header pathname={pathname} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

const pageTitles: Record<string, string> = {
  "/feed": "Feed",
  "/chat": "Chat",
  "/tickets": "Tickets",
  "/filer": "Filer",
  "/medlemmer": "Medlemmer",
  "/admin": "Admin",
  "/admin/brukere": "Admin — Brukere",
  "/admin/organisasjon": "Admin — Organisasjon",
};

function Header({ pathname }: { pathname: string }) {
  const title = pageTitles[pathname] ?? "Intraa";
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6">
      <span className="text-sm font-semibold text-white">{title}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">Anders Sørensen</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
          AS
        </div>
      </div>
    </header>
  );
}
