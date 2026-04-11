"use client";

import Link from "next/link";
import { Home, Search, Mail, UserCircle, LayoutGrid } from "lucide-react";

interface Props {
  pathname:    string;
  unreadCount: number;
  isCommunity: boolean;
  onSearch:    () => void;
  onMenu:      () => void;
}

export default function BottomBar({ pathname, unreadCount, isCommunity, onSearch, onMenu }: Props) {
  const accent = isCommunity ? "text-violet-400" : "text-indigo-400";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-zinc-800 bg-zinc-900 pb-[env(safe-area-inset-bottom)] md:hidden">
      {/* Home */}
      <Link href="/home" className={`flex flex-col items-center gap-0.5 px-4 py-1 ${isActive("/home") ? accent : "text-zinc-500"}`}>
        <Home className="h-5 w-5" />
        <span className="text-[9px]">Hjem</span>
      </Link>

      {/* Search */}
      <button onClick={onSearch} className="flex flex-col items-center gap-0.5 px-4 py-1 text-zinc-500">
        <Search className="h-5 w-5" />
        <span className="text-[9px]">Søk</span>
      </button>

      {/* Messages with badge */}
      <Link href="/meldinger" className={`relative flex flex-col items-center gap-0.5 px-4 py-1 ${isActive("/meldinger") ? accent : "text-zinc-500"}`}>
        <Mail className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        <span className="text-[9px]">Meldinger</span>
      </Link>

      {/* Profile */}
      <Link href="/profil/meg" className={`flex flex-col items-center gap-0.5 px-4 py-1 ${isActive("/profil") ? accent : "text-zinc-500"}`}>
        <UserCircle className="h-5 w-5" />
        <span className="text-[9px]">Profil</span>
      </Link>

      {/* Community / org menu */}
      <button onClick={onMenu} className="flex flex-col items-center gap-0.5 px-4 py-1 text-zinc-500">
        <LayoutGrid className="h-5 w-5" />
        <span className="text-[9px]">Meny</span>
      </button>
    </nav>
  );
}
