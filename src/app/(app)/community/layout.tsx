"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Rss, Users, Trophy, Swords, MessageSquare, Settings, ArrowLeft, CreditCard } from "lucide-react";

const navLinks = [
  { href: "/community/feed",         label: "Feed",         icon: Rss },
  { href: "/community/medlemmer",    label: "Medlemmer",    icon: Users },
  { href: "/community/rangering",    label: "Rangering",    icon: Trophy },
  { href: "/community/konkurranser", label: "Konkurranser", icon: Swords },
  { href: "/community/chat",         label: "Chat",         icon: MessageSquare },
  { href: "/community/abonnement",   label: "Abonnement",   icon: CreditCard },
  { href: "/community/admin",        label: "Admin",        icon: Settings },
];

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-screen bg-zinc-950 text-white">
      <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="mb-0.5 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
              C
            </div>
            <span className="text-sm font-bold text-white">Intraa Community</span>
          </div>
          <p className="text-xs text-zinc-500">creators &amp; byggere</p>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-3">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-zinc-800 px-3 py-3">
          <Link
            href="/feed"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Til intranettet
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-zinc-800 bg-zinc-900 px-6">
          <span className="text-sm font-semibold text-white">
            {navLinks.find(l => l.href === pathname)?.label ?? "Community"}
          </span>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
