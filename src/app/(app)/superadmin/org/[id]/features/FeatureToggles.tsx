"use client";

import { useState } from "react";
import { FEATURE_LABELS } from "@/lib/features";
import type { Feature } from "@/lib/features";

interface FeatureRow {
  id:      string;
  feature: string;
  enabled: boolean;
}

export default function FeatureToggles({ orgId, initial }: { orgId: string; initial: FeatureRow[] }) {
  const [features, setFeatures] = useState(initial);
  const [saving,   setSaving]   = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  async function toggle(feature: string, enabled: boolean) {
    setSaving(feature);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/features", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orgId, feature, enabled }),
      });
      if (!res.ok) throw new Error("Feil ved lagring");
      setFeatures((prev) =>
        prev.map((f) => (f.feature === feature ? { ...f, enabled } : f))
      );
    } catch {
      setError("Kunne ikke lagre endring");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-2 text-sm text-red-400">{error}</p>
      )}
      {features.map(({ feature, enabled }) => {
        const label = FEATURE_LABELS[feature as Feature] ?? feature;
        const busy  = saving === feature;
        return (
          <div
            key={feature}
            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4"
          >
            <div>
              <p className="font-medium text-white">{label}</p>
              <p className="text-xs text-zinc-500">{feature}</p>
            </div>
            <button
              disabled={busy}
              onClick={() => toggle(feature, !enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                enabled ? "bg-indigo-600" : "bg-zinc-700"
              }`}
              aria-label={enabled ? "Deaktiver" : "Aktiver"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
