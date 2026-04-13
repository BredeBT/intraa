"use client";

import { useState, useEffect, useCallback } from "react";

const PLANS = ["FREE", "PRO", "ENTERPRISE"] as const;

interface Toast { ok: boolean; text: string }

function ToastBanner({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl"
      style={{
        background: toast.ok ? "#065f46" : "#7f1d1d",
        border:     toast.ok ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(248,113,113,0.3)",
        minWidth:   "220px",
      }}
    >
      <span style={{ color: toast.ok ? "#34d399" : "#f87171" }}>{toast.ok ? "✓" : "✗"}</span>
      {toast.text}
    </div>
  );
}

export default function OrgSettingsForm({
  org,
}: {
  org: { id: string; name: string; slug: string; plan: string; description: string | null };
}) {
  const [name,        setName]        = useState(org.name);
  const [slug,        setSlug]        = useState(org.slug);
  const [plan,        setPlan]        = useState(org.plan);
  const [description, setDescription] = useState(org.description ?? "");
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState<Toast | null>(null);

  const dismiss = useCallback(() => setToast(null), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/orgs/${org.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, slug, plan, description: description || null }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Ukjent feil");
      }
      setToast({ ok: true, text: "Endringer lagret" });
    } catch (err) {
      setToast({ ok: false, text: err instanceof Error ? err.message : "Feil ved lagring" });
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border:     "1px solid rgba(255,255,255,0.1)",
    color:      "white",
    borderRadius: "10px",
  };
  const focusClass = "focus:outline-none focus:ring-1 focus:ring-violet-500";

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-md space-y-5">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
            Navn
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={`w-full px-3 py-2 text-sm ${focusClass}`}
            style={inputStyle}
          />
        </div>

        {/* Slug */}
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
            Slug
          </label>
          <div
            className="flex items-center px-3 py-2"
            style={{ ...inputStyle, gap: 4 }}
          >
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              required
              className={`flex-1 bg-transparent text-sm ${focusClass}`}
              style={{ color: "white" }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
            Beskrivelse <span style={{ color: "rgba(255,255,255,0.25)" }}>(valgfri)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`w-full resize-none px-3 py-2 text-sm ${focusClass}`}
            style={{ ...inputStyle, lineHeight: "1.5" }}
          />
        </div>

        {/* Plan */}
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
            Plan
          </label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className={`w-full px-3 py-2 text-sm ${focusClass}`}
            style={inputStyle}
          >
            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50 hover:opacity-90"
          style={{ background: "#6c47ff" }}
        >
          {saving ? "Lagrer…" : "Lagre endringer"}
        </button>
      </form>

      {toast && <ToastBanner toast={toast} onDismiss={dismiss} />}
    </>
  );
}
