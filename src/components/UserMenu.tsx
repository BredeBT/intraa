"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, LogOut, ShieldAlert, ArrowLeftRight } from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";
import { useOrg } from "@/lib/context/OrgContext";

const STATUS_COLORS: Record<string, string> = {
  online:    "bg-emerald-500",
  away:      "bg-amber-500",
  dnd:       "bg-rose-500",
  invisible: "bg-zinc-500",
};

export default function UserMenu() {
  const { user, isAdmin } = useUser();
  const { org }           = useOrg();
  const isSuperAdmin      = user?.isSuperAdmin ?? false;
  const [open,     setOpen]     = useState(false);
  const [status,   setStatus]   = useState<string>("online");
  const [orgCount, setOrgCount] = useState(0);
  const ref    = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isOrgAdmin = org?.userRole === "OWNER" || org?.userRole === "ADMIN";

  // Fetch user status once
  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d: { status?: string }) => { if (d.status) setStatus(d.status); })
      .catch(() => null);
  }, []);

  // Fetch org count to conditionally show org switcher
  useEffect(() => {
    fetch("/api/user/orgs")
      .then((r) => r.ok ? r.json() as Promise<unknown[]> : Promise.reject())
      .then((orgs) => setOrgCount(Array.isArray(orgs) ? orgs.length : 0))
      .catch(() => null);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setOpen(false);
    const { signOut } = await import("next-auth/react");
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-zinc-800"
      >
        <span className="text-sm text-zinc-400">{user?.name ?? "…"}</span>
        <div className="relative">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {user?.initials ?? "–"}
            </div>
          )}
          <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-950 ${STATUS_COLORS[status] ?? "bg-emerald-500"}`} />
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
          {isSuperAdmin && (
            <>
              <Link
                href="/superadmin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-violet-400 transition-colors hover:bg-zinc-800 hover:text-violet-300"
              >
                <ShieldAlert className="h-4 w-4 shrink-0" />
                Superadmin panel
              </Link>
              <div className="my-1 border-t border-zinc-800" />
            </>
          )}
          {orgCount >= 2 && (
            <Link
              href="/bytt-org"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <ArrowLeftRight className="h-4 w-4 shrink-0" />
              Bytt organisasjon
            </Link>
          )}
          {isOrgAdmin && (
            <Link
              href="/admin/innstillinger"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <Settings className="h-4 w-4 shrink-0" />
              Organisasjonsinnstillinger
            </Link>
          )}
          {(orgCount >= 2 || isOrgAdmin) && <div className="my-1 border-t border-zinc-800" />}
          <Link
            href="/innstillinger"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <Settings className="h-4 w-4 shrink-0" />
            Innstillinger
          </Link>
          <div className="my-1 border-t border-zinc-800" />
          <button
            onClick={handleLogout}
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
