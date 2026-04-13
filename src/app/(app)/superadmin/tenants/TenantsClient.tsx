"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, MoreHorizontal, ArrowRight, Users, FileText,
  Copy, Eye, Trash2, Settings, ChevronLeft, ChevronRight, X, Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tenant {
  id:          string;
  name:        string;
  slug:        string;
  type:        "COMPANY" | "COMMUNITY";
  plan:        "FREE" | "PRO" | "ENTERPRISE";
  createdAt:   string;
  _count:      { memberships: number; posts: number };
  theme:       { logoUrl: string | null; bannerUrl: string | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").slice(0, 40);
}

const TYPE_LABELS: Record<string, string> = { COMPANY: "Bedrift", COMMUNITY: "Community" };
const PLAN_STYLES: Record<string, string> = {
  FREE:       "bg-zinc-500/15 text-zinc-400",
  PRO:        "bg-violet-500/15 text-violet-400",
  ENTERPRISE: "bg-amber-500/15 text-amber-400",
};

// ─── Three-dot menu ───────────────────────────────────────────────────────────

function ThreeDotMenu({
  tenant,
  onEdit,
  onDelete,
}: {
  tenant: Tenant;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-9 z-50 w-48 overflow-hidden rounded-xl py-1 shadow-xl"
          style={{ background: "#18181f", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-white transition-colors hover:bg-white/5"
          >
            <Settings className="h-4 w-4 text-zinc-400" /> Rediger tenant
          </button>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(tenant.slug);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-white transition-colors hover:bg-white/5"
          >
            <Copy className="h-4 w-4 text-zinc-400" /> Kopier slug
          </button>
          <Link
            href={`/${tenant.slug}/feed?sa=1`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-white transition-colors hover:bg-white/5"
          >
            <Eye className="h-4 w-4 text-zinc-400" /> Se som bruker
          </Link>
          <div className="my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }} />
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" /> Slett tenant
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tenant Card ──────────────────────────────────────────────────────────────

function TenantCard({
  tenant,
  onEdit,
  onDelete,
}: {
  tenant: Tenant;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const bannerStyle = tenant.theme?.bannerUrl
    ? { backgroundImage: `url(${tenant.theme.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "top" }
    : { background: tenant.type === "COMMUNITY"
        ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
        : "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)" };

  return (
    <div
      className="overflow-hidden rounded-xl transition-all"
      style={{ background: "#12121e", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Banner */}
      <div className="relative h-20 w-full" style={bannerStyle}>
        {/* Three-dot menu */}
        <div className="absolute right-2 top-2">
          <ThreeDotMenu tenant={tenant} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Logo */}
          <div className="shrink-0">
            {tenant.theme?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.theme.logoUrl} alt="" className="h-10 w-10 rounded-lg border object-cover" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-base font-bold text-white"
                style={{ background: tenant.type === "COMMUNITY" ? "#6c47ff" : "#1d4ed8" }}
              >
                {tenant.name[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Name + slug + badges */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{tenant.name}</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>/{tenant.slug}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={tenant.type === "COMMUNITY"
                  ? { background: "rgba(139,92,246,0.15)", color: "#a78bfa" }
                  : { background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
              >
                {TYPE_LABELS[tenant.type]}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PLAN_STYLES[tenant.plan]}`}>
                {tenant.plan}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {tenant._count.memberships.toLocaleString("nb-NO")} medlemmer
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {tenant._count.posts.toLocaleString("nb-NO")} innlegg
          </span>
          <span className="ml-auto text-[10px]">
            {formatDate(tenant.createdAt)}
          </span>
        </div>

        {/* Administrer */}
        <div className="mt-3 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <Link
            href={`/superadmin/tenants/${tenant.id}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors hover:text-white"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Administrer <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteDialog({
  tenant,
  onClose,
  onDeleted,
}: {
  tenant: Tenant;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [input,    setInput]    = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");
  const confirmed = input === tenant.slug;

  async function handleDelete() {
    if (!confirmed || deleting) return;
    setDeleting(true);
    const res = await fetch(`/api/superadmin/orgs/${tenant.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted(tenant.id);
      onClose();
    } else {
      const body = await res.json() as { error?: string };
      setError(body.error ?? "Noe gikk galt");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: "#12121e", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-lg font-bold text-white">Slett {tenant.name}?</h3>
        <p className="mb-4 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          Dette sletter alle data permanent. Skriv inn{" "}
          <strong className="text-white">{tenant.slug}</strong> for å bekrefte.
        </p>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={tenant.slug}
          className="mb-4 w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />
        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg py-2.5 text-sm transition-colors hover:text-white"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
          >
            Avbryt
          </button>
          <button
            onClick={() => void handleDelete()}
            disabled={!confirmed || deleting}
            className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: confirmed ? "#dc2626" : "#7f1d1d" }}
          >
            {deleting ? "Sletter…" : "Slett permanent"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Tenant Modal ─────────────────────────────────────────────────────────

interface NewTenantForm {
  name:    string;
  slug:    string;
  type:    "COMMUNITY" | "COMPANY";
  plan:    "FREE" | "PRO" | "ENTERPRISE";
  ownerId: string;
  ownerSearch: string;
}

function NewTenantModal({
  onClose,
  onCreated,
}: {
  onClose:   () => void;
  onCreated: (t: Tenant) => void;
}) {
  const [step,    setStep]    = useState<1 | 2 | 3>(1);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState<NewTenantForm>({
    name: "", slug: "", type: "COMMUNITY", plan: "FREE", ownerId: "", ownerSearch: "",
  });
  const [userResults, setUserResults] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [ownerName,   setOwnerName]   = useState("");

  // Auto-slug from name
  useEffect(() => {
    if (form.name) setForm((f) => ({ ...f, slug: slugify(f.name) }));
  }, [form.name]);

  // Search users
  useEffect(() => {
    if (form.ownerSearch.length < 2) { setUserResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/superadmin/users/search?q=${encodeURIComponent(form.ownerSearch)}`);
      if (res.ok) {
        const data = await res.json() as { users: { id: string; name: string | null; email: string }[] };
        setUserResults(data.users.slice(0, 5));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [form.ownerSearch]);

  async function handleCreate() {
    if (saving) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/superadmin/tenants", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:    form.name,
        slug:    form.slug,
        type:    form.type,
        plan:    form.plan,
        ownerId: form.ownerId || undefined,
      }),
    });
    const data = await res.json() as { org?: Tenant; error?: string };
    if (!res.ok) { setError(data.error ?? "Noe gikk galt"); setSaving(false); return; }
    if (data.org) onCreated(data.org as Tenant);
    onClose();
  }

  const slugValid = /^[a-z0-9-]+$/.test(form.slug);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl"
        style={{ background: "#12121e", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div>
            <h3 className="text-base font-bold text-white">Ny tenant</h3>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Steg {step} av 3</p>
          </div>
          <button onClick={onClose} style={{ color: "rgba(255,255,255,0.4)" }} className="hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-6 pt-4">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full transition-all"
              style={{ background: s <= step ? "#6c47ff" : "rgba(255,255,255,0.1)" }}
            />
          ))}
        </div>

        {/* Step 1 — Grunninfo */}
        {step === 1 && (
          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Navn *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Community-navn"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Slug *</label>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>intraa.net/</span>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  placeholder="min-slug"
                  className="flex-1 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${form.slug && !slugValid ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                  }}
                />
              </div>
              {form.slug && !slugValid && <p className="mt-1 text-xs text-red-400">Kun a-z, 0-9 og bindestrek</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Type *</label>
              <div className="grid grid-cols-2 gap-3">
                {(["COMMUNITY", "COMPANY"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className="rounded-xl py-3 text-sm font-medium transition-all"
                    style={form.type === t
                      ? { background: "rgba(108,71,255,0.2)", border: "1px solid #6c47ff", color: "#a78bfa" }
                      : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Eier (søk bruker)</label>
              <div className="relative">
                <input
                  value={form.ownerSearch}
                  onChange={(e) => setForm((f) => ({ ...f, ownerSearch: e.target.value }))}
                  placeholder="Navn eller e-post…"
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                {ownerName && (
                  <div className="mt-1 flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs text-emerald-400">{ownerName}</span>
                  </div>
                )}
                {userResults.length > 0 && !ownerName && (
                  <div
                    className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl py-1 shadow-xl"
                    style={{ background: "#18181f", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    {userResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => { setForm((f) => ({ ...f, ownerId: u.id, ownerSearch: "" })); setOwnerName(u.name ?? u.email); setUserResults([]); }}
                        className="flex w-full flex-col px-3 py-2 text-left text-sm text-white hover:bg-white/5"
                      >
                        {u.name ?? "Ukjent"} <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Plan */}
        {step === 2 && (
          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Plan</label>
              <div className="grid grid-cols-3 gap-3">
                {(["FREE", "PRO", "ENTERPRISE"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setForm((f) => ({ ...f, plan: p }))}
                    className="rounded-xl py-3 text-sm font-medium transition-all"
                    style={form.plan === p
                      ? { background: "rgba(108,71,255,0.2)", border: "1px solid #6c47ff", color: "#a78bfa" }
                      : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-medium text-white mb-2">Features som opprettes automatisk:</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {form.type === "COMMUNITY"
                  ? "Feed, Rangering, Konkurranser, Lojalitet, Chat, Abonnement"
                  : "Feed, Chat, Tickets, Kalender, Oppgaver, Filer, Medlemmer, Live"}
              </p>
            </div>
          </div>
        )}

        {/* Step 3 — Bekreft */}
        {step === 3 && (
          <div className="px-6 py-5">
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-sm font-semibold text-white">Oppsummering</p>
              {[
                ["Navn",   form.name],
                ["Slug",   `/${form.slug}`],
                ["Type",   TYPE_LABELS[form.type]],
                ["Plan",   form.plan],
                ["Eier",   ownerName || "Superadmin (deg selv)"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>{k}</span>
                  <span className="font-medium text-white">{v}</span>
                </div>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 border-t px-6 py-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm transition-colors hover:text-white"
              style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
            >
              <ChevronLeft className="h-4 w-4" /> Forrige
            </button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as 2 | 3)}
              disabled={!form.name.trim() || !form.slug || !slugValid}
              className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40 hover:brightness-110"
              style={{ background: "#6c47ff" }}
            >
              Neste <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => void handleCreate()}
              disabled={saving || !form.name.trim() || !slugValid}
              className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40 hover:brightness-110"
              style={{ background: "#6c47ff" }}
            >
              {saving ? "Oppretter…" : "Opprett tenant"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TenantsClient({ initialTenants }: { initialTenants: Tenant[] }) {
  const router = useRouter();
  const [tenants,      setTenants]      = useState<Tenant[]>(initialTenants);
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState<"ALL" | "COMMUNITY" | "COMPANY">("ALL");
  const [sortBy,       setSortBy]       = useState<"newest" | "oldest" | "members" | "name">("newest");
  const [showNew,      setShowNew]      = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);

  const filtered = tenants
    .filter((t) => {
      if (typeFilter !== "ALL" && t.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "members") return b._count.memberships - a._count.memberships;
      return a.name.localeCompare(b.name, "nb");
    });

  function handleDeleted(id: string) {
    setTenants((prev) => prev.filter((t) => t.id !== id));
  }

  function handleCreated(t: Tenant) {
    setTenants((prev) => [t, ...prev]);
  }

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tenants</h1>
          <p className="mt-0.5 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            {tenants.length} organisasjoner på plattformen
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
          style={{ background: "#6c47ff", boxShadow: "0 4px 16px rgba(108,71,255,0.35)" }}
        >
          <Plus className="h-4 w-4" /> Ny tenant
        </button>
      </div>

      {/* Search + filter */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div
          className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 min-w-[200px]"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk på navn eller slug…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded-xl px-3 py-2.5 text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <option value="ALL">Alle typer</option>
          <option value="COMMUNITY">Community</option>
          <option value="COMPANY">Bedrift</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-xl px-3 py-2.5 text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <option value="newest">Nyeste først</option>
          <option value="oldest">Eldste først</option>
          <option value="members">Flest medlemmer</option>
          <option value="name">Navn A-Å</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            {search || typeFilter !== "ALL" ? "Ingen tenants matcher filteret." : "Ingen tenants ennå."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {filtered.map((t) => (
            <TenantCard
              key={t.id}
              tenant={t}
              onEdit={() => router.push(`/superadmin/tenants/${t.id}`)}
              onDelete={() => setDeleteTarget(t)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showNew      && <NewTenantModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}
      {deleteTarget && <DeleteDialog tenant={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} />}
    </div>
  );
}
