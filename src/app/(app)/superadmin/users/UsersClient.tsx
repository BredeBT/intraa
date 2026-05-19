"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Users, ChevronLeft, X, Shield, Ticket, RotateCcw, Trash2, Check, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id:          string;
  name:        string | null;
  username:    string;
  email:       string;
  avatarUrl:   string | null;
  isSuperAdmin: boolean;
  createdAt:   string;
  memberCount: number;
  hasFanpass:  boolean;
  fanpassEnd:  string | null;
}

interface Props {
  initialUsers:  User[];
  total:         number;
  page:          number;
  limit:         number;
  initialSearch: string;
  initialSort:   string;
  orgId:         string;
  orgName:       string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

// ─── User edit modal ──────────────────────────────────────────────────────────

interface UserCommunity {
  orgId:       string;
  orgSlug:     string;
  orgName:     string;
  hasFanpass:  boolean;
  fanpassEnd:  string | null;
  granted:     boolean;
}

function ManageModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: (u: User) => void }) {
  const [name,       setName]       = useState(user.name ?? "");
  const [username,   setUsername]   = useState(user.username);
  const [email,      setEmail]      = useState(user.email);
  const [saving,     setSaving]     = useState(false);
  const [tempPw,     setTempPw]     = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [confirm,    setConfirm]    = useState<"remove" | null>(null);
  const [, start]                   = useTransition();

  // ── Fanpass management ───────────────────────────────────────────────────
  const [communities, setCommunities] = useState<UserCommunity[] | null>(null);
  const [fpLoading,   setFpLoading]   = useState(true);
  const [fpToggling,  setFpToggling]  = useState<string | null>(null);
  const [showAllOrgs, setShowAllOrgs] = useState(false);
  const [allOrgs,     setAllOrgs]     = useState<{ id: string; slug: string; name: string }[]>([]);

  const DURATIONS: { label: string; days: number }[] = [
    { label: "1 mnd",  days:  30 },
    { label: "3 mnd",  days:  90 },
    { label: "6 mnd",  days: 180 },
    { label: "1 år",   days: 365 },
  ];
  const [durationDays, setDurationDays] = useState<number>(365);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/superadmin/users/${user.id}/fanpass`)
      .then((r) => r.json() as Promise<{ communities: UserCommunity[] }>)
      .then((d) => { if (!cancelled) { setCommunities(d.communities); setFpLoading(false); } })
      .catch(() => { if (!cancelled) setFpLoading(false); });
    return () => { cancelled = true; };
  }, [user.id]);

  async function toggleFanpass(orgId: string, isCurrentlyActive: boolean) {
    setFpToggling(orgId);
    try {
      const res = isCurrentlyActive
        ? await fetch(`/api/superadmin/users/${user.id}/fanpass?orgId=${orgId}`, { method: "DELETE" })
        : await fetch(`/api/superadmin/users/${user.id}/fanpass`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId, durationDays }) });
      if (res.ok) {
        const refreshed = await fetch(`/api/superadmin/users/${user.id}/fanpass`)
          .then((r) => r.json() as Promise<{ communities: UserCommunity[] }>);
        setCommunities(refreshed.communities);
        // bubble new fanpass status to the list
        const anyActive = refreshed.communities.some((c) => c.hasFanpass);
        onSaved({ ...user, hasFanpass: anyActive });
      }
    } finally {
      setFpToggling(null);
    }
  }

  async function openAllOrgs() {
    setShowAllOrgs(true);
    if (allOrgs.length === 0) {
      const res = await fetch("/api/superadmin/orgs?limit=100");
      if (res.ok) {
        const d = await res.json() as { orgs: { id: string; slug: string; name: string }[] };
        setAllOrgs(d.orgs);
      }
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/superadmin/users/${user.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: name.trim() || null, username: username.trim(), email: email.trim() }),
    });
    const data = await res.json() as { user?: User; error?: string };
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Noe gikk galt"); return; }
    onSaved({ ...user, name: data.user?.name ?? null, username: data.user?.username ?? user.username, email: data.user?.email ?? user.email });
  }

  async function handleResetPassword() {
    setSaving(true);
    const res = await fetch(`/api/superadmin/users/${user.id}/reset-password`, { method: "POST" });
    const data = await res.json() as { tempPassword?: string; error?: string };
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Feil ved passord-reset"); return; }
    setTempPw(data.tempPassword ?? null);
  }

  function handleRemoveFromAll() {
    start(async () => {
      const res = await fetch(`/api/superadmin/users/${user.id}`, { method: "DELETE" });
      if (res.ok) { onClose(); } else { setError("Feil ved fjerning"); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60" onClick={onClose}>
      <div
        className="relative h-full w-full max-w-lg overflow-y-auto bg-zinc-900 border-l border-zinc-800 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                {initials(user.name)}
              </div>
            )}
            <div>
              <p className="font-semibold text-white">{user.name ?? "Ukjent"}</p>
              <p className="text-xs text-zinc-500">@{user.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info pills */}
        <div className="mb-5 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-zinc-400">
            Registrert {fmtDate(user.createdAt)}
          </span>
          <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-zinc-400">
            {user.memberCount} communities
          </span>
          {user.hasFanpass && (
            <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-violet-300">
              Fanpass aktiv
            </span>
          )}
          {user.isSuperAdmin && (
            <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-amber-300 flex items-center gap-1">
              <Shield className="h-3 w-3" /> Superadmin
            </span>
          )}
        </div>

        {/* Edit form */}
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Navn</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-500"
              placeholder="Fullt navn"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Brukernavn</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-500"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Lagrer…" : "Lagre endringer"}
          </button>
        </form>

        <div className="my-5 border-t border-zinc-800" />

        {/* Password reset */}
        <div className="mb-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Passord</p>
          <button
            onClick={() => void handleResetPassword()}
            disabled={saving}
            className="flex w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4 shrink-0" /> Tilbakestill passord
          </button>
          {tempPw && (
            <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-xs text-emerald-300 mb-1">Midlertidig passord — gi dette til brukeren:</p>
              <code className="font-mono text-sm text-emerald-200 select-all">{tempPw}</code>
            </div>
          )}
        </div>

        {/* Fanpass per community */}
        <div className="mt-6 border-t border-zinc-800 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5" /> Fanpass
            </p>
            <button
              onClick={() => void openAllOrgs()}
              className="text-[11px] text-zinc-500 hover:text-white transition-colors"
            >
              + Annet community
            </button>
          </div>

          {/* Duration picker */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] text-zinc-500 shrink-0">Varighet:</span>
            <div className="flex gap-1 flex-1">
              {DURATIONS.map((d) => (
                <button
                  key={d.days}
                  onClick={() => setDurationDays(d.days)}
                  className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    durationDays === d.days
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                      : "border border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {fpLoading ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Henter status…
            </div>
          ) : !communities || communities.length === 0 ? (
            <p className="text-xs text-zinc-500">Brukeren er ikke medlem av noen communities ennå.</p>
          ) : (
            <div className="space-y-1.5">
              {communities.map((c) => {
                const isToggling = fpToggling === c.orgId;
                return (
                  <div
                    key={c.orgId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{c.orgName}</p>
                      <p className="truncate text-[11px] text-zinc-500">
                        {c.hasFanpass
                          ? c.granted
                            ? <>Aktiv · gitt av admin · utløper {c.fanpassEnd ? new Date(c.fanpassEnd).toLocaleDateString("nb-NO") : "—"}</>
                            : <>Aktiv · betalt · utløper {c.fanpassEnd ? new Date(c.fanpassEnd).toLocaleDateString("nb-NO") : "—"}</>
                          : "Ingen Fanpass"}
                      </p>
                    </div>
                    <button
                      onClick={() => void toggleFanpass(c.orgId, c.hasFanpass)}
                      disabled={isToggling}
                      style={{
                        position:   "relative",
                        width:      36,
                        height:     20,
                        borderRadius: 9999,
                        background: c.hasFanpass ? "#7c3aed" : "#3f3f46",
                        transition: "background-color 150ms",
                        flexShrink: 0,
                      }}
                      title={c.hasFanpass ? "Trekk tilbake Fanpass" : `Gi Fanpass (${DURATIONS.find((d) => d.days === durationDays)?.label})`}
                    >
                      <span
                        style={{
                          position:   "absolute",
                          top:        2,
                          left:       c.hasFanpass ? 18 : 2,
                          width:      16,
                          height:     16,
                          borderRadius: 9999,
                          background: "#ffffff",
                          boxShadow:  "0 1px 3px rgba(0,0,0,0.3)",
                          transition: "left 150ms",
                          display:    "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isToggling && <Loader2 className="h-2.5 w-2.5 animate-spin text-zinc-600" />}
                        {!isToggling && c.hasFanpass && <Check className="h-2.5 w-2.5 text-violet-600" />}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* "Add other community" picker */}
          {showAllOrgs && (
            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-300">Velg community å gi Fanpass i</p>
                <button onClick={() => setShowAllOrgs(false)} className="text-zinc-500 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {allOrgs.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-2">Henter…</p>
                ) : (
                  allOrgs
                    .filter((o) => !communities?.some((c) => c.orgId === o.id))
                    .map((o) => (
                      <button
                        key={o.id}
                        onClick={() => {
                          void toggleFanpass(o.id, false);
                          setShowAllOrgs(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        <span className="truncate">{o.name}</span>
                        <span className="text-[10px] text-violet-400 shrink-0">+ Gi Fanpass</span>
                      </button>
                    ))
                )}
              </div>
              <p className="mt-2 text-[10px] text-zinc-600">
                Brukeren legges til som medlem automatisk hvis ikke allerede med.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-red-900/30 pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-red-500/60">Farlige handlinger</p>
          {confirm === "remove" ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="mb-3 text-xs text-red-300">Fjerner brukeren fra alle communities. Kan ikke angres.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 rounded-lg border border-zinc-700 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleRemoveFromAll}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-500"
                >
                  Bekreft
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirm("remove")}
              className="flex w-full items-center gap-2 rounded-lg border border-red-900/40 px-3 py-2.5 text-sm text-red-400 transition-colors hover:border-red-500/50 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4 shrink-0" /> Fjern fra alle communities
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function UsersClient({
  initialUsers,
  total,
  page,
  limit,
  initialSearch,
  initialSort,
  orgId,
  orgName,
}: Props) {
  const router      = useRouter();
  const urlParams   = useSearchParams();
  const [users,     setUsers]    = useState(initialUsers);
  const [search,    setSearch]   = useState(initialSearch);
  const [sort,      setSort]     = useState(initialSort);
  const [managed,   setManaged]  = useState<User | null>(null);
  const searchRef   = useRef(search);
  searchRef.current = search;

  // Debounced search — pushes new URL, server re-renders
  useEffect(() => {
    const t = setTimeout(() => {
      const current = new URLSearchParams(urlParams.toString());
      current.set("search", search);
      current.set("page", "1");
      router.push(`/superadmin/users?${current.toString()}`);
    }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Sync users from props when navigation completes
  useEffect(() => { setUsers(initialUsers); }, [initialUsers]);

  function handleSortChange(newSort: string) {
    setSort(newSort);
    const current = new URLSearchParams(urlParams.toString());
    current.set("sort", newSort);
    current.set("page", "1");
    router.push(`/superadmin/users?${current.toString()}`);
  }

  function buildPageUrl(nextPage: number) {
    const current = new URLSearchParams(urlParams.toString());
    current.set("page", String(nextPage));
    return `/superadmin/users?${current.toString()}`;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="px-8 py-8">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" /> Tilbake
      </button>

      {/* Header */}
      <div className="mb-1 flex items-center gap-2">
        <Users className="h-5 w-5 text-zinc-400" />
        <h1 className="text-xl font-semibold text-white">
          Brukere{orgName ? ` — ${orgName}` : ""}
        </h1>
      </div>
      <p className="mb-6 text-sm text-zinc-500">{total.toLocaleString("nb-NO")} brukere totalt</p>

      {/* Search + sort */}
      <div className="mb-5 flex gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 focus-within:border-zinc-600">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk på navn, brukernavn eller e-post…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-zinc-600 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-zinc-600"
        >
          <option value="newest">Nyeste først</option>
          <option value="oldest">Eldste først</option>
          <option value="name">Navn A–Å</option>
        </select>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center">
          <p className="text-sm text-zinc-500">Ingen brukere funnet.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Bruker</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 hidden md:table-cell">E-post</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Comm.</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 hidden lg:table-cell">Registrert</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="bg-zinc-950">
                {users.map((u, i) => (
                  <tr
                    key={u.id}
                    className={`transition-colors hover:bg-zinc-900 ${i < users.length - 1 ? "border-b border-zinc-800" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-white">
                            {initials(u.name)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white leading-tight">{u.name ?? "Ukjent"}</p>
                          <p className="text-xs text-zinc-500">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-4 text-xs text-zinc-400 md:table-cell">{u.email}</td>
                    <td className="px-5 py-4 text-xs text-zinc-400">{u.memberCount}</td>
                    <td className="hidden px-5 py-4 text-xs text-zinc-500 lg:table-cell">{fmtDate(u.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.hasFanpass && (
                          <span className="flex items-center gap-0.5 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                            <Ticket className="h-3 w-3" /> Fanpass
                          </span>
                        )}
                        {u.isSuperAdmin && (
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                            <Shield className="h-3 w-3" /> SA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setManaged(u)}
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
                      >
                        Administrer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            {page > 1 ? (
              <a href={buildPageUrl(page - 1)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white">
                ← Forrige
              </a>
            ) : <div />}
            <span className="text-xs text-zinc-600">Side {page} av {totalPages}</span>
            {page < totalPages && (
              <a href={buildPageUrl(page + 1)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white">
                Neste →
              </a>
            )}
          </div>
        </>
      )}

      {/* Manage modal / slide-over */}
      {managed && (
        <ManageModal
          user={managed}
          onClose={() => setManaged(null)}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
            setManaged(updated);
          }}
        />
      )}
    </div>
  );
}
