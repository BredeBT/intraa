"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DangerActions({
  orgId,
  orgName,
  action,
}: {
  orgId:   string;
  orgName: string;
  action:  "suspend" | "delete";
}) {
  const router    = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function execute() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/orgs/${orgId}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        ...(action === "suspend" ? { body: JSON.stringify({ suspended: true }) } : {}),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Feil");
      }
      if (action === "delete") {
        router.push("/superadmin/tenants");
      } else {
        setConfirm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  }

  const isDelete  = action === "delete";
  const btnStyle  = isDelete
    ? "bg-red-700 hover:bg-red-600 text-white"
    : "bg-amber-700 hover:bg-amber-600 text-white";
  const label     = isDelete ? "Slett" : "Suspender";

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${btnStyle}`}
      >
        {label} organisasjon
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-sm text-white">
        Er du sikker på at du vil <strong>{label.toLowerCase()}</strong> &laquo;{orgName}&raquo;?
        {isDelete && " All data slettes permanent."}
      </p>
      <div className="flex gap-2">
        <button
          onClick={execute}
          disabled={loading}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${btnStyle}`}
        >
          {loading ? "Venter…" : `Ja, ${label.toLowerCase()}`}
        </button>
        <button
          onClick={() => { setConfirm(false); setError(null); }}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}
