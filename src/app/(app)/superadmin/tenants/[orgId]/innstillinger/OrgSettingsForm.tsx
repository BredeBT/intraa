"use client";

import { useState } from "react";

const PLANS = ["FREE", "PRO", "ENTERPRISE"] as const;

export default function OrgSettingsForm({
  org,
}: {
  org: { id: string; name: string; slug: string; plan: string };
}) {
  const [name,   setName]   = useState(org.name);
  const [slug,   setSlug]   = useState(org.slug);
  const [plan,   setPlan]   = useState(org.plan);
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/superadmin/orgs/${org.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, slug, plan }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Ukjent feil");
      }
      setMsg({ ok: true, text: "Endringer lagret." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Feil ved lagring" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-5">
      {msg && (
        <p className={`rounded-lg border px-4 py-2 text-sm ${msg.ok ? "border-emerald-800 bg-emerald-900/30 text-emerald-400" : "border-red-800 bg-red-900/30 text-red-400"}`}>
          {msg.text}
        </p>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-400">Navn</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-400">Slug</label>
        <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2">
          <span className="mr-1 text-sm text-zinc-500">/</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            required
            className="flex-1 bg-transparent text-sm text-white focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-400">Plan</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {saving ? "Lagrer…" : "Lagre endringer"}
      </button>
    </form>
  );
}
