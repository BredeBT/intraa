"use client";

import { useState } from "react";
import { SUPERADMIN_FEATURE_GROUPS } from "@/lib/featureGroups";

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
        checked ? "bg-emerald-600" : "bg-zinc-700"
      }`}
      aria-label={checked ? "Deaktiver" : "Aktiver"}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SaveBar({ saving, saved, onSave }: { saving: boolean; saved: boolean; onSave: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <p className="text-sm text-zinc-500">Endringer lagres ikke automatisk</p>
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {saving ? "Lagrer..." : saved ? "✓ Lagret!" : "Lagre endringer"}
      </button>
    </div>
  );
}

export default function FeatureToggles({
  orgId,
  initial,
}: {
  orgId: string;
  initial: { feature: string; enabled: boolean }[];
}) {
  const [localFeatures, setLocalFeatures] = useState<Record<string, boolean>>(
    () => Object.fromEntries(initial.map((f) => [f.feature, f.enabled]))
  );
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  function handleToggle(featureKey: string) {
    setLocalFeatures((prev) => ({ ...prev, [featureKey]: !prev[featureKey] }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const results = await Promise.all(
        Object.entries(localFeatures).map(([feature, enabled]) =>
          fetch("/api/superadmin/features", {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ orgId, feature, enabled }),
          })
        )
      );
      if (results.some((r) => !r.ok)) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Kunne ikke lagre endringer — prøv igjen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SaveBar saving={saving} saved={saved} onSave={handleSave} />

      {error && (
        <p className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="space-y-8">
        {SUPERADMIN_FEATURE_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{group.label}</h3>
              <p className="mt-0.5 text-xs text-zinc-600">{group.desc}</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-zinc-800">
              {group.features.map((feature, i) => {
                const enabled = localFeatures[feature.key] ?? false;
                const isLast  = i === group.features.length - 1;
                return (
                  <div
                    key={feature.key}
                    className={`flex items-center justify-between gap-4 bg-zinc-900 px-5 py-4 transition-colors hover:bg-zinc-800/50 ${
                      !isLast ? "border-b border-zinc-800" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white">{feature.label}</p>
                      {feature.desc && <p className="text-xs text-zinc-500">{feature.desc}</p>}
                    </div>
                    <Toggle checked={enabled} onToggle={() => handleToggle(feature.key)} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <SaveBar saving={saving} saved={saved} onSave={handleSave} />
    </div>
  );
}
