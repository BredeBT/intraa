"use client";

import { useState, useTransition } from "react";

type OrgType = "COMPANY" | "COMMUNITY";

interface Props {
  orgId:       string;
  initialName: string;
  initialSlug: string;
  initialType: OrgType;
}

export default function OrganisasjonClient({ orgId, initialName, initialSlug, initialType }: Props) {
  const [name,    setName]    = useState(initialName);
  const [slug,    setSlug]    = useState(initialSlug);
  const [type,    setType]    = useState<OrgType>(initialType);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");
  const [, startTransition]   = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/admin/organisation", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orgId, name, slug, type }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Noe gikk galt");
      }
    });
  }

  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Organisasjonsinnstillinger</h1>

      <form onSubmit={handleSave} className="max-w-lg space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-400">Organisasjonsnavn</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-400">Slug</label>
          <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 focus-within:border-indigo-500 transition-colors">
            <span className="mr-1 text-sm text-zinc-600">intraa.net/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              className="flex-1 bg-transparent text-sm text-white outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-400">Type</label>
          <div className="flex gap-3">
            {([["COMPANY", "Bedrift"], ["COMMUNITY", "Community"]] as [OrgType, string][]).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setType(val)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  type === val
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Lagre endringer
          </button>
          {saved && <span className="text-sm text-emerald-400">Lagret!</span>}
        </div>
      </form>
    </div>
  );
}
