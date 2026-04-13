"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, Eye, EyeOff, Users } from "lucide-react";

type Audience = "all" | "pro" | "tenant";

interface OrgOption { id: string; name: string }

export default function EmailClient({ orgs }: { orgs: OrgOption[] }) {
  const [subject,   setSubject]   = useState("");
  const [body,      setBody]      = useState("");
  const [audience,  setAudience]  = useState<Audience>("all");
  const [orgId,     setOrgId]     = useState("");
  const [preview,   setPreview]   = useState(false);
  const [stats,     setStats]     = useState<{ total: number; consented: number } | null>(null);
  const [confirm,   setConfirm]   = useState(false);
  const [sending,   setSending]   = useState(false);
  const [result,    setResult]    = useState<{ sent: number } | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    const params = new URLSearchParams({ audience });
    if (audience === "tenant" && orgId) params.set("orgId", orgId);
    const res  = await fetch(`/api/superadmin/email?${params}`);
    const data = await res.json() as { total: number; consented: number };
    setStats(data);
  }, [audience, orgId]);

  useEffect(() => { void fetchStats(); }, [fetchStats]);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          subject,
          html:     body.replace(/\n/g, "<br>"),
          audience,
          orgId:    audience === "tenant" ? orgId : undefined,
        }),
      });
      const data = await res.json() as { sent?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Feil ved sending");
      setResult({ sent: data.sent! });
      setConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
    } finally {
      setSending(false);
    }
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border:     "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    color:      "white",
    outline:    "none",
  };

  if (result) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "rgba(52,211,153,0.1)" }}>
          <Send className="h-8 w-8" style={{ color: "#34d399" }} />
        </div>
        <h2 className="text-xl font-semibold text-white">Epost sendt!</h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          {result.sent} epost ble sendt.
        </p>
        <button
          onClick={() => { setResult(null); setSubject(""); setBody(""); setConfirm(false); }}
          className="mt-2 rounded-lg px-5 py-2 text-sm font-semibold text-white"
          style={{ background: "#6c47ff" }}
        >
          Send ny epost
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      {/* Left: compose */}
      <div className="space-y-5">
        {/* Audience */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
            Mottakere
          </label>
          <div className="flex gap-2">
            {(["all", "pro", "tenant"] as Audience[]).map((a) => (
              <button
                key={a}
                onClick={() => { setAudience(a); setOrgId(""); }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                style={audience === a
                  ? { background: "rgba(108,71,255,0.2)", color: "#a78bfa", border: "1px solid rgba(108,71,255,0.4)" }
                  : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {a === "all" ? "Alle brukere" : a === "pro" ? "PRO/Enterprise" : "Spesifikk tenant"}
              </button>
            ))}
          </div>

          {audience === "tenant" && (
            <select
              value={orgId}
              onChange={e => setOrgId(e.target.value)}
              className="mt-3 w-full px-3 py-2 text-sm"
              style={inputStyle}
            >
              <option value="">Velg tenant…</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
            Emne
          </label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Emne for eposten"
            className="w-full px-3 py-2.5 text-sm"
            style={inputStyle}
          />
        </div>

        {/* Body */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
              Innhold
            </label>
            <button
              onClick={() => setPreview(p => !p)}
              className="flex items-center gap-1 text-xs"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {preview ? "Rediger" : "Forhåndsvis"}
            </button>
          </div>
          {preview ? (
            <div
              className="min-h-[240px] rounded-xl p-4 text-sm"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}
            >
              {body || <span style={{ color: "rgba(255,255,255,0.2)" }}>Ingenting å forhåndsvise…</span>}
            </div>
          ) : (
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Skriv innholdet i eposten her…"
              rows={12}
              className="w-full resize-none px-3 py-2.5 text-sm"
              style={{ ...inputStyle, lineHeight: 1.7 }}
            />
          )}
          <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            Linjeskift konverteres til &lt;br&gt; automatisk.
          </p>
        </div>

        {error && (
          <p className="rounded-lg px-4 py-2.5 text-sm" style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#f87171" }}>
            {error}
          </p>
        )}

        {/* Send button */}
        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            disabled={!subject.trim() || !body.trim() || (audience === "tenant" && !orgId)}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-30 hover:opacity-90"
            style={{ background: "#6c47ff" }}
          >
            <Send className="h-4 w-4" />
            Send epost
          </button>
        ) : (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(108,71,255,0.08)", border: "1px solid rgba(108,71,255,0.2)" }}
          >
            <p className="text-sm font-medium text-white">
              Send til <strong>{stats?.consented ?? "…"}</strong> mottakere med epostsamtykke?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#6c47ff" }}
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? "Sender…" : "Ja, send nå"}
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
              >
                Avbryt
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: stats */}
      <div>
        <div
          className="sticky top-24 rounded-xl p-5 space-y-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h3 className="text-sm font-semibold text-white">Mottaker-statistikk</h3>
          {stats ? (
            <div className="space-y-3">
              <StatRow label="Totalt i segment" value={stats.total} icon={<Users className="h-4 w-4" />} />
              <StatRow label="Med epostsamtykke" value={stats.consented} color="#34d399" />
              <StatRow label="Uten samtykke" value={stats.total - stats.consented} color="#f87171" />
            </div>
          ) : (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Laster…</p>
          )}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12 }}>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Epost sendes kun til brukere med <code className="rounded px-1" style={{ background: "rgba(255,255,255,0.06)" }}>emailConsent: true</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
        {icon}
        {label}
      </div>
      <span className="text-sm font-semibold" style={{ color: color ?? "white" }}>{value.toLocaleString("nb")}</span>
    </div>
  );
}
