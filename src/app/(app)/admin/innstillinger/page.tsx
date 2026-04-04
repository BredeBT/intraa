"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

type OrgType = "Bedrift" | "Community";

const ACCENT_COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Sky", value: "#0ea5e9" },
];

export default function InnstillingerPage() {
  const [form, setForm] = useState({
    name: "Intraa AS",
    slug: "intraa-as",
    type: "Bedrift" as OrgType,
    accent: "#6366f1",
  });
  const [saved, setSaved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Innstillinger</h1>

      <div className="max-w-xl space-y-6">
        {/* General */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-5 text-sm font-semibold text-white">Generelt</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">Organisasjonsnavn</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">Slug</label>
              <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 focus-within:border-indigo-500 transition-colors">
                <span className="mr-1 text-sm text-zinc-600">intraa.net/</span>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                  className="flex-1 bg-transparent text-sm text-white outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-400">Type</label>
              <div className="flex gap-3">
                {(["Bedrift", "Community"] as OrgType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      form.type === t
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500">
                Lagre endringer
              </button>
              {saved && <span className="text-sm text-emerald-400">Lagret!</span>}
            </div>
          </form>
        </section>

        {/* Accent color */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-1 text-sm font-semibold text-white">Fargetema</h2>
          <p className="mb-4 text-sm text-zinc-500">Velg accentfarge for organisasjonen.</p>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map(({ name, value }) => (
              <button
                key={value}
                title={name}
                onClick={() => setForm((f) => ({ ...f, accent: value }))}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110 ${
                  form.accent === value ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900" : ""
                }`}
                style={{ backgroundColor: value }}
              >
                {form.accent === value && (
                  <span className="text-white text-xs font-bold">✓</span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-600">Valgt: {ACCENT_COLORS.find((c) => c.value === form.accent)?.name}</p>
        </section>

        {/* Danger zone */}
        <section className="rounded-xl border border-rose-500/30 bg-zinc-900 p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <h2 className="text-sm font-semibold text-rose-400">Danger zone</h2>
          </div>
          <p className="mb-4 text-sm text-zinc-400">
            Sletting av organisasjonen er permanent og kan ikke angres. Alle brukere, filer, meldinger og tickets vil bli slettet.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/20"
          >
            Slett organisasjon
          </button>
        </section>
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
                <h3 className="text-base font-semibold text-white">Slett organisasjon</h3>
              </div>
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }} className="text-zinc-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-sm text-zinc-400">
              Skriv <span className="font-mono font-semibold text-white">{form.slug}</span> for å bekrefte sletting.
            </p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={form.slug}
              className="mb-4 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-rose-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Avbryt
              </button>
              <button
                disabled={deleteConfirm !== form.slug}
                className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Slett permanent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
