"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users, FileText, MessageSquare, Hash,
  Pencil, Check, X, Eye, Copy, Download,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Org {
  id:          string;
  name:        string;
  slug:        string;
  plan:        "FREE" | "PRO" | "ENTERPRISE";
  type:        string;
  description: string | null;
  createdAt:   string;
}

interface Stats {
  members:  number;
  posts:    number;
  messages: number;
  channels: number;
}

interface Props {
  org:   Org;
  stats: Stats;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-2xl"
      style={{
        background: type === "success" ? "#16a34a" : "#dc2626",
        border: `1px solid ${type === "success" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
      }}
    >
      {type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      {msg}
    </div>
  );
}

// ─── Inline editable field ────────────────────────────────────────────────────

function InlineField({
  label,
  value,
  children,
  onEdit,
  editing,
}: {
  label:    string;
  value:    React.ReactNode;
  children: React.ReactNode;
  onEdit:   () => void;
  editing:  boolean;
}) {
  return (
    <div
      className="group flex items-center justify-between gap-4 py-3"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="text-sm shrink-0" style={{ color: "rgba(255,255,255,0.4)", width: 100 }}>{label}</span>
      <div className="flex flex-1 items-center gap-2">
        {editing ? children : (
          <>
            <span className="flex-1 text-sm text-white">{value}</span>
            <button
              onClick={onEdit}
              className="opacity-0 group-hover:opacity-100 rounded p-1 transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, bg,
}: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>;
  color: string; bg: string;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className={`mb-3 inline-flex rounded-lg p-2 ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString("nb-NO")}</p>
      <p className="mt-0.5 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
    </div>
  );
}

const PLAN_COLORS: Record<string, string> = {
  FREE:       "rgba(255,255,255,0.4)",
  PRO:        "#a78bfa",
  ENTERPRISE: "#fbbf24",
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OversiktClient({ org: initial, stats }: Props) {
  const [name,    setName]    = useState(initial.name);
  const [slug,    setSlug]    = useState(initial.slug);
  const [plan,    setPlan]    = useState<"FREE" | "PRO" | "ENTERPRISE">(initial.plan);
  const [editing, setEditing] = useState<"name" | "slug" | "plan" | null>(null);
  const [tmpName, setTmpName] = useState("");
  const [tmpSlug, setTmpSlug] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [copied,  setCopied]  = useState(false);

  const isDirty = name !== initial.name || slug !== initial.slug || plan !== initial.plan;

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const save = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/orgs/${initial.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, slug, plan }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ukjent feil");
      showToast("Lagret!", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Feil ved lagring", "error");
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, initial.id, name, slug, plan]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void save();
      }
      if (e.key === "Escape") {
        setEditing(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [save]);

  function startEdit(field: "name" | "slug" | "plan") {
    if (field === "name") setTmpName(name);
    if (field === "slug") setTmpSlug(slug);
    setEditing(field);
  }

  function cancelEdit() {
    if (editing === "name") setName(tmpName);
    if (editing === "slug") setSlug(tmpSlug);
    setEditing(null);
  }

  function confirmEdit() {
    setEditing(null);
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(`https://intraa.net/${slug}`);
    setCopied(true);
    showToast("Lenke kopiert!", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  async function exportCSV() {
    const res = await fetch(`/api/superadmin/org-members?orgId=${initial.id}`);
    if (!res.ok) { showToast("Kunne ikke eksportere", "error"); return; }
    const data = await res.json() as { members: { name: string; email: string; role: string; createdAt: string }[] };
    const rows = ["Navn,E-post,Rolle,Dato", ...data.members.map(
      (m) => `"${m.name}","${m.email}","${m.role}","${new Date(m.createdAt).toLocaleDateString("nb-NO")}"`
    )];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${slug}-members.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast("Eksportert!", "success");
  }

  const slugValid = /^[a-z0-9-]+$/.test(slug);
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Oversikt</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Nøkkelinformasjon og hurtighandlinger</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/${slug}/feed?sa=1`}
            target="_blank"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all hover:text-white"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
          >
            <Eye className="h-4 w-4" /> Se som bruker
          </Link>
          {isDirty && (
            <button
              onClick={() => void save()}
              disabled={saving || !slugValid}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
              style={{ background: "#6c47ff" }}
            >
              <Check className="h-4 w-4" />
              {saving ? "Lagrer…" : "Lagre endringer"}
            </button>
          )}
        </div>
      </div>

      {/* Stat grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Medlemmer"  value={stats.members}  icon={Users}          color="text-violet-400"  bg="bg-violet-500/10" />
        <StatCard label="Innlegg"    value={stats.posts}    icon={FileText}       color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Meldinger"  value={stats.messages} icon={MessageSquare}  color="text-blue-400"    bg="bg-blue-500/10" />
        <StatCard label="Kanaler"    value={stats.channels} icon={Hash}           color="text-amber-400"   bg="bg-amber-500/10" />
      </div>

      {/* Details — inline edit */}
      <div
        className="mb-6 rounded-xl p-5"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
          Detaljer — klikk felt for å redigere
        </p>

        {/* Name */}
        <InlineField label="Navn" value={name} editing={editing === "name"} onEdit={() => startEdit("name")}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") cancelEdit(); }}
            className="flex-1 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(108,71,255,0.5)" }}
          />
          <button onClick={confirmEdit}  className="text-emerald-400 hover:text-emerald-300"><Check className="h-4 w-4" /></button>
          <button onClick={cancelEdit}   className="text-zinc-500 hover:text-zinc-300"><X className="h-4 w-4" /></button>
        </InlineField>

        {/* Slug */}
        <InlineField label="Slug" value={`/${slug}`} editing={editing === "slug"} onEdit={() => startEdit("slug")}>
          <div className="flex flex-1 items-center gap-1">
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>intraa.net/</span>
            <input
              autoFocus
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") cancelEdit(); }}
              className="flex-1 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: `1px solid ${slugValid ? "rgba(108,71,255,0.5)" : "#ef4444"}`,
              }}
            />
          </div>
          <button onClick={confirmEdit}  className="text-emerald-400 hover:text-emerald-300"><Check className="h-4 w-4" /></button>
          <button onClick={cancelEdit}   className="text-zinc-500 hover:text-zinc-300"><X className="h-4 w-4" /></button>
        </InlineField>

        {/* Plan */}
        <InlineField
          label="Plan"
          value={<span className="font-medium" style={{ color: PLAN_COLORS[plan] }}>{plan}</span>}
          editing={editing === "plan"}
          onEdit={() => startEdit("plan")}
        >
          <select
            autoFocus
            value={plan}
            onChange={(e) => { setPlan(e.target.value as "FREE" | "PRO" | "ENTERPRISE"); confirmEdit(); }}
            onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
            className="flex-1 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(108,71,255,0.5)" }}
          >
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </select>
        </InlineField>

        {/* Type (read-only) */}
        <div className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="shrink-0 text-sm" style={{ color: "rgba(255,255,255,0.4)", width: 100 }}>Type</span>
          <span className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            {initial.type === "COMMUNITY" ? "Community" : "Bedrift"}
          </span>
        </div>

        {/* Opprettet (read-only) */}
        <div className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="shrink-0 text-sm" style={{ color: "rgba(255,255,255,0.4)", width: 100 }}>Opprettet</span>
          <span className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{formatDate(initial.createdAt)}</span>
        </div>

        {/* ID (read-only) */}
        <div className="flex items-center justify-between gap-4 py-3">
          <span className="shrink-0 text-sm" style={{ color: "rgba(255,255,255,0.4)", width: 100 }}>ID</span>
          <span className="flex-1 font-mono text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{initial.id}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div
        className="rounded-xl p-5"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
          Hurtighandlinger
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => void copyInviteLink()}
            className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-all hover:brightness-110 text-left"
            style={{ background: "rgba(108,71,255,0.1)", border: "1px solid rgba(108,71,255,0.2)", color: "#a78bfa" }}
          >
            <Copy className="h-4 w-4 shrink-0" />
            {copied ? "Kopiert!" : "Kopier invite-lenke"}
          </button>
          <button
            onClick={() => void exportCSV()}
            className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-all hover:brightness-110 text-left"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}
          >
            <Download className="h-4 w-4 shrink-0" />
            Eksporter medlemsliste (CSV)
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
        Tips: Trykk ⌘S (Mac) eller Ctrl+S for å lagre endringer
      </p>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
