"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2 } from "lucide-react";

type MemberRole = "OWNER" | "ADMIN" | "MODERATOR" | "VIP" | "MEMBER";

const ASSIGNABLE_ROLES: { value: MemberRole; label: string }[] = [
  { value: "OWNER",     label: "Eier" },
  { value: "ADMIN",     label: "Admin" },
  { value: "MODERATOR", label: "Moderator" },
  { value: "VIP",       label: "VIP" },
  { value: "MEMBER",    label: "Medlem" },
];

interface UserResult {
  id:    string;
  name:  string | null;
  email: string;
}

interface NewMember {
  membershipId: string;
  userId:       string;
  name:         string;
  email:        string;
  role:         MemberRole;
  username:     string;
}

interface Props {
  organizationId: string;
  onClose:        () => void;
  onAdded:        (member: NewMember) => void;
}

export default function AddMemberModal({ organizationId, onClose, onAdded }: Props) {
  const [emailQuery,    setEmailQuery]    = useState("");
  const [searching,     setSearching]     = useState(false);
  const [results,       setResults]       = useState<UserResult[]>([]);
  const [selected,      setSelected]      = useState<UserResult | null>(null);
  const [role,          setRole]          = useState<MemberRole>("MEMBER");
  const [username,      setUsername]      = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!emailQuery || emailQuery.length < 3 || selected) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/superadmin/users/search?email=${encodeURIComponent(emailQuery)}`);
        const data = await res.json() as { users: UserResult[] };
        setResults(data.users ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [emailQuery, selected]);

  function selectUser(user: UserResult) {
    setSelected(user);
    setEmailQuery(user.email);
    setResults([]);
    // Pre-fill username from name
    const suggested = (user.name ?? "")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 30);
    setUsername(suggested);
  }

  function validateUsername(val: string) {
    if (!val) { setUsernameError(""); return true; }
    if (!/^[a-zA-Z0-9_]{1,30}$/.test(val)) {
      setUsernameError("Kun bokstaver, tall og _ (maks 30 tegn)");
      return false;
    }
    setUsernameError("");
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!validateUsername(username)) return;

    setSubmitting(true);
    setSubmitError("");

    const res = await fetch("/api/superadmin/memberships", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        userId:         selected.id,
        organizationId,
        role,
        username:       username || undefined,
      }),
    });

    const data = await res.json().catch(() => ({})) as { membership?: { id: string }; error?: string };
    if (res.ok && data.membership) {
      onAdded({
        membershipId: data.membership.id,
        userId:       selected.id,
        name:         selected.name ?? selected.email,
        email:        selected.email,
        role,
        username,
      });
      onClose();
    } else {
      setSubmitError(data.error ?? "Noe gikk galt");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Legg til medlem</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email search */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Søk etter bruker (e-post)</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                {searching
                  ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                  : <Search className="h-4 w-4 text-zinc-500" />
                }
              </div>
              <input
                type="text"
                value={emailQuery}
                onChange={(e) => { setEmailQuery(e.target.value); setSelected(null); }}
                placeholder="navn@eksempel.no"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500"
              />
              {results.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl">
                  {results.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selectUser(u)}
                      className="flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-zinc-700"
                    >
                      <span className="text-sm font-medium text-white">{u.name ?? "—"}</span>
                      <span className="text-xs text-zinc-400">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selected && (
              <p className="mt-1.5 text-xs text-emerald-400">
                Valgt: {selected.name ?? selected.email}
              </p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">@brukernavn <span className="text-zinc-600">(valgfritt)</span></label>
            <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 focus-within:border-indigo-500 transition-colors">
              <span className="mr-1 text-sm text-zinc-500">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); validateUsername(e.target.value); }}
                placeholder="brukernavn"
                maxLength={30}
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
              />
            </div>
            {usernameError && <p className="mt-1 text-xs text-rose-400">{usernameError}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Rolle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-500"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {submitError && <p className="text-sm text-rose-400">{submitError}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={!selected || submitting}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
            >
              {submitting ? "Legger til…" : "Legg til"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
