"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User, Settings, LogOut } from "lucide-react";

const IS_ADMIN = true; // hardkodet inntil auth er på plass

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-zinc-800"
      >
        <span className="text-sm text-zinc-400">Anders Sørensen</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
          AS
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
          <Link
            href="/profil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <User className="h-4 w-4 shrink-0" />
            Min profil
          </Link>
          {IS_ADMIN && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <Settings className="h-4 w-4 shrink-0" />
              Admin
            </Link>
          )}
          <div className="my-1 border-t border-zinc-800" />
          <button
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 transition-colors hover:bg-zinc-800"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logg ut
          </button>
        </div>
      )}
    </div>
  );
}
