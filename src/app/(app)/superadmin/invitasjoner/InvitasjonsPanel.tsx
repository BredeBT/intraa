"use client";

import { useState, useTransition } from "react";
import { Mail, Send, Copy, Check, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";

interface Org { id: string; name: string; slug: string; }

interface Invitation {
  id:           string;
  email:        string;
  role:         "ADMIN" | "MEMBER";
  status:       "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  token:        string;
  expiresAt:    Date;
  usedAt:       Date | null;
  createdAt:    Date;
  organization: { name: string };
  invitedBy:    { name: string | null };
}

interface Props {
  orgs:               Org[];
  initialInvitations: Invitation[];
}

const STATUS_STYLES = {
  PENDING:  "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  ACCEPTED: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  DECLINED: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  EXPIRED:  "bg-zinc-700/50 text-zinc-500",
};

const STATUS_ICONS = {
  PENDING:  Clock,
  ACCEPTED: CheckCircle,
  DECLINED: XCircle,
  EXPIRED:  XCircle,
};

const STATUS_LABELS = {
  PENDING:  "Venter",
  ACCEPTED: "Akseptert",
  DECLINED: "Avslått",
  EXPIRED:  "Utløpt",
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export default function InvitasjonsPanel({ orgs, initialInvitations }: Props) {
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [email,       setEmail]       = useState("");
  const [orgId,       setOrgId]       = useState(orgs[0]?.id ?? "");
  const [role,        setRole]        = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [error,       setError]       = useState("");
  const [sentUrl,     setSentUrl]     = useState("");
  const [copied,      setCopied]      = useState(false);
  const [isPending,   startTransition] = useTransition();

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSentUrl("");

    startTransition(async () => {
      const res = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, organizationId: orgId, role }),
      });
      const data = await res.json() as { inviteUrl?: string; error?: string; token?: string };

      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt");
        return;
      }

      setSentUrl(data.inviteUrl ?? "");
      setEmail("");

      // Reload invitations from server — optimistic row
      const org = orgs.find((o) => o.id === orgId);
      const optimistic: Invitation = {
        id:           `opt-${Date.now()}`,
        email,
        role,
        status:       "PENDING",
        token:        data.token ?? "",
        expiresAt:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        usedAt:       null,
        createdAt:    new Date(),
        organization: { name: org?.name ?? "" },
        invitedBy:    { name: "Deg" },
      };
      setInvitations((prev) => [optimistic, ...prev]);
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(sentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete(id: string, token: string) {
    setInvitations((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/invitations/${token}`, { method: "DELETE" }).catch(() => null);
  }

  return (
    <div className="px-8 py-8">
      <h1 className="mb-1 text-xl font-semibold text-white">Invitasjoner</h1>
      <p className="mb-8 text-sm text-zinc-500">Send invitasjonskoblinger til nye brukere.</p>

      {/* Send form */}
      <div className="mb-8 max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">Send ny invitasjon</h2>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">E-postadresse</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bruker@example.com"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Organisasjon</label>
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Rolle</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="MEMBER">Medlem</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || !email || !orgId}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {isPending ? "Sender…" : "Send invitasjon"}
          </button>
        </form>

        {/* Invite link result */}
        {sentUrl && (
          <div className="mt-4 rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-4">
            <p className="mb-2 text-xs font-semibold text-emerald-400">
              <Mail className="inline h-3.5 w-3.5 mr-1" />
              Invitasjonslenke klar — del denne med brukeren:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                {sentUrl}
              </code>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Kopiert" : "Kopier"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invitations list */}
      <h2 className="mb-3 text-sm font-semibold text-zinc-400">Sendte invitasjoner</h2>
      {invitations.length === 0 ? (
        <p className="text-sm text-zinc-600">Ingen invitasjoner sendt ennå.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-5 py-3 text-left font-medium text-zinc-500">E-post</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden sm:table-cell">Organisasjon</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Rolle</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500">Status</th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500 hidden md:table-cell">Utløper</th>
                <th className="px-5 py-3 text-right font-medium text-zinc-500"></th>
              </tr>
            </thead>
            <tbody className="bg-zinc-950">
              {invitations.map((inv, i) => {
                const StatusIcon = STATUS_ICONS[inv.status];
                return (
                  <tr
                    key={inv.id}
                    className={`transition-colors hover:bg-zinc-900 ${i < invitations.length - 1 ? "border-b border-zinc-800" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                        <span className="font-medium text-white">{inv.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-400 hidden sm:table-cell">{inv.organization.name}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        inv.role === "ADMIN"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-zinc-700/50 text-zinc-400"
                      }`}>
                        {inv.role === "ADMIN" ? "Admin" : "Medlem"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-500 hidden md:table-cell">
                      {formatDate(inv.expiresAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {inv.status === "PENDING" && (
                        <button
                          onClick={() => handleDelete(inv.id, inv.token)}
                          className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400"
                          title="Avbryt invitasjon"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
