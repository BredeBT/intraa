"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Pencil, Users, FileText, Calendar, Radio,
  ExternalLink, X, Check, Trophy,
} from "lucide-react";
import type { TopMember } from "@/server/getSidebarData";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SocialLinks {
  twitter?:   string;
  instagram?: string;
  youtube?:   string;
  twitch?:    string;
  discord?:   string;
}

export interface OwnerProfile {
  userId:       string;
  name:         string | null;
  avatarUrl:    string | null;
  bio:          string | null;
  website:      string | null;
  socialLinks:  SocialLinks | null;
  status:       string | null;
  orgUsername:  string | null;
  orgCreatedAt: string;
}

export interface SidebarSettings {
  showStatus:       boolean;
  showBio:          boolean;
  showWebsite:      boolean;
  showSocials:      boolean;
  showStats:        boolean;
  showMemberCount:  boolean;
  showPostCount:    boolean;
  showCreatedAt:    boolean;
  showStreamStatus: boolean;
  customTitle:      string | null;
  customText:       string | null;
  showCustomText:   boolean;
  showTopPoints:    boolean;
}

interface StreamStatus {
  isLive:      boolean;
  title:       string;
  viewerCount: number;
  platform:    string | null;
}

interface Props {
  owner:         OwnerProfile;
  orgId:         string;
  orgSlug:       string;
  memberCount:   number;
  postCount:     number;
  liveEnabled:   boolean;
  currentUserId: string;
  isSuperAdmin?: boolean;
  settings:      SidebarSettings;
  topMembers:    TopMember[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("no-NO", { year: "numeric", month: "long" });
}

// ─── Social links config ──────────────────────────────────────────────────────

const SOCIALS = [
  { key: "twitter"   as keyof SocialLinks, label: "Twitter / X", emoji: "𝕏",  color: "text-sky-400",    bg: "hover:bg-sky-400/10",    url: (v: string) => `https://twitter.com/${v}` },
  { key: "instagram" as keyof SocialLinks, label: "Instagram",   emoji: "📸", color: "text-pink-400",   bg: "hover:bg-pink-400/10",   url: (v: string) => `https://instagram.com/${v}` },
  { key: "youtube"   as keyof SocialLinks, label: "YouTube",     emoji: "▶️", color: "text-red-400",    bg: "hover:bg-red-400/10",    url: (v: string) => `https://youtube.com/${v}` },
  { key: "twitch"    as keyof SocialLinks, label: "Twitch",      emoji: "🎮", color: "text-purple-400", bg: "hover:bg-purple-400/10", url: (v: string) => `https://twitch.tv/${v}` },
  { key: "discord"   as keyof SocialLinks, label: "Discord",     emoji: "💬", color: "text-indigo-400", bg: "hover:bg-indigo-400/10", url: (v: string) => v.startsWith("http") ? v : `https://discord.gg/${v}` },
] as const;

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
        checked ? "bg-indigo-600" : "bg-zinc-700"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  initial:    SidebarSettings;
  owner:      OwnerProfile;
  onClose:    () => void;
  onSettings: (s: SidebarSettings) => void;
  onProfile:  (p: Partial<OwnerProfile>) => void;
}

const SOCIAL_ROWS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: "twitter",   label: "Twitter / X", placeholder: "brukernavn" },
  { key: "instagram", label: "Instagram",   placeholder: "brukernavn" },
  { key: "youtube",   label: "YouTube",     placeholder: "kanal eller URL" },
  { key: "twitch",    label: "Twitch",      placeholder: "brukernavn" },
  { key: "discord",   label: "Discord",     placeholder: "brukernavn#0000" },
];

function inputCls(enabled: boolean) {
  return `w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none transition-colors ${
    enabled
      ? "border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:border-indigo-500"
      : "border-zinc-800 bg-zinc-800/40 text-zinc-600 placeholder-zinc-700 cursor-not-allowed"
  }`;
}

function EditModal({ initial, owner, onClose, onSettings, onProfile }: EditModalProps) {
  const [settings, setSettings] = useState<SidebarSettings>(initial);
  const [bio,      setBio]      = useState(owner.bio ?? "");
  const [website,  setWebsite]  = useState(owner.website ?? "");
  const [socials,  setSocials]  = useState<SocialLinks>(owner.socialLinks ?? {});
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");

  function toggle(key: keyof SidebarSettings) {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  }

  function socialToggle(key: keyof SocialLinks) {
    const current = socials[key] ?? "";
    setSocials((s) => ({ ...s, [key]: current.trim() ? "" : " " }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await Promise.all([
        fetch("/api/tenant/sidebar-settings", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(settings),
        }),
        fetch("/api/user/profile", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ bio, website, socialLinks: socials }),
        }),
      ]);
      onSettings(settings);
      onProfile({ bio: bio || null, website: website || null, socialLinks: socials });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 900);
    } catch {
      setError("Noe gikk galt. Prøv igjen.");
    }
    setSaving(false);
  }

  function Row({
    checked, onToggle, label, children,
  }: {
    checked:   boolean;
    onToggle:  () => void;
    label:     string;
    children?: React.ReactNode;
  }) {
    return (
      <div className="grid grid-cols-[auto_1fr_2fr] items-start gap-4 border-b border-zinc-800 py-3">
        <Toggle checked={checked} onChange={onToggle} />
        <span className={`pt-0.5 text-sm ${checked ? "text-zinc-300" : "text-zinc-500"}`}>{label}</span>
        <div>{children ?? <span />}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl" style={{ maxHeight: "85vh" }}>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-white">Rediger sidebar</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Column headers */}
        <div className="grid shrink-0 grid-cols-[auto_1fr_2fr] gap-4 border-b border-zinc-800/50 px-6 py-2">
          <span className="w-9" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Seksjon</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Innhold / verdi</span>
        </div>

        {/* Rows — toggles-only first, inputs last */}
        <div className="overflow-y-auto px-6">

          {/* ── Toggle-only rows ── */}
          <Row checked={settings.showStatus}       onToggle={() => toggle("showStatus")}       label="Status" />
          <Row checked={settings.showStreamStatus} onToggle={() => toggle("showStreamStatus")} label="Stream-status" />
          <Row checked={settings.showMemberCount}  onToggle={() => toggle("showMemberCount")}  label="Antall medlemmer" />
          <Row checked={settings.showPostCount}    onToggle={() => toggle("showPostCount")}    label="Antall innlegg" />
          <Row checked={settings.showCreatedAt}    onToggle={() => toggle("showCreatedAt")}    label="Aktiv siden" />
          <Row checked={settings.showSocials}      onToggle={() => toggle("showSocials")}      label="Sosiale lenker" />
          <Row checked={settings.showTopPoints}    onToggle={() => toggle("showTopPoints")}    label="Top 3 poeng" />

          {/* ── Rows with input fields ── */}
          <Row checked={settings.showBio} onToggle={() => toggle("showBio")} label="Bio">
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Fortell om deg selv…"
              className={`${inputCls(true)} resize-none`}
            />
          </Row>

          {SOCIAL_ROWS.map(({ key, label, placeholder }) => {
            const val = (socials[key] ?? "").trim();
            return (
              <Row key={key} checked={val.length > 0} onToggle={() => socialToggle(key)} label={label}>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => setSocials((s) => ({ ...s, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className={inputCls(true)}
                />
              </Row>
            );
          })}

          <Row checked={settings.showWebsite} onToggle={() => toggle("showWebsite")} label="Nettside">
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://eksempel.no"
              className={inputCls(true)}
            />
          </Row>

          <Row checked={settings.showCustomText} onToggle={() => toggle("showCustomText")} label="Egendefinert tekst">
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                value={settings.customTitle ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, customTitle: e.target.value || null }))}
                placeholder="Tittel, f.eks. Neste stream"
                maxLength={60}
                className={inputCls(true)}
              />
              <textarea
                rows={2}
                value={settings.customText ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, customText: e.target.value || null }))}
                placeholder="Innhold, f.eks. Lørdag kl 20:00"
                maxLength={200}
                className={`${inputCls(true)} resize-none`}
              />
            </div>
          </Row>
        </div>

        {/* Footer — save button */}
        <div className="flex shrink-0 items-center justify-between border-t border-zinc-800 px-6 py-4">
          {error ? (
            <p className="text-xs text-rose-400">{error}</p>
          ) : saved ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Lagret
            </span>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {saving ? "Lagrer…" : "Lagre endringer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OwnerSidebar({
  owner: initialOwner, orgId, orgSlug, memberCount, postCount,
  liveEnabled, currentUserId, isSuperAdmin, settings: initialSettings, topMembers,
}: Props) {
  const [stream,   setStream]   = useState<StreamStatus | null>(null);
  const [settings, setSettings] = useState<SidebarSettings>(initialSettings);
  const [owner,    setOwner]    = useState<OwnerProfile>(initialOwner);
  const [editing,  setEditing]  = useState(false);

  const isOwner       = currentUserId === owner.userId || isSuperAdmin === true;
  const filledSocials = SOCIALS.filter((s) => owner.socialLinks?.[s.key]?.trim());

  useEffect(() => {
    if (!liveEnabled) return;
    const check = () => {
      fetch(`/api/stream/status?orgId=${orgId}`)
        .then((r) => (r.ok ? r.json() as Promise<StreamStatus> : Promise.reject()))
        .then((data) => setStream(data))
        .catch(() => null);
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [orgId, liveEnabled]);

  const showStats = settings.showStats &&
    (settings.showMemberCount || settings.showPostCount || settings.showCreatedAt);

  return (
    <>
      <div className="space-y-4 pt-2">

        {/* ── 1. Stream-status ── */}
        {liveEnabled && stream && settings.showStreamStatus && (
          <Link
            href={`/${orgSlug}/live`}
            className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
              stream.isLive
                ? "border-red-900/30 bg-red-950/20 hover:bg-red-950/30"
                : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
            }`}
          >
            {stream.isLive ? (
              <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
            ) : (
              <Radio className="h-4 w-4 shrink-0 text-zinc-500" />
            )}
            <div className="min-w-0 flex-1">
              {stream.isLive ? (
                <>
                  <p className="text-xs font-semibold text-red-400">LIVE NÅ</p>
                  <p className="truncate text-xs text-zinc-400">{stream.title || "Livestream pågår"}</p>
                </>
              ) : (
                <p className="text-xs text-zinc-500">Offline</p>
              )}
            </div>
            {stream.isLive && stream.viewerCount > 0 && (
              <span className="ml-auto shrink-0 text-xs text-zinc-500">{stream.viewerCount} seere</span>
            )}
          </Link>
        )}

        {/* ── 2. Statistikk (always rendered for owner so pencil has a home) ── */}
        {(showStats || isOwner) && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Statistikk</p>
              {isOwner && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-zinc-500 transition-colors hover:text-white"
                  title="Rediger sidebar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {showStats && (
              <div className="flex flex-col gap-2.5">
                {settings.showMemberCount && (
                  <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                    <Users className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    <span><span className="font-semibold text-white">{memberCount}</span> {memberCount === 1 ? "medlem" : "medlemmer"}</span>
                  </div>
                )}
                {settings.showPostCount && (
                  <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    <span><span className="font-semibold text-white">{postCount}</span> innlegg</span>
                  </div>
                )}
                {settings.showCreatedAt && (
                  <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    <span>Aktiv siden <span className="font-semibold text-white">{formatDate(owner.orgCreatedAt)}</span></span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 3. Top 3 members ── */}
        {settings.showTopPoints && topMembers.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <Trophy className="h-3 w-3 text-amber-500" /> Top medlemmer
            </p>
            <div className="flex flex-col gap-2">
              {topMembers.map((m, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className={`w-4 shrink-0 text-center text-xs font-bold ${
                    i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-400" : "text-amber-700"
                  }`}>{i + 1}.</span>
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                      {initials(m.name ?? "?")}
                    </div>
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{m.name ?? m.username ?? "Ukjent"}</span>
                  <span className="shrink-0 text-xs font-semibold text-zinc-400">{m.points.toLocaleString("no-NO")} p</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 4. Sosiale lenker ── */}
        {settings.showSocials && filledSocials.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Sosiale lenker</p>
            <div className="flex flex-col gap-1">
              {filledSocials.map((s) => {
                const val = owner.socialLinks![s.key]!.trim();
                return (
                  <a
                    key={s.key}
                    href={s.url(val)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${s.color} ${s.bg}`}
                  >
                    <span className="text-base leading-none">{s.emoji}</span>
                    <span className="truncate">{val.startsWith("http") ? val.replace(/^https?:\/\//, "") : val}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 5. Nettside ── */}
        {settings.showWebsite && owner.website && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <a
              href={owner.website.startsWith("http") ? owner.website : `https://${owner.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span className="truncate">{owner.website.replace(/^https?:\/\//, "")}</span>
            </a>
          </div>
        )}

        {/* ── 6. Egendefinert tekst ── */}
        {settings.showCustomText && (settings.customTitle ?? settings.customText) && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            {settings.customTitle && (
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {settings.customTitle}
              </p>
            )}
            {settings.customText && (
              <p className="text-sm leading-relaxed text-zinc-300">{settings.customText}</p>
            )}
          </div>
        )}
      </div>

      {editing && (
        <EditModal
          initial={settings}
          owner={owner}
          onClose={() => setEditing(false)}
          onSettings={(s) => setSettings(s)}
          onProfile={(p) => setOwner((o) => ({ ...o, ...p }))}
        />
      )}
    </>
  );
}
