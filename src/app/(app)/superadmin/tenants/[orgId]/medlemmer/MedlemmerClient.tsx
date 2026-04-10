"use client";

import { useState, useRef, useEffect } from "react";
import { UserPlus, Trash2, Check, X } from "lucide-react";
import AddMemberModal from "./AddMemberModal";

type MemberRole = "OWNER" | "ADMIN" | "MODERATOR" | "VIP" | "MEMBER";

const ALL_ROLES: MemberRole[] = ["OWNER", "ADMIN", "MODERATOR", "VIP", "MEMBER"];

const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER:     "Eier",
  ADMIN:     "Admin",
  MODERATOR: "Moderator",
  VIP:       "VIP",
  MEMBER:    "Medlem",
};

const ROLE_STYLES: Record<MemberRole, string> = {
  OWNER:     "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ADMIN:     "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  MODERATOR: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  VIP:       "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  MEMBER:    "bg-zinc-500/10 text-zinc-400 border-zinc-700",
};

interface Member {
  membershipId:   string;
  userId:         string;
  name:           string;
  email:          string;
  role:           MemberRole;
  username:       string | null;
  globalUsername: string;
}

interface Props {
  members:        Member[];
  organizationId: string;
  orgName:        string;
}

// ─── Role dropdown ────────────────────────────────────────────────────────────

function RoleDropdown({
  membershipId, role, onChange,
}: {
  membershipId: string;
  role:         MemberRole;
  onChange:     (newRole: MemberRole) => void;
}) {
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function select(newRole: MemberRole) {
    if (newRole === role) { setOpen(false); return; }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/superadmin/memberships/${membershipId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ role: newRole }),
    });
    setSaving(false);
    setOpen(false);
    if (res.ok) {
      onChange(newRole);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Noe gikk galt");
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        disabled={saving}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all hover:opacity-80 ${ROLE_STYLES[role]}`}
      >
        {saving ? "…" : ROLE_LABELS[role]}
        <svg className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>

      {error && <p className="absolute left-0 top-full mt-0.5 whitespace-nowrap rounded bg-rose-900/80 px-2 py-0.5 text-[10px] text-rose-300">{error}</p>}

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-36 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          {ALL_ROLES.map((r) => (
            <button
              key={r}
              onClick={() => void select(r)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-800 ${
                r === role ? "font-semibold text-white" : "text-zinc-400"
              }`}
            >
              <span>{ROLE_LABELS[r]}</span>
              {r === role && <Check className="h-3 w-3 text-indigo-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inline username editor ───────────────────────────────────────────────────

function UsernameCell({
  membershipId, username, onChange,
}: {
  membershipId: string;
  username:     string | null;
  onChange:     (u: string | null) => void;
}) {
  const [editing, setEditing]   = useState(false);
  const [value,   setValue]     = useState(username ?? "");
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  async function save() {
    const trimmed = value.trim();
    if (trimmed === (username ?? "")) { setEditing(false); return; }
    if (trimmed && !/^[a-zA-Z0-9_]{1,30}$/.test(trimmed)) {
      setError("Kun a-z, 0-9, _");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/superadmin/memberships/${membershipId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username: trimmed || null }),
    });
    setSaving(false);
    if (res.ok) {
      onChange(trimmed || null);
      setEditing(false);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Noe gikk galt");
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-zinc-500">@</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(""); }}
          onKeyDown={(e) => {
            if (e.key === "Enter")  { e.preventDefault(); void save(); }
            if (e.key === "Escape") { setEditing(false); setValue(username ?? ""); setError(""); }
          }}
          maxLength={30}
          disabled={saving}
          className="w-24 rounded border border-zinc-600 bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-white outline-none focus:border-indigo-500"
        />
        <button onClick={() => void save()} disabled={saving} className="text-emerald-500 hover:text-emerald-400">
          <Check className="h-3 w-3" />
        </button>
        <button onClick={() => { setEditing(false); setValue(username ?? ""); setError(""); }} className="text-zinc-600 hover:text-zinc-400">
          <X className="h-3 w-3" />
        </button>
        {error && <span className="text-[10px] text-rose-400">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-zinc-800"
      title="Klikk for å redigere"
    >
      {username ? (
        <span className="font-mono text-xs text-zinc-400 group-hover:text-white">@{username}</span>
      ) : (
        <span className="text-xs text-zinc-700 group-hover:text-zinc-500">—</span>
      )}
    </button>
  );
}

// ─── Global username editor ───────────────────────────────────────────────────

function GlobalUsernameCell({
  userId,
  username,
  onChange,
}: {
  userId:   string;
  username: string;
  onChange: (u: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value,   setValue]   = useState(username);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  async function save() {
    const trimmed = value.trim();
    if (trimmed === username) { setEditing(false); return; }
    if (!trimmed || !/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
      setError("3–20 tegn, kun a-z, 0-9, _");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/superadmin/users/${userId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username: trimmed }),
    });
    setSaving(false);
    if (res.ok) {
      onChange(trimmed);
      setEditing(false);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Noe gikk galt");
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-zinc-500">@</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(""); }}
          onKeyDown={(e) => {
            if (e.key === "Enter")  { e.preventDefault(); void save(); }
            if (e.key === "Escape") { setEditing(false); setValue(username); setError(""); }
          }}
          maxLength={20}
          disabled={saving}
          className="w-28 rounded border border-indigo-600 bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-white outline-none focus:border-indigo-500"
        />
        <button onClick={() => void save()} disabled={saving} className="text-emerald-500 hover:text-emerald-400">
          <Check className="h-3 w-3" />
        </button>
        <button onClick={() => { setEditing(false); setValue(username); setError(""); }} className="text-zinc-600 hover:text-zinc-400">
          <X className="h-3 w-3" />
        </button>
        {error && <span className="text-[10px] text-rose-400">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-zinc-800"
      title="Klikk for å endre globalt brukernavn"
    >
      <span className="font-mono text-xs text-indigo-400 group-hover:text-indigo-300">@{username}</span>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MedlemmerClient({ members: initial, organizationId, orgName }: Props) {
  const [members,   setMembers]   = useState<Member[]>(initial);
  const [showModal, setShowModal] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null);
  const [removeError,   setRemoveError]   = useState("");
  const [removing,      setRemoving]      = useState(false);

  function updateRole(membershipId: string, newRole: MemberRole) {
    setMembers((prev) => prev.map((m) => m.membershipId === membershipId ? { ...m, role: newRole } : m));
  }

  function updateUsername(membershipId: string, newUsername: string | null) {
    setMembers((prev) => prev.map((m) => m.membershipId === membershipId ? { ...m, username: newUsername } : m));
  }

  function updateGlobalUsername(userId: string, newUsername: string) {
    setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, globalUsername: newUsername } : m));
  }

  async function confirmAndRemove() {
    if (!confirmRemove) return;
    setRemoving(true);
    setRemoveError("");

    const res = await fetch(`/api/superadmin/memberships/${confirmRemove.membershipId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.membershipId !== confirmRemove.membershipId));
      setConfirmRemove(null);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setRemoveError(data.error ?? "Noe gikk galt");
    }
    setRemoving(false);
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Medlemmer</h2>
          <p className="text-sm text-zinc-500">{members.length} medlemmer i organisasjonen.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <UserPlus className="h-4 w-4" />
          Legg til medlem
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Bruker</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden lg:table-cell">E-post</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden sm:table-cell">Org-brukernavn</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden md:table-cell">
                <span className="text-indigo-400">@</span> Globalt brukernavn
              </th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Rolle</th>
              <th className="px-5 py-3 text-right font-medium text-zinc-500">Fjern</th>
            </tr>
          </thead>
          <tbody className="bg-zinc-950">
            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-zinc-500">Ingen medlemmer ennå.</td>
              </tr>
            )}
            {members.map((m, i) => (
              <tr
                key={m.membershipId}
                className={`transition-colors hover:bg-zinc-900/60 ${i < members.length - 1 ? "border-b border-zinc-800" : ""}`}
              >
                {/* Avatar + navn */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-white">
                      {m.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <span className="font-medium text-white">{m.name}</span>
                  </div>
                </td>

                {/* E-post */}
                <td className="px-5 py-3 text-zinc-400 hidden lg:table-cell">{m.email}</td>

                {/* Org-brukernavn (inline redigerbar) */}
                <td className="px-5 py-3 hidden sm:table-cell">
                  <UsernameCell
                    membershipId={m.membershipId}
                    username={m.username}
                    onChange={(u) => updateUsername(m.membershipId, u)}
                  />
                </td>

                {/* Globalt brukernavn */}
                <td className="px-5 py-3 hidden md:table-cell">
                  <GlobalUsernameCell
                    userId={m.userId}
                    username={m.globalUsername}
                    onChange={(u) => updateGlobalUsername(m.userId, u)}
                  />
                </td>

                {/* Rolle-dropdown */}
                <td className="px-5 py-3">
                  <RoleDropdown
                    membershipId={m.membershipId}
                    role={m.role}
                    onChange={(r) => updateRole(m.membershipId, r)}
                  />
                </td>

                {/* Fjern */}
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => { setConfirmRemove(m); setRemoveError(""); }}
                    className="rounded p-1.5 text-zinc-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                    title="Fjern fra organisasjonen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legg til modal */}
      {showModal && (
        <AddMemberModal
          organizationId={organizationId}
          onClose={() => setShowModal(false)}
          onAdded={(newMember) => {
            setMembers((prev) => [...prev, {
              membershipId:   newMember.membershipId,
              userId:         newMember.userId,
              name:           newMember.name,
              email:          newMember.email,
              role:           newMember.role,
              username:       newMember.username || null,
              globalUsername: newMember.username || "",
            }]);
          }}
        />
      )}

      {/* Bekreft fjern-dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-semibold text-white">Fjern medlem</h3>
            <p className="mb-5 text-sm text-zinc-400">
              Er du sikker på at du vil fjerne{" "}
              <span className="font-semibold text-white">{confirmRemove.name}</span>{" "}
              fra <span className="font-semibold text-white">{orgName}</span>?
            </p>
            {removeError && (
              <p className="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{removeError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmRemove(null); setRemoveError(""); }}
                disabled={removing}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Avbryt
              </button>
              <button
                onClick={() => void confirmAndRemove()}
                disabled={removing}
                className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
              >
                {removing ? "Fjerner…" : "Ja, fjern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
