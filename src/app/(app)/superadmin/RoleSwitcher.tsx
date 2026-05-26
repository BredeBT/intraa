"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Loader2, FlaskConical } from "lucide-react";

const ROLES = [
  { id: "FAN",     label: "Fan",     color: "#5EEAD4", bg: "rgba(94,234,212,0.15)", border: "rgba(94,234,212,0.30)" },
  { id: "CREATOR", label: "Creator", color: "#A855F7", bg: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.30)" },
  { id: "SPONSOR", label: "Sponsor", color: "#60A5FA", bg: "rgba(96,165,250,0.15)", border: "rgba(96,165,250,0.30)" },
] as const;

/**
 * Quick-bytte av egen rolle for testing — bare synlig for superadmin.
 * Endrer userType + oppretter SponsorProfile hvis SPONSOR-rollen velges.
 * Logger deretter ut + inn for at session-JWT skal speile ny rolle.
 */
export default function RoleSwitcher() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function switchTo(userType: string) {
    setBusy(userType);
    setResult(null);
    try {
      const r = await fetch("/api/superadmin/me/switch-role", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userType }),
      });
      const data = await r.json() as { ok?: boolean; nextHref?: string; error?: string };
      if (!r.ok || !data.ok) {
        setResult(data.error ?? "Noe gikk galt");
        setBusy(null);
        return;
      }
      // Logg ut + inn så JWT oppdateres med ny rolle. NextAuth har en update()-
      // metode, men det er enklere å bare bruke signOut + redirect.
      setResult("Bytter rolle — logger ut for å oppdatere session…");
      setTimeout(async () => {
        await signOut({ redirect: false });
        router.push(`/login?next=${encodeURIComponent(data.nextHref ?? "/home")}`);
      }, 800);
    } catch (err) {
      setResult("Kunne ikke bytte rolle — " + String(err));
      setBusy(null);
    }
  }

  return (
    <div
      className="mb-6 rounded-xl p-4"
      style={{
        background: "rgba(168,85,247,0.06)",
        border:     "1px solid rgba(168,85,247,0.25)",
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <FlaskConical className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#A855F7" }} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Test som annen rolle</p>
          <p className="text-xs text-zinc-400">
            Bytter din egen userType og oppretter nødvendige profiler (SponsorProfile osv).
            Du blir logget ut og inn igjen for at session-token oppdateres.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => void switchTo(r.id)}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: r.bg,
              color:      r.color,
              border:     `1px solid ${r.border}`,
            }}
          >
            {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {r.label}
          </button>
        ))}
      </div>

      {result && (
        <p className="mt-3 text-xs" style={{ color: "#A855F7" }}>{result}</p>
      )}
    </div>
  );
}
