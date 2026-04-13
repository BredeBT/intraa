"use client";

import { useState } from "react";
import { SUPERADMIN_FEATURE_GROUPS } from "@/lib/featureGroups";

function Toggle({
  checked,
  saving,
  onToggle,
}: {
  checked:  boolean;
  saving:   boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={saving}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none disabled:opacity-60"
      style={{ background: checked ? "#059669" : "rgba(255,255,255,0.12)" }}
      aria-label={checked ? "Deaktiver" : "Aktiver"}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(24px)" : "translateX(4px)" }}
      />
    </button>
  );
}

export default function FeatureToggles({
  orgId,
  initial,
}: {
  orgId:   string;
  initial: { feature: string; enabled: boolean }[];
}) {
  const [features, setFeatures] = useState<Record<string, boolean>>(
    () => Object.fromEntries(initial.map((f) => [f.feature, f.enabled]))
  );
  const [saving,  setSaving]  = useState<Record<string, boolean>>({});
  const [toasts,  setToasts]  = useState<{ id: number; key: string; ok: boolean }[]>([]);
  let   toastId = 0;

  function showToast(key: string, ok: boolean) {
    const id = ++toastId;
    setToasts((t) => [...t, { id, key, ok }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }

  async function handleToggle(featureKey: string) {
    const next = !features[featureKey];
    setFeatures((prev) => ({ ...prev, [featureKey]: next }));
    setSaving((prev) => ({ ...prev, [featureKey]: true }));

    try {
      const res = await fetch("/api/superadmin/features", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orgId, feature: featureKey, enabled: next }),
      });
      if (!res.ok) throw new Error();
      showToast(featureKey, true);
    } catch {
      // Revert
      setFeatures((prev) => ({ ...prev, [featureKey]: !next }));
      showToast(featureKey, false);
    } finally {
      setSaving((prev) => ({ ...prev, [featureKey]: false }));
    }
  }

  return (
    <div className="space-y-8">
      {SUPERADMIN_FEATURE_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-3">
            <h3
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {group.label}
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
              {group.desc}
            </p>
          </div>
          <div
            className="overflow-hidden rounded-xl"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {group.features.map((feature, i) => {
              const enabled = features[feature.key] ?? false;
              const isBusy  = saving[feature.key] ?? false;
              const isLast  = i === group.features.length - 1;
              const toast   = toasts.find((t) => t.key === feature.key);
              return (
                <div
                  key={feature.key}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors"
                  style={{
                    background:  "rgba(255,255,255,0.03)",
                    borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{feature.label}</p>
                    {feature.desc && (
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {feature.desc}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {toast && (
                      <span
                        className="text-xs font-medium"
                        style={{ color: toast.ok ? "#34d399" : "#f87171" }}
                      >
                        {toast.ok ? "Lagret" : "Feil"}
                      </span>
                    )}
                    {isBusy && (
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                        …
                      </span>
                    )}
                    <Toggle
                      checked={enabled}
                      saving={isBusy}
                      onToggle={() => handleToggle(feature.key)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
