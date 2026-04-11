"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X, UserPlus, Users } from "lucide-react";
import type { UserSearchResult } from "@/app/api/users/search/route";
import type { OrgSearchResult } from "@/app/api/organizations/search/route";

function Avatar({ avatarUrl, name }: { avatarUrl: string | null; name: string | null }) {
  const initials = (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-white">
      {initials}
    </div>
  );
}

function OrgLogo({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />;
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
      {name[0]?.toUpperCase()}
    </div>
  );
}

export default function SearchOverlay({
  open,
  onClose,
}: {
  open:    boolean;
  onClose: () => void;
}) {
  const [query,        setQuery]        = useState("");
  const [users,        setUsers]        = useState<UserSearchResult[]>([]);
  const [orgs,         setOrgs]         = useState<OrgSearchResult[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [localStatus,  setLocalStatus]  = useState<Record<string, UserSearchResult["friendStatus"]>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setUsers([]);
      setOrgs([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setUsers([]); setOrgs([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [uRes, oRes] = await Promise.all([
          fetch(`/api/users/search?q=${encodeURIComponent(q)}`),
          fetch(`/api/organizations/search?q=${encodeURIComponent(q)}`),
        ]);
        if (uRes.ok) setUsers((await uRes.json() as { users: UserSearchResult[] }).users);
        if (oRes.ok) setOrgs((await oRes.json() as { organizations: OrgSearchResult[] }).organizations);
        setLocalStatus({});
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function addFriend(userId: string) {
    const res = await fetch("/api/friends/request", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ receiverId: userId }),
    });
    if (res.ok) setLocalStatus((p) => ({ ...p, [userId]: "PENDING_SENT" }));
  }

  if (!open) return null;

  const hasResults = users.length > 0 || orgs.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[12vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Søk etter personer, communities..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-zinc-500 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 text-xs text-zinc-600">ESC</kbd>
        </div>

        {/* Divider */}
        <div className="h-px bg-zinc-800" />

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Empty state */}
          {query.trim().length < 2 && (
            <p className="px-4 py-8 text-center text-sm text-zinc-600">
              Begynn å skrive for å søke…
            </p>
          )}

          {loading && query.trim().length >= 2 && (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">Søker…</p>
          )}

          {!loading && query.trim().length >= 2 && !hasResults && (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">
              Ingen resultater for «{query}».
            </p>
          )}

          {/* Persons */}
          {users.length > 0 && (
            <div className="py-2">
              <p className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Personer
              </p>
              {users.slice(0, 5).map((u) => {
                const status = localStatus[u.id] ?? u.friendStatus;
                return (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 transition-colors">
                    <Link href={`/u/${u.username ?? u.id}`} onClick={onClose}>
                      <Avatar avatarUrl={u.avatarUrl} name={u.name} />
                    </Link>
                    <Link href={`/u/${u.username ?? u.id}`} onClick={onClose} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{u.name ?? "Ukjent"}</p>
                      {u.username && <p className="truncate text-xs text-zinc-500">@{u.username}</p>}
                    </Link>
                    {status === "ACCEPTED" ? (
                      <Link
                        href={`/u/${u.username ?? u.id}`}
                        onClick={onClose}
                        className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:border-zinc-500 transition-colors"
                      >
                        Se profil
                      </Link>
                    ) : status === "PENDING_SENT" ? (
                      <span className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-500">
                        Sendt
                      </span>
                    ) : (
                      <button
                        onClick={() => void addFriend(u.id)}
                        className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
                      >
                        <UserPlus className="h-3 w-3" /> Legg til
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Communities */}
          {orgs.length > 0 && (
            <div className="py-2">
              {users.length > 0 && <div className="mx-4 mb-2 h-px bg-zinc-800" />}
              <p className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Communities
              </p>
              {orgs.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 transition-colors">
                  <Link href={`/c/${o.slug}`} onClick={onClose}>
                    <OrgLogo logoUrl={o.logoUrl} name={o.name} />
                  </Link>
                  <Link href={`/c/${o.slug}`} onClick={onClose} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{o.name}</p>
                    <p className="flex items-center gap-1 text-xs text-zinc-500">
                      <Users className="h-3 w-3" /> {o.memberCount.toLocaleString("no-NO")} medlemmer
                    </p>
                  </Link>
                  {o.isMember ? (
                    <span className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-500">
                      Medlem
                    </span>
                  ) : (
                    <Link
                      href={`/c/${o.slug}`}
                      onClick={onClose}
                      className="shrink-0 rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white hover:opacity-80 transition-opacity"
                    >
                      Bli med
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* See all */}
          {hasResults && (
            <div className="border-t border-zinc-800 px-4 py-2.5">
              <Link
                href={`/search?q=${encodeURIComponent(query.trim())}`}
                onClick={onClose}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Se alle resultater for «{query.trim()}» →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
