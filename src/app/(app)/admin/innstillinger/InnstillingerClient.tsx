"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check, Upload, X, Loader2, Image as ImageIcon, Bell, Plus,
} from "lucide-react";
import {
  COMPANY_FEATURES, COMMUNITY_FEATURES, FEATURE_LABELS, FEATURE_DESCRIPTIONS,
} from "@/lib/features";
import type { Feature } from "@/lib/features";
import { BANNER_PRESETS, AVATAR_PRESETS } from "@/lib/themePresets";

const DISABLED_BY_DEFAULT = new Set<Feature>(["live"]);

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "generelt" | "utseende" | "funksjoner" | "varsler" | "shop";
type OrgType = "COMPANY" | "COMMUNITY";
type MemberRole = "OWNER" | "ADMIN" | "MODERATOR" | "VIP" | "MEMBER";

interface Theme {
  logoUrl:        string | null;
  bannerUrl:      string | null;
  bannerPreset:   string | null;
  avatarPreset:   string | null;
  borderRadius:   string;
  fontStyle:      string;
  welcomeMessage: string;
}

interface OrgInfo {
  id:   string;
  name: string;
  slug: string;
  type: OrgType;
  plan: string;
}

interface StreamSettingsForm {
  twitchChannel:     string;
  youtubeChannel:    string;
  preferredPlatform: string;
}

interface Props {
  initialTab:     string;
  org:            OrgInfo;
  theme:          Theme;
  features:       Record<string, boolean>;
  userRole:       MemberRole;
  streamSettings: StreamSettingsForm;
}

// ─── Theme constants ──────────────────────────────────────────────────────────


const BORDER_RADIUS_OPTIONS = [
  { value: "rounded-none", label: "Skarpe" },
  { value: "rounded-sm",   label: "Litt runde" },
  { value: "rounded-lg",   label: "Runde" },
  { value: "rounded-2xl",  label: "Svært runde" },
];

const FONT_OPTIONS = [
  { value: "default", label: "Standard",  desc: "Systemfont" },
  { value: "modern",  label: "Moderne",   desc: "Inter / sans-serif" },
  { value: "classic", label: "Klassisk",  desc: "Georgia / serif" },
  { value: "mono",    label: "Monospace", desc: "JetBrains Mono" },
];

const TABS: { id: Tab; label: string }[] = [
  { id: "generelt",   label: "Generelt" },
  { id: "utseende",   label: "Utseende" },
  { id: "funksjoner", label: "Funksjoner" },
  { id: "varsler",    label: "Varsler" },
  { id: "shop",       label: "Shop" },
];

const PLAN_LABELS: Record<string, string> = {
  FREE: "Gratis", PRO: "Pro", ENTERPRISE: "Enterprise",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compress an image client-side to at most maxPx on the longest side, JPEG 0.82 quality. */
function compressImage(file: File, maxPx = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale  = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      }, "image/jpeg", 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

async function uploadImage(file: File): Promise<string> {
  const blob       = await compressImage(file);
  const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  const fd = new FormData();
  fd.append("file", compressed);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Opplasting feilet");
  }
  return ((await res.json()) as { url: string }).url;
}


// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {desc && <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>}
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">{children}</div>
    </div>
  );
}

function ImageDropzone({ label, desc, current, onFile }: {
  label: string; desc: string; current: string | null; onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) onFile(f); }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-colors ${
          dragging ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50"
        }`}
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="" className="max-h-20 max-w-full rounded-lg object-contain" />
        ) : (
          <>
            <ImageIcon className="h-7 w-7 text-zinc-600" />
            <p className="text-center text-xs text-zinc-500">{desc}</p>
            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300">
              <Upload className="h-3.5 w-3.5" /> Velg bilde
            </div>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onChange} disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${checked ? "bg-indigo-600" : "bg-zinc-700"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

// ─── Shop Admin Tab ───────────────────────────────────────────────────────────

interface ShopItemRow {
  id:            string;
  name:          string;
  description:   string | null;
  type:          string;
  value:         string;
  coinCost:      number;
  fanpassOnly: boolean;
  enabled:       boolean;
}

function ShopAdminTab({ orgId }: { orgId: string }) {
  const [items,   setItems]   = useState<ShopItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: "", value: "", coinCost: 100, fanpassOnly: false });
  const [adding,  setAdding]  = useState(false);

  useEffect(() => {
    fetch(`/api/admin/shop?orgId=${orgId}`)
      .then((r) => r.ok ? r.json() as Promise<ShopItemRow[]> : Promise.reject())
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  async function toggleEnabled(item: ShopItemRow) {
    setSaving(item.id);
    const res = await fetch("/api/admin/shop", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: item.id, enabled: !item.enabled }),
    });
    setSaving(null);
    if (res.ok) setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, enabled: !i.enabled } : i));
  }

  async function updateCoinCost(item: ShopItemRow, coinCost: number) {
    setSaving(item.id + "-cost");
    const res = await fetch("/api/admin/shop", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: item.id, coinCost }),
    });
    setSaving(null);
    if (res.ok) setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, coinCost } : i));
  }

  async function addBadge() {
    if (!newItem.name.trim() || !newItem.value.trim()) return;
    setAdding(true);
    const res = await fetch("/api/admin/shop", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...newItem, orgId, type: "BADGE" }),
    });
    setAdding(false);
    if (res.ok) {
      const created = await res.json() as ShopItemRow;
      setItems((prev) => [...prev, created]);
      setNewItem({ name: "", value: "", coinCost: 100, fanpassOnly: false });
    }
  }

  if (loading) return <div className="py-12 text-center text-sm text-zinc-600">Laster shop…</div>;

  return (
    <div className="max-w-2xl">
      <Section title="Shop-items" desc="Aktiver/deaktiver items og juster priser for organisasjonens shop.">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">Ingen items ennå. Legg til et badge nedenfor.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/50 px-4 py-3">
                <span className="text-lg w-8 text-center">{item.type === "NAME_COLOR" ? "🎨" : item.value}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{item.name}</p>
                  <p className="text-xs text-zinc-500">{item.type}{item.fanpassOnly ? " · Fanpass" : ""}</p>
                </div>
                <input
                  type="number"
                  defaultValue={item.coinCost}
                  onBlur={(e) => { const v = parseInt(e.target.value); if (v > 0 && v !== item.coinCost) void updateCoinCost(item, v); }}
                  className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-right text-sm text-white outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-zinc-600">coins</span>
                {saving === item.id + "-cost" && <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />}
                <Toggle
                  checked={item.enabled}
                  onChange={() => void toggleEnabled(item)}
                  disabled={saving === item.id}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Legg til egendefinert badge" desc="Opprett et nytt badge-item med emoji og pris.">
        <div className="flex gap-3">
          <input
            placeholder="Emoji (f.eks. 🔥)"
            value={newItem.value}
            onChange={(e) => setNewItem((p) => ({ ...p, value: e.target.value }))}
            className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-lg outline-none focus:border-indigo-500"
            maxLength={4}
          />
          <input
            placeholder="Navn (f.eks. Ild-badge)"
            value={newItem.name}
            onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
          <input
            type="number"
            value={newItem.coinCost}
            onChange={(e) => setNewItem((p) => ({ ...p, coinCost: parseInt(e.target.value) || 100 }))}
            className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 whitespace-nowrap">
            <input
              type="checkbox"
              checked={newItem.fanpassOnly}
              onChange={(e) => setNewItem((p) => ({ ...p, fanpassOnly: e.target.checked }))}
              className="accent-violet-500"
            />
            BP only
          </label>
          <button
            onClick={() => void addBadge()}
            disabled={adding || !newItem.name.trim() || !newItem.value.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {adding ? "…" : "Legg til"}
          </button>
        </div>
      </Section>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function InnstillingerClient({ initialTab, org: initialOrg, theme: initialTheme, features: initialFeatures, userRole, streamSettings: initialStream }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const validTabs: Tab[] = ["generelt", "utseende", "funksjoner", "varsler", "shop"];
  const activeTab = validTabs.includes(searchParams.get("tab") as Tab) ? (searchParams.get("tab") as Tab) : "generelt";

  function setTab(tab: Tab) {
    router.push(`?tab=${tab}`, { scroll: false });
  }

  // ── Generelt state ──
  const [org,        setOrg]        = useState(initialOrg);
  const [genSaving,  setGenSaving]  = useState(false);
  const [genSaved,   setGenSaved]   = useState(false);
  const [genError,   setGenError]   = useState("");

  async function saveGenerelt() {
    setGenSaving(true); setGenError("");
    const res = await fetch("/api/admin/organisation", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: org.id, name: org.name, slug: org.slug }),
    });
    setGenSaving(false);
    if (res.ok) { setGenSaved(true); setTimeout(() => setGenSaved(false), 2000); }
    else {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setGenError(d.error ?? "Noe gikk galt");
    }
  }

  // ── Utseende state ──
  const [theme,         setTheme]         = useState<Theme>(initialTheme);
  const [logoPreview,   setLogoPreview]   = useState<string | null>(initialTheme.logoUrl);
  const [bannerPreview, setBannerPreview] = useState<string | null>(initialTheme.bannerUrl);
  const [logoFile,      setLogoFile]      = useState<File | null>(null);
  const [bannerFile,    setBannerFile]    = useState<File | null>(null);
  const [themeSaving,   setThemeSaving]   = useState(false);
  const [themeSaved,    setThemeSaved]    = useState(false);
  const [themeError,    setThemeError]    = useState("");
  const [selectedBanner, setSelectedBanner] = useState<string | null>(initialTheme.bannerPreset ?? null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(initialTheme.avatarPreset ?? null);

  async function selectBannerPreset(preset: typeof BANNER_PRESETS[number]) {
    setSelectedBanner(preset.id);
    updateTheme("bannerPreset", preset.id);
    await fetch("/api/tenant/theme", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bannerPreset: preset.id }),
    });
  }

  async function selectAvatarPreset(preset: typeof AVATAR_PRESETS[number]) {
    setSelectedAvatar(preset.id);
    updateTheme("avatarPreset", preset.id);
    await fetch("/api/tenant/theme", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarPreset: preset.id }),
    });
  }


  function updateTheme<K extends keyof Theme>(key: K, val: Theme[K]) {
    setTheme((p) => ({ ...p, [key]: val }));
  }

  const saveTheme = useCallback(async () => {
    if (themeSaving) return;
    setThemeSaving(true); setThemeError("");
    let logoUrl   = theme.logoUrl;
    let bannerUrl = theme.bannerUrl;
    try {
      if (logoFile)   logoUrl   = await uploadImage(logoFile);
      if (bannerFile) bannerUrl = await uploadImage(bannerFile);
    } catch (err) {
      setThemeError((err as Error).message ?? "Bildelagring feilet");
      setThemeSaving(false);
      return;
    }
    const res = await fetch("/api/tenant/theme", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...theme, logoUrl, bannerUrl }),
    });
    if (res.ok) {
      const d = await res.json() as { theme: Theme };
      const saved = { ...d.theme, welcomeMessage: d.theme.welcomeMessage ?? "" };
      setTheme(saved);
      if (saved.logoUrl)   setLogoPreview(saved.logoUrl);
      if (saved.bannerUrl) setBannerPreview(saved.bannerUrl);
      setLogoFile(null); setBannerFile(null);
      setThemeSaved(true); setTimeout(() => setThemeSaved(false), 2500);
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setThemeError(d.error ?? "Noe gikk galt");
    }
    setThemeSaving(false);
  }, [themeSaving, theme, logoFile, bannerFile]);

  // ── Funksjoner state ──
  const [features,     setFeatures]     = useState<Record<string, boolean>>(initialFeatures);
  const [featSaving,   setFeatSaving]   = useState<Record<string, boolean>>({});
  const isOwner = userRole === "OWNER";
  const relevantFeatures: Feature[] = (org.type === "COMMUNITY" ? COMMUNITY_FEATURES : COMPANY_FEATURES)
    .filter((f) => f !== "community_subscription");

  async function toggleFeature(feature: string, enabled: boolean) {
    setFeatSaving((p) => ({ ...p, [feature]: true }));
    const res = await fetch("/api/org/features", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature, enabled }),
    });
    setFeatSaving((p) => ({ ...p, [feature]: false }));
    if (res.ok) setFeatures((p) => ({ ...p, [feature]: enabled }));
  }

  // ── Stream state ──
  const [stream,       setStream]       = useState<StreamSettingsForm>(initialStream);
  const [streamSaving, setStreamSaving] = useState(false);
  const [streamSaved,  setStreamSaved]  = useState(false);
  const [streamError,  setStreamError]  = useState("");

  async function saveStream() {
    setStreamSaving(true); setStreamError("");
    const res = await fetch("/api/tenant/stream-settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stream),
    });
    setStreamSaving(false);
    if (res.ok) { setStreamSaved(true); setTimeout(() => setStreamSaved(false), 2000); }
    else {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setStreamError(d.error ?? "Noe gikk galt");
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-5 md:px-6 md:py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Innstillinger</h1>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.id ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB 1: GENERELT ══ */}
      {activeTab === "generelt" && (
        <div className="max-w-xl">
          <Section title="Organisasjonsinformasjon">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Organisasjonsnavn</label>
                <input
                  value={org.name}
                  onChange={(e) => setOrg((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Slug (URL)</label>
                <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 transition-colors focus-within:border-indigo-500">
                  <span className="mr-1 shrink-0 text-sm text-zinc-600">intraa.net/</span>
                  <input
                    value={org.slug}
                    onChange={(e) => setOrg((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                    className="flex-1 bg-transparent text-sm text-white outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Type</label>
                <p className="text-sm text-zinc-400">
                  {org.type === "COMPANY" ? "🏢 Bedrift" : "🌐 Community"}
                </p>
                <p className="mt-1 text-xs text-zinc-600">Org-type kan ikke endres etter opprettelse.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Plan</label>
                <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5">
                  <span className="text-sm text-white">{PLAN_LABELS[org.plan] ?? org.plan}</span>
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-400">{org.plan}</span>
                  <span className="ml-auto text-xs text-zinc-600">Endre plan via Superadmin</span>
                </div>
              </div>
            </div>
          </Section>
          {genError && <p className="mb-3 text-sm text-rose-400">{genError}</p>}
          <div className="flex items-center gap-3 mb-10">
            <button onClick={() => void saveGenerelt()} disabled={genSaving}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50">
              {genSaving ? "Lagrer…" : "Lagre endringer"}
            </button>
            {genSaved && <span className="flex items-center gap-1.5 text-sm text-emerald-400"><Check className="h-4 w-4" /> Lagret</span>}
          </div>

          {/* Stream */}
          <Section title="Stream" desc="Koble til en Twitch- eller YouTube-kanal for live-sending direkte i organisasjonen">
            <div className="space-y-5">
              {/* Platform toggle */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Plattform</label>
                <div className="flex gap-3">
                  {([["twitch", "Twitch"], ["youtube", "YouTube"]] as [string, string][]).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setStream((p) => ({ ...p, preferredPlatform: val }))}
                      className={`rounded-lg border px-5 py-2 text-sm font-medium transition-colors ${
                        stream.preferredPlatform === val
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Twitch channel */}
              {stream.preferredPlatform === "twitch" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Twitch-kanalnavn</label>
                  <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 transition-colors focus-within:border-indigo-500">
                    <span className="mr-1 shrink-0 text-sm text-zinc-600">twitch.tv/</span>
                    <input
                      value={stream.twitchChannel}
                      onChange={(e) => setStream((p) => ({ ...p, twitchChannel: e.target.value.toLowerCase().replace(/\s/g, "") }))}
                      placeholder="kanalnavn"
                      className="flex-1 bg-transparent text-sm text-white outline-none placeholder-zinc-500"
                    />
                  </div>
                </div>
              )}

              {/* YouTube channel ID */}
              {stream.preferredPlatform === "youtube" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">YouTube Channel ID</label>
                  <input
                    value={stream.youtubeChannel}
                    onChange={(e) => setStream((p) => ({ ...p, youtubeChannel: e.target.value.trim() }))}
                    placeholder="UCxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-500 placeholder-zinc-500"
                  />
                  <p className="mt-1 text-xs text-zinc-600">Finn channel ID på youtube.com/account_advanced</p>
                </div>
              )}
            </div>
          </Section>

          {streamError && <p className="mb-3 text-sm text-rose-400">{streamError}</p>}
          <div className="flex items-center gap-3">
            <button onClick={() => void saveStream()} disabled={streamSaving}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50">
              {streamSaving ? "Lagrer…" : "Lagre stream-innstillinger"}
            </button>
            {streamSaved && <span className="flex items-center gap-1.5 text-sm text-emerald-400"><Check className="h-4 w-4" /> Lagret</span>}
          </div>
        </div>
      )}

      {/* ══ TAB 2: UTSEENDE ══ */}
      {activeTab === "utseende" && (
        <div className="max-w-xl">
            {/* Logo og banner */}
            <Section title="Logo og banner" desc="Logoen vises i sidebaren. Banneret vises øverst på feed-siden.">
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageDropzone label="Logo" desc="Klikk eller dra-og-slipp" current={logoPreview}
                  onFile={(f) => { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }} />
                <ImageDropzone label="Bannerbilde" desc="Anbefalt: 1200×300px" current={bannerPreview}
                  onFile={(f) => { setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); }} />
              </div>
              {(logoPreview ?? bannerPreview) && (
                <div className="mt-3 flex gap-3">
                  {logoPreview && (
                    <button onClick={() => { setLogoFile(null); setLogoPreview(null); updateTheme("logoUrl", null); }}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-rose-400">
                      <X className="h-3 w-3" /> Fjern logo
                    </button>
                  )}
                  {bannerPreview && (
                    <button onClick={() => { setBannerFile(null); setBannerPreview(null); updateTheme("bannerUrl", null); }}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-rose-400">
                      <X className="h-3 w-3" /> Fjern banner
                    </button>
                  )}
                </div>
              )}
            </Section>

            {/* Banner-presets */}
            <Section title="Ferdiglagde bannere" desc="Velg en gradient eller last opp eget bilde over.">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {BANNER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => void selectBannerPreset(preset)}
                    title={preset.label}
                    className={`relative h-16 overflow-hidden rounded-lg border-2 transition-all ${
                      selectedBanner === preset.id
                        ? "border-violet-500 scale-105"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                    style={{ background: preset.css }}
                  >
                    {selectedBanner === preset.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="text-lg text-white">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {BANNER_PRESETS.find((p) => p.id === selectedBanner)?.label ?? "Ingen preset valgt"}
              </p>
            </Section>

            {/* Avatar-presets */}
            <Section title="Ferdiglagde org-avatarer" desc="Velg en avatar eller last opp eget logobilde over.">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => void selectAvatarPreset(preset)}
                    title={preset.label}
                    className={`flex h-16 w-full items-center justify-center rounded-xl border-2 text-2xl transition-all ${
                      selectedAvatar === preset.id
                        ? "border-violet-500 scale-105"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                    style={{ background: preset.bg }}
                  >
                    {preset.emoji}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {AVATAR_PRESETS.find((p) => p.id === selectedAvatar)?.label ?? "Ingen preset valgt"}
              </p>
            </Section>

            {/* Typografi */}
            <Section title="Typografi og stil">
              <div className="mb-5">
                <p className="mb-2 text-xs font-medium text-zinc-400">Fontstil</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {FONT_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => updateTheme("fontStyle", opt.value)}
                      className={`flex flex-col rounded-xl border p-3 text-left transition-all ${
                        theme.fontStyle === opt.value ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800"
                      }`}>
                      <span className="text-sm font-semibold text-white">{opt.label}</span>
                      <span className="mt-0.5 text-[10px] text-zinc-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-400">Hjørnestil</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {BORDER_RADIUS_OPTIONS.map((opt) => {
                    const br = opt.value === "rounded-none" ? "0" : opt.value === "rounded-sm" ? "4px" : opt.value === "rounded-lg" ? "8px" : "16px";
                    return (
                      <button key={opt.value} onClick={() => updateTheme("borderRadius", opt.value)}
                        className={`flex flex-col items-center gap-2 border p-3 transition-all ${
                          theme.borderRadius === opt.value ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800"
                        }`} style={{ borderRadius: br }}>
                        <div className="h-6 w-full border border-zinc-600 bg-zinc-800" style={{ borderRadius: br }} />
                        <span className="text-xs font-medium text-zinc-300">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Section>

            {/* Velkomstmelding */}
            <Section title="Velkomstmelding" desc="Vises på feed når nye brukere logger inn for første gang">
              <textarea value={theme.welcomeMessage} onChange={(e) => updateTheme("welcomeMessage", e.target.value)}
                placeholder="Velkommen! 👋 Her finner du alt du trenger…" rows={3} maxLength={500}
                className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500" />
              <p className="mt-1 text-right text-xs text-zinc-600">{theme.welcomeMessage.length}/500</p>
            </Section>

            {themeError && <p className="mb-3 text-sm text-rose-400">{themeError}</p>}
            <div className="flex items-center gap-3">
              <button onClick={() => void saveTheme()} disabled={themeSaving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50">
                {themeSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {themeSaving ? "Lagrer…" : "Lagre"}
              </button>
              {themeSaved && <span className="flex items-center gap-1.5 text-sm text-emerald-400"><Check className="h-4 w-4" /> Lagret</span>}
            </div>
        </div>
      )}

      {/* ══ TAB 3: FUNKSJONER ══ */}
      {activeTab === "funksjoner" && (
        <div className="max-w-xl">
          {!isOwner && (
            <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
              <p className="text-sm text-amber-400">Kun eieren av organisasjonen kan endre funksjoner.</p>
            </div>
          )}
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {relevantFeatures.map((feature, i) => {
              const defaultEnabled = !DISABLED_BY_DEFAULT.has(feature);
              const isEnabled = features[feature] ?? defaultEnabled;
              return (
              <div key={feature}
                className={`flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-900/50 ${i < relevantFeatures.length - 1 ? "border-b border-zinc-800" : ""}`}>
                <div>
                  <p className="text-sm font-medium text-white">{FEATURE_LABELS[feature]}</p>
                  <p className="text-xs text-zinc-500">{FEATURE_DESCRIPTIONS[feature]}</p>
                  {feature === "live" && isEnabled && (
                    <button
                      onClick={() => setTab("generelt")}
                      className="mt-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
                    >
                      Konfigurer stream →
                    </button>
                  )}
                </div>
                <div className="ml-4 flex items-center gap-2">
                  {featSaving[feature] && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />}
                  <Toggle
                    checked={isEnabled}
                    onChange={() => void toggleFeature(feature, !isEnabled)}
                    disabled={!isOwner || !!featSaving[feature]}
                  />
                </div>
              </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-zinc-600">
            Endringer trer i kraft umiddelbart for alle medlemmer.
          </p>
        </div>
      )}

      {/* ══ TAB 4: VARSLER (kommer snart) ══ */}
      {activeTab === "shop" && (
        <ShopAdminTab orgId={org.id} />
      )}

      {activeTab === "varsler" && (
        <div className="flex max-w-xl flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800">
            <Bell className="h-7 w-7 text-zinc-600" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-zinc-400">Varsler — kommer snart</h3>
          <p className="max-w-xs text-sm text-zinc-600">
            Konfigurer e-postvarsler, push-varsler og Slack-integrasjon for organisasjonen.
          </p>
          <span className="mt-4 rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-500">
            Under utvikling
          </span>
        </div>
      )}
    </div>
  );
}
