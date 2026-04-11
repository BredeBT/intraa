"use client";

import { useState, useTransition } from "react";
import { Search, UserPlus, X, Clock, AlertTriangle } from "lucide-react";

type MemberRole = "OWNER" | "ADMIN" | "MODERATOR" | "VIP" | "MEMBER";
type OrgType    = "COMPANY" | "COMMUNITY";

type ReportReason =
  | "HARASSMENT" | "HATE_SPEECH" | "SPAM" | "INAPPROPRIATE"
  | "THREATS" | "IMPERSONATION" | "CHEATING" | "OTHER";

const ROLE_LABEL: Record<MemberRole, string> = {
  OWNER:     "Eier",
  ADMIN:     "Admin",
  MODERATOR: "Moderator",
  VIP:       "VIP",
  MEMBER:    "Medlem",
};

const ROLE_STYLES: Record<MemberRole, string> = {
  OWNER:     "bg-amber-500/10 text-amber-400",
  ADMIN:     "bg-indigo-500/10 text-indigo-400",
  MODERATOR: "bg-violet-500/10 text-violet-400",
  VIP:       "bg-emerald-500/10 text-emerald-400",
  MEMBER:    "bg-zinc-500/10 text-zinc-400",
};

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "HARASSMENT",   label: "😤 Trakassering eller mobbing" },
  { value: "HATE_SPEECH",  label: "🤬 Hat og diskriminering" },
  { value: "SPAM",         label: "📢 Spam eller reklame" },
  { value: "INAPPROPRIATE",label: "🔞 Upassende innhold" },
  { value: "THREATS",      label: "⚡ Trusler" },
  { value: "IMPERSONATION",label: "🎭 Utgir seg for å være noen andre" },
  { value: "CHEATING",     label: "🎮 Juks i spill eller konkurranser" },
  { value: "OTHER",        label: "📋 Annet" },
];

const ASSIGNABLE_ROLES: MemberRole[] = ["ADMIN", "MODERATOR", "VIP", "MEMBER"];

interface Member {
  membershipId: string;
  userId:       string;
  name:         string;
  email:        string;
  role:         MemberRole;
  username:     string | null;
  isMe:         boolean;
  isBanned:     boolean;
}

interface PendingInvitation {
  id:        string;
  email:     string;
  role:      string;
  createdAt: string;
  expiresAt: string;
}

interface Props {
  members:             Member[];
  organizationId:      string;
  orgType:             OrgType;
  pendingInvitations?: PendingInvitation[];
}

type ConfirmAction =
  | { type: "ban";    member: Member }
  | { type: "unban";  member: Member }
  | { type: "remove"; member: Member };

export default function BrukereClient({
  members: initial,
  organizationId,
  pendingInvitations: initialInvites = [],
}: Props) {
  const [members,       setMembers]       = useState<Member[]>(initial);
  const [invitations,   setInvitations]   = useState<PendingInvitation[]>(initialInvites);
  const [search,        setSearch]        = useState("");
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [showInvite,    setShowInvite]    = useState(false);
  const [inviteEmail,   setInviteEmail]   = useState("");
  const [inviteStatus,  setInviteStatus]  = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [inviteError,   setInviteError]   = useState("");
  const [confirm,       setConfirm]       = useState<ConfirmAction | null>(null);
  const [reportTarget,  setReportTarget]  = useState<Member | null>(null);
  const [reportReason,  setReportReason]  = useState<ReportReason | "">("");
  const [reportDesc,    setReportDesc]    = useState("");
  const [reportStatus,  setReportStatus]  = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [, startTransition]               = useTransition();

  const filtered = members.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  function changeRole(userId: string, role: MemberRole) {
    setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role } : m));
    setEditingId(null);
    startTransition(async () => {
      await fetch("/api/superadmin/org-members", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "changeRole", organizationId, userId, role }),
      });
    });
  }

  function executeAction() {
    if (!confirm) return;
    const { type, member } = confirm;
    setConfirm(null);

    if (type === "remove") {
      setMembers((prev) => prev.filter((m) => m.membershipId !== member.membershipId));
      startTransition(async () => {
        await fetch(`/api/admin/members/${member.membershipId}`, { method: "DELETE" });
      });
    } else {
      const ban = type === "ban";
      setMembers((prev) =>
        prev.map((m) => m.membershipId === member.membershipId ? { ...m, isBanned: ban } : m),
      );
      startTransition(async () => {
        await fetch(`/api/admin/members/${member.membershipId}/ban`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ ban }),
        });
      });
    }
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportTarget || !reportReason) return;
    setReportStatus("sending");
    const res = await fetch("/api/admin/reports", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        reportedUserId: reportTarget.userId,
        organizationId,
        reason:      reportReason,
        description: reportDesc.trim() || undefined,
      }),
    });
    if (res.ok) {
      setReportStatus("ok");
      setTimeout(() => { setReportTarget(null); setReportReason(""); setReportDesc(""); setReportStatus("idle"); }, 1500);
    } else {
      setReportStatus("error");
    }
  }

  async function cancelInvitation(token: string) {
    setInvitations((prev) => prev.filter((inv) => inv.id !== token));
    await fetch(`/api/invitations/${token}`, { method: "DELETE" }).catch(() => null);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteStatus("sending");
    setInviteError("");
    const res = await fetch("/api/invitations", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: inviteEmail.trim(), organizationId }),
    });
    if (res.ok) {
      const data = await res.json() as { token?: string };
      setInvitations((prev) => [{
        id:        data.token ?? crypto.randomUUID(),
        email:     inviteEmail.trim().toLowerCase(),
        role:      "MEMBER",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, ...prev]);
      setInviteStatus("ok");
      setInviteEmail("");
      setTimeout(() => { setInviteStatus("idle"); setShowInvite(false); }, 1500);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setInviteError(data.error ?? "Noe gikk galt");
      setInviteStatus("error");
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="px-4 py-5 md:px-8 md:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Brukere</h1>
        <button
          onClick={() => { setShowInvite(true); setInviteStatus("idle"); setInviteError(""); }}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
        >
          <UserPlus className="h-4 w-4" />
          Inviter bruker
        </button>
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          type="text"
          placeholder="Søk etter navn eller e-post…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
        />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden mb-4 space-y-2">
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-500">Ingen brukere funnet.</p>
        )}
        {filtered.map((user) => (
          <div
            key={user.userId}
            className={`rounded-xl border border-zinc-800 bg-zinc-900 p-3 ${user.isBanned ? "opacity-60" : ""}`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-sm font-medium text-white">{user.name}</span>
                {user.username && (
                  <span className="ml-1.5 font-mono text-xs text-zinc-500">@{user.username}</span>
                )}
                {user.isBanned && (
                  <span className="ml-1.5 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">Blokkert</span>
                )}
                <p className="mt-0.5 truncate text-xs text-zinc-500">{user.email}</p>
              </div>
              {editingId === user.userId && !user.isMe ? (
                <select
                  autoFocus
                  value={user.role}
                  onChange={(e) => changeRole(user.userId, e.target.value as MemberRole)}
                  onBlur={() => setEditingId(null)}
                  className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white outline-none"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              ) : (
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[user.role]}`}>
                  {ROLE_LABEL[user.role]}
                </span>
              )}
            </div>
            {user.isMe && <span className="text-xs text-zinc-600">Det er deg</span>}
            {!user.isMe && user.role !== "OWNER" && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setEditingId(user.userId)}
                  className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  Rolle
                </button>
                {user.isBanned ? (
                  <button
                    onClick={() => setConfirm({ type: "unban", member: user })}
                    className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                  >
                    Opphev
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirm({ type: "ban", member: user })}
                    className="rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
                  >
                    🚫 Blokker
                  </button>
                )}
                <button
                  onClick={() => setConfirm({ type: "remove", member: user })}
                  className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700"
                >
                  🗑️ Fjern
                </button>
                <button
                  onClick={() => { setReportTarget(user); setReportReason(""); setReportDesc(""); setReportStatus("idle"); }}
                  className="rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                >
                  ⚠️ Rapporter
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Navn</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden sm:table-cell">E-post</th>
              <th className="px-5 py-3 text-left font-medium text-zinc-500">Rolle</th>
              <th className="px-5 py-3 text-right font-medium text-zinc-500">Handlinger</th>
            </tr>
          </thead>
          <tbody className="bg-zinc-950">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-zinc-500">
                  Ingen brukere funnet.
                </td>
              </tr>
            )}
            {filtered.map((user, i) => (
              <tr
                key={user.userId}
                className={`transition-colors hover:bg-zinc-900 ${i < filtered.length - 1 ? "border-b border-zinc-800" : ""} ${user.isBanned ? "opacity-60" : ""}`}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="font-medium text-white">{user.name}</span>
                      {user.username && (
                        <span className="ml-1.5 font-mono text-xs text-zinc-500">@{user.username}</span>
                      )}
                    </div>
                    {user.isBanned && (
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">Blokkert</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-zinc-400 hidden sm:table-cell">{user.email}</td>
                <td className="px-5 py-4">
                  {editingId === user.userId && !user.isMe ? (
                    <select
                      autoFocus
                      value={user.role}
                      onChange={(e) => changeRole(user.userId, e.target.value as MemberRole)}
                      onBlur={() => setEditingId(null)}
                      className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white outline-none"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[user.role]}`}>
                      {ROLE_LABEL[user.role]}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1.5">
                    {!user.isMe && user.role !== "OWNER" && (
                      <>
                        <button
                          onClick={() => setEditingId(user.userId)}
                          className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                        >
                          Rolle
                        </button>
                        {user.isBanned ? (
                          <button
                            onClick={() => setConfirm({ type: "unban", member: user })}
                            className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                          >
                            Opphev
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirm({ type: "ban", member: user })}
                            className="rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
                          >
                            🚫 Blokker
                          </button>
                        )}
                        <button
                          onClick={() => setConfirm({ type: "remove", member: user })}
                          className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700"
                        >
                          🗑️ Fjern
                        </button>
                        <button
                          onClick={() => { setReportTarget(user); setReportReason(""); setReportDesc(""); setReportStatus("idle"); }}
                          className="rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                        >
                          ⚠️ Rapporter
                        </button>
                      </>
                    )}
                    {user.isMe && (
                      <span className="text-xs text-zinc-600">Det er deg</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-400">
            <Clock className="h-4 w-4" />
            Ventende invitasjoner ({invitations.length})
          </h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-5 py-3 text-left font-medium text-zinc-500">E-post</th>
                  <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden sm:table-cell">Utløper</th>
                  <th className="px-5 py-3 text-right font-medium text-zinc-500">Handlinger</th>
                </tr>
              </thead>
              <tbody className="bg-zinc-950">
                {invitations.map((inv, i) => (
                  <tr key={inv.id} className={`transition-colors hover:bg-zinc-900 ${i < invitations.length - 1 ? "border-b border-zinc-800" : ""}`}>
                    <td className="px-5 py-3 text-zinc-300">{inv.email}</td>
                    <td className="px-5 py-3 text-zinc-500 hidden sm:table-cell text-xs">{formatDate(inv.expiresAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => cancelInvitation(inv.id)}
                        className="rounded-md bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
                      >
                        Avbryt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-2 flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-semibold text-white">
                {confirm.type === "ban"    && "Blokker bruker"}
                {confirm.type === "unban"  && "Opphev blokkering"}
                {confirm.type === "remove" && "Fjern bruker"}
              </h3>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {confirm.type === "ban"    && `Blokker ${confirm.member.name} fra denne organisasjonen?`}
              {confirm.type === "unban"  && `Opphev blokkeringen for ${confirm.member.name}?`}
              {confirm.type === "remove" && `Fjern ${confirm.member.name} fra organisasjonen? Dette kan ikke angres.`}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Avbryt
              </button>
              <button
                onClick={executeAction}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors ${
                  confirm.type === "unban" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {confirm.type === "ban"    && "🚫 Blokker"}
                {confirm.type === "unban"  && "Opphev"}
                {confirm.type === "remove" && "🗑️ Fjern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">⚠️ Rapporter {reportTarget.name}</h3>
              <button onClick={() => setReportTarget(null)} className="text-zinc-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitReport} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Årsak <span className="text-rose-400">*</span></label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as ReportReason)}
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                >
                  <option value="">Velg årsak…</option>
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Beskrivelse <span className="text-zinc-600">(valgfritt, maks 500 tegn)</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Beskriv kort hva som skjedde…"
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
                />
                <p className="mt-1 text-right text-xs text-zinc-600">{reportDesc.length}/500</p>
              </div>
              {reportStatus === "error" && (
                <p className="text-xs text-rose-400">Noe gikk galt. Prøv igjen.</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={!reportReason || reportStatus === "sending"}
                  className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
                >
                  {reportStatus === "sending" ? "Sender…" : reportStatus === "ok" ? "Sendt!" : "Send rapport"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Inviter nytt medlem</h3>
              <button onClick={() => setShowInvite(false)} className="text-zinc-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">E-postadresse</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="navn@eksempel.no"
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-500"
                />
              </div>
              <p className="text-xs text-zinc-500">Brukeren vil motta en e-post med invitasjonslenke.</p>
              {inviteError && <p className="text-sm text-rose-400">{inviteError}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={inviteStatus === "sending"}
                  className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                >
                  {inviteStatus === "sending" ? "Sender…" : inviteStatus === "ok" ? "Sendt!" : "Send invitasjon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
