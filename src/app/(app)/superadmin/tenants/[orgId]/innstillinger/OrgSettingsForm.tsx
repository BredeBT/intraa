"use client";

import { useState, useEffect, useCallback } from "react";

const PLANS = ["FREE", "PRO", "ENTERPRISE"] as const;

const VISIBILITY_OPTIONS = [
  { value: "open",    label: "Åpent",  icon: "🌐", desc: "Alle kan bli med uten invitasjon" },
  { value: "closed",  label: "Lukket", icon: "🔒", desc: "Synlig i søk, krever godkjenning" },
  { value: "private", label: "Privat", icon: "👁️", desc: "Usynlig — kun via invitasjonslenke" },
] as const;

interface OrgProps {
  id:              string;
  name:            string;
  slug:            string;
  plan:            string;
  description:     string | null;
  type:            string;
  joinType:        string;
  visibility:      string;
  openInviteToken: string | null;
  createdAt:       string;
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ ok, text, onDismiss }: { ok: boolean; text: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl"
      style={{
        background: ok ? "#065f46" : "#7f1d1d",
        border:     ok ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(248,113,113,0.3)",
        minWidth:   "220px",
      }}
    >
      <span style={{ color: ok ? "#34d399" : "#f87171" }}>{ok ? "✓" : "✗"}</span>
      {text}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function OrgSettingsForm({ org }: { org: OrgProps }) {
  const [name,        setName]        = useState(org.name);
  const [slug,        setSlug]        = useState(org.slug);
  const [plan,        setPlan]        = useState(org.plan);
  const [description, setDescription] = useState(org.description ?? "");
  const [visibility,  setVisibility]  = useState(org.visibility ?? "open");
  const [hasChanges,  setHasChanges]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState<{ ok: boolean; text: string } | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(org.openInviteToken);
  const [genLoading,  setGenLoading]  = useState(false);

  const dismissToast = useCallback(() => setToast(null), []);

  function mark<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setHasChanges(true); };
  }

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/orgs/${org.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:        name.trim(),
          slug:        slug.trim(),
          plan,
          description: description.trim() || null,
          joinType:    visibility === "open" ? "OPEN" : "CLOSED",
          visibility,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Ukjent feil");
      }
      setHasChanges(false);
      setToast({ ok: true, text: "Endringer lagret" });
    } catch (err) {
      setToast({ ok: false, text: err instanceof Error ? err.message : "Feil ved lagring" });
    } finally {
      setSaving(false);
    }
  }, [hasChanges, saving, org.id, name, slug, plan, description, visibility]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges) void handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasChanges, handleSave]);

  async function generateInviteLink() {
    setGenLoading(true);
    try {
      const res  = await fetch(`/api/superadmin/orgs/${org.id}/invite-token`, { method: "POST" });
      const data = await res.json() as { token?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Feil");
      setInviteToken(data.token ?? null);
      await navigator.clipboard.writeText(`${window.location.origin}/inviter/open/${data.token}`);
      setToast({ ok: true, text: "Invitasjonslenke kopiert!" });
    } catch {
      setToast({ ok: false, text: "Kunne ikke generere lenke" });
    } finally {
      setGenLoading(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteToken) return generateInviteLink();
    await navigator.clipboard.writeText(`${window.location.origin}/inviter/open/${inviteToken}`);
    setToast({ ok: true, text: "Invitasjonslenke kopiert!" });
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border:     "1px solid rgba(255,255,255,0.1)",
    fontSize:   "16px",
    color:      "white",
    borderRadius: 8,
  };

  return (
    <>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-medium text-white">Innstillinger</h1>
          <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            Rediger grunnleggende informasjon
          </p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={!hasChanges || saving}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          style={{ background: "#6c47ff" }}
        >
          {saving ? "Lagrer…" : "Lagre endringer"}
        </button>
      </div>

      {/* Two-column grid on desktop */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* ── Left column ── */}
        <div className="space-y-4">

          {/* Grunninfo */}
          <Section title="Grunninfo">
            <div className="space-y-3">

              <div>
                <label className="mb-1 block text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Navn</label>
                <input
                  value={name}
                  onChange={(e) => mark(setName)(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Slug</label>
                <div
                  className="flex items-center overflow-hidden rounded-lg focus-within:ring-1 focus-within:ring-purple-500/40"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <span
                    className="shrink-0 border-r px-3 py-2 text-xs"
                    style={{
                      background:  "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color:       "rgba(255,255,255,0.3)",
                    }}
                  >
                    intraa.net/
                  </span>
                  <input
                    value={slug}
                    onChange={(e) => mark(setSlug)(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-white focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", fontSize: "16px" }}
                  />
                </div>
                <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.22)" }}>
                  Kun små bokstaver, tall og bindestrek
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Beskrivelse <span style={{ color: "rgba(255,255,255,0.25)" }}>(valgfri)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => mark(setDescription)(e.target.value)}
                  rows={2}
                  placeholder="Beskriv hva dette communityet handler om…"
                  className="w-full resize-none rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ ...inputStyle, lineHeight: 1.6 }}
                />
              </div>

            </div>
          </Section>

          {/* Plan og status */}
          <Section title="Plan og status">
            <div>
              <label className="mb-2 block text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Plan</label>
              <div className="grid grid-cols-3 gap-2">
                {PLANS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => mark(setPlan)(p)}
                    className="truncate rounded-lg px-2 py-2 text-xs font-medium transition-all"
                    style={plan === p
                      ? { background: "rgba(108,71,255,0.2)", border: "1px solid rgba(108,71,255,0.5)", color: "#c4b5fd" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Type + Opprettet side by side */}
              <div
                className="mt-3 grid grid-cols-2 gap-4 pt-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div>
                  <p className="mb-1 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Type</p>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={org.type === "COMMUNITY"
                      ? { background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }
                      : { background: "rgba(59,130,246,0.15)",  color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }
                    }
                  >
                    {org.type === "COMMUNITY" ? "Community" : "Bedrift"}
                  </span>
                </div>
                <div>
                  <p className="mb-1 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Opprettet</p>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{formatDate(org.createdAt)}</p>
                </div>
              </div>
            </div>
          </Section>

        </div>

        {/* ── Right column ── */}
        <div>
          <Section title="Synlighet">
            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map((opt) => {
                const active = visibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => mark(setVisibility)(opt.value)}
                    className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all"
                    style={active
                      ? { background: "rgba(108,71,255,0.15)", border: "1px solid rgba(108,71,255,0.4)" }
                      : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                  >
                    <span className="text-base leading-none">{opt.icon}</span>
                    <div className="flex flex-1 items-center justify-between min-w-0">
                      <div className="min-w-0">
                        <span
                          className="text-sm font-medium"
                          style={{ color: active ? "#c4b5fd" : "white" }}
                        >
                          {opt.label}
                        </span>
                        <span
                          className="ml-2 text-xs"
                          style={{ color: "rgba(255,255,255,0.38)" }}
                        >
                          {opt.desc}
                        </span>
                      </div>
                      {active && (
                        <span
                          className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs"
                          style={{ background: "rgba(108,71,255,0.25)", color: "#c4b5fd" }}
                        >
                          Aktiv
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Invite link — private only */}
              {visibility === "private" && (
                <div
                  className="mt-1 rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="mb-1 text-xs font-medium text-white">Invitasjonslenke</p>
                  {inviteToken && (
                    <p
                      className="mb-2 rounded px-2 py-1.5 font-mono text-xs break-all"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
                    >
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/inviter/open/${inviteToken}`
                        : `/inviter/open/${inviteToken}`}
                    </p>
                  )}
                  <button
                    onClick={inviteToken ? copyInviteLink : generateInviteLink}
                    disabled={genLoading}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity disabled:opacity-50"
                    style={{ background: "#6c47ff" }}
                  >
                    {genLoading ? "Genererer…" : inviteToken ? "Kopier invitasjonslenke" : "Generer invitasjonslenke"}
                  </button>
                </div>
              )}
            </div>
          </Section>
        </div>

      </div>

      {toast && <Toast ok={toast.ok} text={toast.text} onDismiss={dismissToast} />}
    </>
  );
}
