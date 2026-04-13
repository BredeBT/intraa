"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* ── Suspend ─────────────────────────────────────────────────────────── */
export function SuspendAction({ orgId }: { orgId: string }) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [done,    setDone]    = useState(false);

  async function suspend() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/orgs/${orgId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ suspended: true }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Feil");
      }
      setDone(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm font-medium" style={{ color: "#fbbf24" }}>
        ✓ Tenant er deaktivert
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "#b45309" }}
        >
          Deaktiver tenant
        </button>
      ) : (
        <div className="space-y-3">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            Er du sikker? Community skjules fra discovery — eksisterende medlemmer beholder tilgang.
          </p>
          <div className="flex gap-2">
            <button
              onClick={suspend}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50 hover:opacity-90"
              style={{ background: "#b45309" }}
            >
              {loading ? "Deaktiverer…" : "Ja, deaktiver"}
            </button>
            <button
              onClick={() => { setOpen(false); setError(null); }}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Delete ──────────────────────────────────────────────────────────── */
export function DeleteAction({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const router             = useRouter();
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const confirmed = input.trim() === orgSlug;

  async function del() {
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/orgs/${orgId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Feil");
      }
      router.push("/superadmin/tenants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
        Skriv inn <code className="rounded px-1 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.08)", color: "#f87171" }}>{orgSlug}</code> for å bekrefte permanent sletting.
      </p>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={orgSlug}
        className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
        style={{
          background:   "rgba(255,255,255,0.05)",
          border:       "1px solid rgba(239,68,68,0.3)",
          caretColor:   "#f87171",
        }}
      />
      <button
        onClick={del}
        disabled={!confirmed || loading}
        className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-30 hover:opacity-90"
        style={{ background: "#dc2626" }}
      >
        {loading ? "Sletter…" : "Slett permanent"}
      </button>
    </div>
  );
}

/* ── Backward-compat default export ──────────────────────────────────── */
export default function DangerActions({
  orgId,
  orgName,
  action,
}: {
  orgId:   string;
  orgName: string;
  action:  "suspend" | "delete";
}) {
  if (action === "suspend") return <SuspendAction orgId={orgId} />;
  return <DeleteAction orgId={orgId} orgSlug={orgName} />;
}
