"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Building2, AlertCircle } from "lucide-react";
import { createOrganization } from "@/server/actions/organizations";

interface Props {
  onClose: () => void;
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function NyOrgModal({ onClose }: Props) {
  const [name,       setName]       = useState("");
  const [slug,       setSlug]       = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [type,       setType]       = useState<"COMPANY" | "COMMUNITY">("COMPANY");
  const [plan,       setPlan]       = useState<"FREE" | "PRO" | "ENTERPRISE">("FREE");
  const [error,      setError]      = useState("");
  const [isPending,  startTransition] = useTransition();

  // Auto-generate slug from name unless user has edited it manually
  useEffect(() => {
    if (!slugEdited) setSlug(toSlug(name));
  }, [name, slugEdited]);

  function handleSlugChange(val: string) {
    setSlugEdited(true);
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createOrganization(name, slug, type, plan);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Ny organisasjon</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Navn</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme AS"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Slug (URL)</label>
            <div className="flex items-center overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
              <span className="select-none border-r border-zinc-700 px-3 py-2 text-sm text-zinc-500">/org/</span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="acme-as"
                className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Type + Plan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "COMPANY" | "COMMUNITY")}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="COMPANY">Bedrift</option>
                <option value="COMMUNITY">Community</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as "FREE" | "PRO" | "ENTERPRISE")}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="FREE">Free</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim() || !slug.trim()}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {isPending ? "Oppretter…" : "Opprett organisasjon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
