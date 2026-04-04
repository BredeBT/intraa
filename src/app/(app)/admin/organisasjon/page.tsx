"use client";

import { useState } from "react";

type OrgType = "Bedrift" | "Community";

export default function OrganisasjonPage() {
  const [form, setForm] = useState({
    name: "Intraa AS",
    slug: "intraa-as",
    type: "Bedrift" as OrgType,
    logoUrl: "",
  });
  const [saved, setSaved] = useState(false);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Ingen ekte lagring ennå
    setSaved(true);
  }

  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Organisasjonsinnstillinger</h1>

      <form onSubmit={handleSave} className="max-w-lg space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-400">
            Organisasjonsnavn
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-400">
            Slug
          </label>
          <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 focus-within:border-indigo-500 transition-colors">
            <span className="mr-1 text-sm text-zinc-600">intraa.net/</span>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => handleChange("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              className="flex-1 bg-transparent text-sm text-white outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-400">
            Type
          </label>
          <div className="flex gap-3">
            {(["Bedrift", "Community"] as OrgType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleChange("type", t)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  form.type === t
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-400">
            Logo-URL
          </label>
          <input
            type="url"
            value={form.logoUrl}
            onChange={(e) => handleChange("logoUrl", e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Lagre endringer
          </button>
          {saved && (
            <span className="text-sm text-emerald-400">Lagret!</span>
          )}
        </div>
      </form>
    </div>
  );
}
