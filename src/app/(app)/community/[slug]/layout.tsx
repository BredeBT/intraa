"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Rss, Users, Trophy, Swords, MessageSquare, Settings,
  ArrowLeft, CreditCard, Star, LayoutDashboard,
} from "lucide-react";

const MOCK_COMMUNITY = {
  name: "Intraa Community",
  slug: "intraa",
  initials: "IC",
  description: "creators & byggere",
  accentColor: "#7c3aed",
};

export default function CommunitySlugLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const base = `/community/${slug}`;

  const navLinks = [
    { href: base,                    label: "Forside",      icon: Rss,             exact: true },
    { href: `${base}/feed`,          label: "Feed",         icon: Rss },
    { href: `${base}/medlemmer`,     label: "Medlemmer",    icon: Users },
    { href: `${base}/rangering`,     label: "Rangering",    icon: Trophy },
    { href: `${base}/konkurranser`,  label: "Konkurranser", icon: Swords },
    { href: `${base}/lojalitet`,     label: "Lojalitet",    icon: Star },
    { href: `${base}/chat`,          label: "Chat",         icon: MessageSquare },
    { href: `${base}/abonnement`,    label: "Abonnement",   icon: CreditCard },
    { href: `${base}/admin`,         label: "Admin",        icon: LayoutDashboard },
  ];

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="flex h-full min-h-screen bg-zinc-950 text-white">
      <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="mb-0.5 flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: MOCK_COMMUNITY.accentColor }}
            >
              {MOCK_COMMUNITY.initials}
            </div>
            <span className="text-sm font-bold text-white">{MOCK_COMMUNITY.name}</span>
          </div>
          <p className="text-xs text-zinc-500">{MOCK_COMMUNITY.description}</p>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-3">
          {navLinks.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
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
          <Link href={`/community/${slug}/admin/innstillinger`}>
            <Settings className="ml-auto h-4 w-4 text-zinc-500 hover:text-white transition-colors" />
          </Link>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
