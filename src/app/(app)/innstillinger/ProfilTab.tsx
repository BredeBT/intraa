"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Camera, Check, X, Globe, Link as LinkIcon, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "online" | "away" | "dnd" | "invisible";

interface SocialLinks {
  twitter?:   string;
  instagram?: string;
  youtube?:   string;
  twitch?:    string;
  discord?:   string;
}

interface Profile {
  id:          string;
  name:        string;
  email:       string;
  avatarUrl:   string | null;
  bio:         string;
  website:     string;
  socialLinks: SocialLinks;
  status:      Status;
  orgType:     string | null;
  orgRole:     string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: Status; label: string; color: string; desc: string }[] = [
  { value: "online",    label: "Tilgjengelig",  color: "bg-emerald-500", desc: "Du er synlig og tilgjengelig" },
  { value: "away",      label: "Borte",         color: "bg-amber-500",   desc: "Du er borte en stund" },
  { value: "dnd",       label: "Ikke forstyrr", color: "bg-rose-500",    desc: "Du mottar ikke varsler" },
  { value: "invisible", label: "Usynlig",       color: "bg-zinc-500",    desc: "Du vises som offline" },
];

const SOCIAL_FIELDS: { key: keyof SocialLinks; label: string; placeholder: string; Icon: React.ElementType }[] = [
  { key: "twitter",   label: "Twitter / X",  placeholder: "brukernavn",           Icon: LinkIcon },
  { key: "instagram", label: "Instagram",    placeholder: "brukernavn",           Icon: Globe },
  { key: "youtube",   label: "YouTube",      placeholder: "kanal-URL eller navn", Icon: LinkIcon },
  { key: "twitch",    label: "Twitch",       placeholder: "brukernavn",           Icon: LinkIcon },
  { key: "discord",   label: "Discord",      placeholder: "brukernavn#0000",      Icon: LinkIcon },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function statusColor(s: Status) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.color ?? "bg-emerald-500";
}

/** Compress avatar to max 200px, jpeg 0.8 before upload */
async function compressAvatar(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Compression failed"));
      }, "image/jpeg", 0.8);
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function uploadAvatar(file: File): Promise<string> {
  const blob = await compressAvatar(file);
  const compressed = new File([blob], "avatar.jpg", { type: "image/jpeg" });
  const fd = new FormData();
  fd.append("file", compressed);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload feilet");
  const { url } = await res.json() as { url: string };
  return url;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {desc && <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>}
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        {children}
      </div>
    </div>
  );
}

function InputField({
  label, value, onChange, placeholder, maxLength, prefix, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; maxLength?: number; prefix?: string; type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
      <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 transition-colors focus-within:border-indigo-500">
        {prefix && <span className="mr-1 text-sm text-zinc-500">{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfilTab() {
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<Profile>({
    id: "", name: "", email: "", avatarUrl: null,
    bio: "", website: "", socialLinks: {}, status: "online",
    orgType: null, orgRole: null,
  });
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [saveError,     setSaveError]     = useState("");
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading,     setUploading]     = useState(false);

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const hasTriedSave  = useRef(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data: Partial<Profile>) => {
        setProfile({
          id:          data.id ?? "",
          name:        data.name ?? "",
          email:       data.email ?? "",
          avatarUrl:   data.avatarUrl ?? null,
          bio:         data.bio ?? "",
          website:     data.website ?? "",
          socialLinks: (data.socialLinks as SocialLinks) ?? {},
          status:      (data.status as Status) ?? "online",
          orgType:     (data as { orgType?: string | null }).orgType ?? null,
          orgRole:     (data as { orgRole?: string | null }).orgRole ?? null,
        });
      })
      .finally(() => setLoading(false));
  }, []);


  function pickFile(file: File) {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  const handleSave = useCallback(async () => {
    if (saving) return;
    hasTriedSave.current = true;
    setSaving(true);
    setSaveError("");

    let avatarUrl = profile.avatarUrl;
    if (avatarFile) {
      setUploading(true);
      try {
        avatarUrl = await uploadAvatar(avatarFile);
      } catch {
        setSaveError("Kunne ikke laste opp profilbilde");
        setSaving(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const res = await fetch("/api/user/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:        profile.name,
        bio:         profile.bio,
        website:     profile.website,
        socialLinks: profile.socialLinks,
        status:      profile.status,
        avatarUrl,
      }),
    });

    const data = await res.json() as { success?: boolean; error?: string; user?: { name: string | null; avatarUrl: string | null } };

    if (res.ok && data.success) {
      const savedName     = data.user?.name     ?? profile.name;
      const savedAvatar   = data.user?.avatarUrl ?? avatarUrl ?? profile.avatarUrl;
      setProfile((p) => ({ ...p, name: savedName, avatarUrl: savedAvatar }));
      setAvatarFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      // Push confirmed values from DB into the JWT so the header updates instantly
      await updateSession({ name: savedName, image: savedAvatar });
    } else {
      setSaveError(data.error ?? "Noe gikk galt");
    }
    setSaving(false);
  }, [saving, avatarFile, profile]);

  function update<K extends keyof Profile>(key: K, val: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: val }));
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === profile.status) ?? STATUS_OPTIONS[0]!;

  return (
    <div>
      {/* Save bar */}
      <div className="mb-6 flex items-center justify-end gap-3">
        {hasTriedSave.current && saveError && <p className="text-sm text-rose-400">{saveError}</p>}
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-400">
            <Check className="h-4 w-4" /> Lagret
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {(saving || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Lagrer…" : "Lagre endringer"}
        </button>
      </div>

      {/* Avatar */}
      <Section title="Profilbilde" desc="Klikk eller dra-og-slipp et bilde.">
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <div
              className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-full ring-2 ring-zinc-700 transition-all hover:ring-indigo-500"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ?? profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview ?? profile.avatarUrl!} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-indigo-600 text-xl font-semibold text-white">
                  {initials(profile.name)}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className={`absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full ring-2 ring-zinc-900 ${statusColor(profile.status)}`} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
            />
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-medium text-white">{profile.name || "Ditt navn"}</p>
            <p className="text-zinc-500">{profile.email}</p>

            <div className="flex items-center gap-1.5 pt-1">
              <div className={`h-2 w-2 rounded-full ${statusColor(profile.status)}`} />
              <span className="text-xs text-zinc-400">{currentStatus.label}</span>
            </div>
            {avatarFile && (
              <button
                onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-3 w-3" /> Fjern nytt bilde
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* Basic info */}
      <Section title="Grunnleggende informasjon">
        <div className="space-y-4">
          <InputField
            label="Fullt navn"
            value={profile.name}
            onChange={(v) => update("name", v)}
            placeholder="Ditt navn"
            maxLength={80}
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Fortell litt om deg selv…"
              maxLength={300}
              rows={3}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500"
            />
            <p className="mt-1 text-right text-xs text-zinc-600">{profile.bio.length}/300</p>
          </div>
          <InputField
            label="Nettside"
            value={profile.website}
            onChange={(v) => update("website", v)}
            placeholder="https://eksempel.no"
            type="url"
          />
        </div>
      </Section>

      {/* Social links — only for community owners */}
      {profile.orgType === "COMMUNITY" && profile.orgRole === "OWNER" && (
        <Section title="Sosiale lenker" desc="Vises i sidebaren på community-feeden din">
          <div className="space-y-4">
            {SOCIAL_FIELDS.map(({ key, label, placeholder, Icon }) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
                <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 transition-colors focus-within:border-indigo-500">
                  <Icon className="mr-2.5 h-4 w-4 shrink-0 text-zinc-500" />
                  <input
                    type="text"
                    value={profile.socialLinks[key] ?? ""}
                    onChange={(e) => update("socialLinks", { ...profile.socialLinks, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Status */}
      <Section title="Status" desc="Vises som en farget sirkel ved avataren din">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("status", opt.value)}
              className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-all ${
                profile.status === opt.value
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800"
              }`}
            >
              <div className={`h-4 w-4 rounded-full ring-2 ${opt.color} ${
                profile.status === opt.value ? "ring-indigo-400" : "ring-zinc-700"
              }`} />
              <span className="text-xs font-medium text-white">{opt.label}</span>
              <span className="text-[10px] leading-tight text-zinc-500">{opt.desc}</span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
