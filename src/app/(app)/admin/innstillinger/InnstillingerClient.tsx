"use client";

import { useState, useRef, useCallback, useEffect, memo } from "react";
import {
  Check, Upload, X, Loader2, Image as ImageIcon, Plus, Info,
  Users, Coins, Crown, MessageSquare, AlertTriangle,
} from "lucide-react";
import {
  COMPANY_FEATURES, COMMUNITY_FEATURES, FEATURE_LABELS, FEATURE_DESCRIPTIONS,
} from "@/lib/features";
import type { Feature } from "@/lib/features";
import { BANNER_PRESETS, AVATAR_PRESETS } from "@/lib/themePresets";

const DISABLED_BY_DEFAULT = new Set<Feature>(["live"]);

// ─── Aurora-tokens (matcher landing + resten av appen) ───────────────────────
const S = {
  bg:        "var(--bg-primary)",
  surface:   "var(--bg-secondary)",
  surface2:  "var(--bg-tertiary)",
  line:      "var(--border-subtle)",
  lineHi:    "var(--border-default)",
  text:      "var(--text-primary)",
  muted:     "var(--text-secondary)",
  subtle:    "var(--text-tertiary)",
  faint:     "var(--text-tertiary)",
  teal:      "#5EEAD4",
  purple:    "#A855F7",
  blue:      "#60A5FA",
  pink:      "#F472B6",
  amber:     "#FBBF24",
  rose:      "#F87171",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "generelt" | "utseende" | "funksjoner" | "shop" | "statistikk" | "faresone";
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
  id:          string;
  name:        string;
  slug:        string;
  type:        OrgType;
  plan:        string;
  description: string;
  createdAt:   string;
}

interface StreamSettingsForm {
  twitchChannel:     string;
  youtubeChannel:    string;
  preferredPlatform: string;
}

interface AccessStats {
  memberCount:           number;
  fanpassCount:          number;
  broadcastChannelName:  string | null;
}

export interface OrgStats {
  totalMembers:        number;
  newMembers7d:        number;
  activeNow:           number;          // siste 5 min
  active7d:            number;          // siste 7 dager
  posts7d:             number;
  messages7d:          number;
  activeFanpass:       number;
  coinsInCirculation:  number;
  coinsAwarded7d:      number;
  memberGrowth:        number[];        // 8 ukers data (count per uke)
  coinFlow:            number[];        // 14 dagers data (sum per dag)
}

interface Props {
  initialTab:     string;
  org:            OrgInfo;
  theme:          Theme;
  features:       Record<string, boolean>;
  userRole:       MemberRole;
  streamSettings: StreamSettingsForm;
  accessStats:    AccessStats;
  stats:          OrgStats;
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

const TABS: { id: Tab; label: string; danger?: boolean; ownerOnly?: boolean }[] = [
  { id: "generelt",   label: "Generelt"   },
  { id: "utseende",   label: "Utseende"   },
  { id: "funksjoner", label: "Funksjoner" },
  { id: "shop",       label: "Shop"       },
  { id: "statistikk", label: "Statistikk" },
  { id: "faresone",   label: "Faresone", danger: true, ownerOnly: true },
];


// Hvor mange coins gir hver aktivitet (speilet fra src/lib/awardCoins.ts).
// Vises som info — ikke konfigurerbart per org enda.
const COIN_RULES: { reason: string; label: string; coins: number; per: string; icon: string }[] = [
  { reason: "post",            label: "Skrev en post",                coins: 10, per: "2× per dag",  icon: "📝" },
  { reason: "comment",         label: "Kommenterte en post",          coins: 3,  per: "3× per dag",  icon: "💬" },
  { reason: "login",           label: "Innlogging",                   coins: 5,  per: "1× per dag",  icon: "🔑" },
  { reason: "stream",          label: "Så 30 min stream",             coins: 20, per: "1× per dag",  icon: "📺" },
  { reason: "clicker",         label: "Klikk i clicker-spillet",       coins: 1,  per: "20× per dag", icon: "👆" },
  { reason: "game_2048",       label: "Score i 2048",                 coins: 10, per: "10× per dag", icon: "🎮" },
  { reason: "game_2048_bonus", label: "2048-milepæl (512/1024/2048)", coins: 50, per: "3× per dag",  icon: "🏆" },
  { reason: "wordle",          label: "Daglig Wordle",                coins: 15, per: "1× per dag",  icon: "🔤" },
  { reason: "fanpass_bonus",   label: "Aktiverte Fanpass",            coins: 50, per: "Engangs",     icon: "♛"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
        <h3 className="text-sm font-semibold" style={{ color: S.text }}>{title}</h3>
        {desc && <p className="mt-0.5 text-xs" style={{ color: S.muted }}>{desc}</p>}
      </div>
      <div className="rounded-xl p-5" style={{ background: S.surface, border: `1px solid ${S.line}` }}>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium" style={{ color: S.muted }}>{children}</label>;
}

// Pre-allokerte stil-objekter slik at vi ikke lager nye på hver render
const INPUT_STYLE: React.CSSProperties = { background: S.surface2, border: `1px solid ${S.lineHi}`, color: S.text };
const FIELD_LABEL_STYLE: React.CSSProperties = { color: S.muted };
const SUBTLE_TEXT_STYLE: React.CSSProperties = { color: S.subtle };
const TEXT_STYLE: React.CSSProperties = { color: S.text };
const MUTED_TEXT_STYLE: React.CSSProperties = { color: S.muted };
const ROSE_TEXT_STYLE: React.CSSProperties = { color: S.rose };
function inputStyle(): React.CSSProperties { return INPUT_STYLE; }

function PrimaryButton({
  onClick, disabled, children,
}: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
      style={{ background: S.teal, color: S.bg }}
    >
      {children}
    </button>
  );
}

function SavedBadge() {
  return (
    <span className="flex items-center gap-1.5 text-sm" style={{ color: S.teal }}>
      <Check className="h-4 w-4" /> Lagret
    </span>
  );
}

function ImageDropzone({ label, desc, current, onFile }: {
  label: string; desc: string; current: string | null; onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) onFile(f); }}
        onClick={() => inputRef.current?.click()}
        className="relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-colors"
        style={{
          borderColor: dragging ? S.teal : S.lineHi,
          background:  dragging ? `${S.teal}10` : "transparent",
        }}
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="" className="max-h-20 max-w-full rounded-lg object-contain" />
        ) : (
          <>
            <ImageIcon className="h-7 w-7" style={{ color: S.subtle }} />
            <p className="text-center text-xs" style={{ color: S.muted }}>{desc}</p>
            <div
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ background: S.surface2, color: S.text }}
            >
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
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ background: checked ? S.teal : S.surface2 }}>
      <span className={`inline-block h-4 w-4 transform rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
        style={{ background: checked ? S.bg : "var(--text-secondary)" }} />
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
  fanpassOnly:   boolean;
  enabled:       boolean;
}

const ShopAdminTab = memo(function ShopAdminTabImpl({ orgId }: { orgId: string }) {
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

  if (loading) {
    return <div className="py-12 text-center text-sm" style={{ color: S.muted }}>Laster shop…</div>;
  }

  return (
    <div className="max-w-3xl">
      {/* Coin-økonomi-info — viser hva som gir coins i dag */}
      <Section
        title="Hvordan medlemmer tjener coins"
        desc="Disse reglene er felles for alle communities. Egne regler per community kommer senere."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {COIN_RULES.map((rule) => (
            <div
              key={rule.reason}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              style={{ background: S.surface2 }}
            >
              <span className="text-lg w-7 text-center">{rule.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: S.text }}>{rule.label}</p>
                <p className="text-xs" style={{ color: S.subtle }}>{rule.per}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Coins className="h-3.5 w-3.5" style={{ color: S.teal }} />
                <span className="text-sm font-semibold" style={{ color: S.teal }}>+{rule.coins}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: S.subtle }}>
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Fanpass-medlemmer får automatisk 1,5× på alle coin-belønninger.
        </p>
      </Section>

      <Section title="Shop-items" desc="Aktiver/deaktiver items og juster priser for organisasjonens shop.">
        {items.length === 0 ? (
          <p className="text-sm" style={{ color: S.muted }}>Ingen items ennå. Legg til et badge nedenfor.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg px-4 py-3"
                style={{ background: S.surface2, border: `1px solid ${S.line}` }}
              >
                <span className="text-lg w-8 text-center">{item.type === "NAME_COLOR" ? "🎨" : item.value}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: S.text }}>{item.name}</p>
                  <p className="text-xs" style={{ color: S.subtle }}>
                    {item.type}{item.fanpassOnly ? " · Fanpass" : ""}
                  </p>
                </div>
                <input
                  type="number"
                  defaultValue={item.coinCost}
                  onBlur={(e) => { const v = parseInt(e.target.value); if (v > 0 && v !== item.coinCost) void updateCoinCost(item, v); }}
                  className="w-24 rounded-lg px-2 py-1 text-right text-sm outline-none"
                  style={inputStyle()}
                />
                <span className="text-xs" style={{ color: S.subtle }}>coins</span>
                {saving === item.id + "-cost" && <Loader2 className="h-3 w-3 animate-spin" style={{ color: S.muted }} />}
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
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Emoji"
            value={newItem.value}
            onChange={(e) => setNewItem((p) => ({ ...p, value: e.target.value }))}
            className="w-20 rounded-lg px-3 py-2 text-center text-lg outline-none"
            style={inputStyle()}
            maxLength={4}
          />
          <input
            placeholder="Navn (f.eks. Ild-badge)"
            value={newItem.name}
            onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
            className="flex-1 min-w-[200px] rounded-lg px-3 py-2 text-sm outline-none"
            style={inputStyle()}
          />
          <input
            type="number"
            value={newItem.coinCost}
            onChange={(e) => setNewItem((p) => ({ ...p, coinCost: parseInt(e.target.value) || 100 }))}
            className="w-24 rounded-lg px-3 py-2 text-sm outline-none"
            style={inputStyle()}
          />
          <label className="flex items-center gap-1.5 text-xs whitespace-nowrap" style={{ color: S.muted }}>
            <input
              type="checkbox"
              checked={newItem.fanpassOnly}
              onChange={(e) => setNewItem((p) => ({ ...p, fanpassOnly: e.target.checked }))}
              style={{ accentColor: S.teal }}
            />
            Fanpass-only
          </label>
          <button
            onClick={() => void addBadge()}
            disabled={adding || !newItem.name.trim() || !newItem.value.trim()}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ background: S.teal, color: S.bg }}
          >
            <Plus className="h-4 w-4" />
            {adding ? "…" : "Legg til"}
          </button>
        </div>
      </Section>
    </div>
  );
});

// ─── Statistikk-tab ───────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, accent = S.teal,
}: {
  icon:    React.ReactNode;
  label:   string;
  value:   string;
  sub?:    string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: S.surface, border: `1px solid ${S.line}` }}>
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}
        >
          {icon}
        </div>
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: S.muted }}>{label}</p>
      </div>
      <p className="text-2xl font-bold leading-none" style={{ color: S.text }}>{value}</p>
      {sub && <p className="mt-1.5 text-xs" style={{ color: S.subtle }}>{sub}</p>}
    </div>
  );
}

const Sparkline = memo(function SparklineImpl({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) {
    return <div className="text-xs" style={{ color: S.subtle, height }}>Ikke nok data ennå</div>;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 95 - 2.5}`).join(" ");
  const areaPoints = `0,100 ${points} 100,100`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0"   />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
});

function ChartCard({
  title, sub, data, color, suffix,
}: {
  title:  string;
  sub:    string;
  data:   number[];
  color:  string;
  suffix?: string;
}) {
  const last = data[data.length - 1] ?? 0;
  const prev = data[data.length - 2] ?? 0;
  const delta = last - prev;
  const deltaPct = prev > 0 ? ((delta / prev) * 100) : null;
  const deltaPositive = delta >= 0;
  return (
    <div className="rounded-xl p-5" style={{ background: S.surface, border: `1px solid ${S.line}` }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: S.text }}>{title}</h3>
          <p className="mt-0.5 text-xs" style={{ color: S.muted }}>{sub}</p>
        </div>
        {deltaPct !== null && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{
              background: deltaPositive ? `${S.teal}15` : `${S.rose}15`,
              color:      deltaPositive ? S.teal : S.rose,
            }}
          >
            {deltaPositive ? "+" : ""}{deltaPct.toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mb-3 text-2xl font-bold" style={{ color: S.text }}>
        {last.toLocaleString("no-NO")}{suffix ? <span className="ml-1 text-sm font-normal" style={{ color: S.subtle }}>{suffix}</span> : null}
      </p>
      <Sparkline data={data} color={color} />
    </div>
  );
}

const StatistikkTab = memo(function StatistikkTabImpl({ stats }: { stats: OrgStats }) {
  // Fanpass er alltid tilgjengelig nå (vi har droppet OPEN/FREEMIUM-skille)
  const fanpassEnabled = true;
  const monthlyRevenue = stats.activeFanpass * 49;

  return (
    <div className="max-w-5xl">
      {/* Quick KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Medlemmer"
          value={stats.totalMembers.toLocaleString("no-NO")}
          sub={stats.newMembers7d > 0 ? `+${stats.newMembers7d} siste 7d` : "Ingen nye siste 7d"}
          accent={S.blue}
        />
        <StatCard
          icon={<div className="h-1.5 w-1.5 rounded-full" style={{ background: S.teal, boxShadow: `0 0 8px ${S.teal}` }} />}
          label="Aktive nå"
          value={stats.activeNow.toString()}
          sub={`${stats.active7d} aktive denne uka`}
          accent={S.teal}
        />
        <StatCard
          icon={<Coins className="h-4 w-4" />}
          label="Coins i omløp"
          value={stats.coinsInCirculation.toLocaleString("no-NO")}
          sub={`+${stats.coinsAwarded7d.toLocaleString("no-NO")} delt ut siste 7d`}
          accent={S.amber}
        />
        {fanpassEnabled ? (
          <StatCard
            icon={<Crown className="h-4 w-4" />}
            label="Fanpass aktive"
            value={stats.activeFanpass.toString()}
            sub={monthlyRevenue > 0 ? `~${monthlyRevenue} kr/mnd` : "Ingen abonnenter ennå"}
            accent={S.purple}
          />
        ) : (
          <StatCard
            icon={<MessageSquare className="h-4 w-4" />}
            label="Innlegg + meldinger"
            value={(stats.posts7d + stats.messages7d).toLocaleString("no-NO")}
            sub="Siste 7 dager"
            accent={S.pink}
          />
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <ChartCard
          title="Medlemsvekst"
          sub="Antall medlemmer per uke (8 uker)"
          data={stats.memberGrowth}
          color={S.blue}
        />
        <ChartCard
          title="Coin-flyt"
          sub="Coins delt ut per dag (14 dager)"
          data={stats.coinFlow}
          color={S.teal}
          suffix="coins"
        />
      </div>

      {/* Engagement-snippet */}
      <Section title="Engasjement siste 7 dager" desc="Aktivitet på tvers av feed og chat.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label="Innlegg"    value={stats.posts7d} />
          <MiniStat label="Meldinger"  value={stats.messages7d} />
          <MiniStat label="Aktive (7d)" value={stats.active7d} />
          <MiniStat label="Aktive nå"   value={stats.activeNow} />
        </div>
      </Section>
    </div>
  );
});

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg p-3" style={{ background: S.surface2 }}>
      <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: S.subtle }}>{label}</p>
      <p className="text-lg font-bold" style={{ color: S.text }}>{value.toLocaleString("no-NO")}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function InnstillingerClient({
  initialTab, org: initialOrg, theme: initialTheme, features: initialFeatures,
  userRole, streamSettings: initialStream, accessStats, stats,
}: Props) {
  // Tab-switching gjøres lokalt (ikke via router.push), slik at vi ikke trigger
  // full server-refetch (~20 DB-queries) hver gang brukeren bytter tab.
  // URL oppdateres via history.replaceState slik at refresh og lenker fortsatt
  // havner på riktig tab.
  const validTabs: Tab[] = ["generelt", "utseende", "funksjoner", "shop", "statistikk", "faresone"];
  const startTab: Tab = validTabs.includes(initialTab as Tab) ? (initialTab as Tab) : "generelt";
  const [activeTab, setActiveTab] = useState<Tab>(startTab);

  const setTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // ── Generelt state ──
  const [org,        setOrg]        = useState(initialOrg);
  const [genSaving,  setGenSaving]  = useState(false);
  const [genSaved,   setGenSaved]   = useState(false);
  const [genError,   setGenError]   = useState("");

  async function saveGenerelt() {
    setGenSaving(true); setGenError("");
    const res = await fetch("/api/admin/organisation", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: org.id, name: org.name, slug: org.slug, description: org.description }),
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
    <div className="px-4 py-5 md:px-6 md:py-8" style={{ color: S.text }}>
      <h1 className="mb-6 text-xl font-semibold" style={{ color: S.text }}>Innstillinger</h1>

      {/* Tabs — wrap på mobil (ingen horisontal scroll), strekker seg på desktop */}
      <div
        className="mb-8 flex flex-wrap gap-1 rounded-xl p-1 md:flex-nowrap"
        style={{ background: S.surface, border: `1px solid ${S.line}` }}
      >
        {TABS.filter((t) => !t.ownerOnly || isOwner).map((t) => {
          const active = activeTab === t.id;
          const accent = t.danger ? S.rose : S.teal;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="nav-link flex-1 min-w-[44%] whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium sm:min-w-0 md:flex-1 md:px-4"
              data-active={active || undefined}
              style={{
                background: active ? S.surface2 : "transparent",
                color:      active
                  ? (t.danger ? S.rose : S.text)
                  : (t.danger ? S.rose : S.muted),
                boxShadow:  active ? `inset 0 0 0 1px ${accent}40` : undefined,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ══ TAB: GENERELT ══ */}
      {activeTab === "generelt" && (
        <div className="max-w-xl">
          <Section title="Communityet ditt">
            <div className="space-y-4">
              {/* Klikkbar URL-preview */}
              <a
                href={`/${org.slug}/feed`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg px-4 py-3 transition-colors hover:opacity-90"
                style={{ background: `${S.teal}10`, border: `1px solid ${S.teal}30` }}
              >
                <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: S.teal }}>
                  Din community-URL
                </p>
                <p className="text-sm font-semibold" style={{ color: S.text }}>
                  intraa.net/<span style={{ color: S.teal }}>{org.slug}</span>
                  <span className="ml-2 text-xs opacity-60">↗</span>
                </p>
              </a>

              <div>
                <FieldLabel>Navn</FieldLabel>
                <input
                  value={org.name}
                  onChange={(e) => setOrg((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                  style={inputStyle()}
                />
              </div>

              <div>
                <FieldLabel>Slug</FieldLabel>
                <div className="flex items-center rounded-lg px-4 py-2.5" style={inputStyle()}>
                  <span className="mr-1 shrink-0 text-sm" style={{ color: S.subtle }}>intraa.net/</span>
                  <input
                    value={org.slug}
                    onChange={(e) => setOrg((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: S.text }}
                  />
                </div>
                <p className="mt-1 text-xs" style={{ color: S.subtle }}>
                  Endrer du slug, endres også URL-en folk bruker for å finne deg.
                </p>
              </div>

              <div>
                <FieldLabel>Beskrivelse</FieldLabel>
                <textarea
                  value={org.description}
                  onChange={(e) => setOrg((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Hva handler dette communityet om? Vises på discovery-siden."
                  rows={3}
                  maxLength={280}
                  className="w-full resize-none rounded-lg px-4 py-2.5 text-sm outline-none placeholder:opacity-40"
                  style={inputStyle()}
                />
                <p className="mt-1 text-right text-xs" style={{ color: S.subtle }}>
                  {org.description.length}/280
                </p>
              </div>

              <p className="text-xs" style={{ color: S.subtle }}>
                Opprettet {new Date(org.createdAt).toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </Section>

          {genError && <p className="mb-3 text-sm" style={{ color: S.rose }}>{genError}</p>}
          <div className="flex items-center gap-3 mb-10">
            <PrimaryButton onClick={() => void saveGenerelt()} disabled={genSaving}>
              {genSaving ? "Lagrer…" : "Lagre endringer"}
            </PrimaryButton>
            {genSaved && <SavedBadge />}
          </div>

          {/* Stream */}
          <Section title="Stream" desc="Koble til en Twitch- eller YouTube-kanal for live-sending direkte i organisasjonen">
            <div className="space-y-5">
              <div>
                <FieldLabel>Plattform</FieldLabel>
                <div className="flex gap-3">
                  {([["twitch", "Twitch"], ["youtube", "YouTube"]] as [string, string][]).map(([val, label]) => {
                    const active = stream.preferredPlatform === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setStream((p) => ({ ...p, preferredPlatform: val }))}
                        className="rounded-lg px-5 py-2 text-sm font-medium transition-colors"
                        style={{
                          background: active ? S.teal : S.surface2,
                          color:      active ? S.bg   : S.muted,
                          border:     `1px solid ${active ? S.teal : S.lineHi}`,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {stream.preferredPlatform === "twitch" && (
                <div>
                  <FieldLabel>Twitch-kanalnavn</FieldLabel>
                  <div className="flex items-center rounded-lg px-4 py-2.5" style={inputStyle()}>
                    <span className="mr-1 shrink-0 text-sm" style={{ color: S.subtle }}>twitch.tv/</span>
                    <input
                      value={stream.twitchChannel}
                      onChange={(e) => setStream((p) => ({ ...p, twitchChannel: e.target.value.toLowerCase().replace(/\s/g, "") }))}
                      placeholder="kanalnavn"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
                      style={{ color: S.text }}
                    />
                  </div>
                </div>
              )}

              {stream.preferredPlatform === "youtube" && (
                <div>
                  <FieldLabel>YouTube Channel ID</FieldLabel>
                  <input
                    value={stream.youtubeChannel}
                    onChange={(e) => setStream((p) => ({ ...p, youtubeChannel: e.target.value.trim() }))}
                    placeholder="UCxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full rounded-lg px-4 py-2.5 text-sm outline-none placeholder:opacity-40"
                    style={inputStyle()}
                  />
                  <p className="mt-1 text-xs" style={{ color: S.subtle }}>Finn channel ID på youtube.com/account_advanced</p>
                </div>
              )}
            </div>
          </Section>

          {streamError && <p className="mb-3 text-sm" style={{ color: S.rose }}>{streamError}</p>}
          <div className="flex items-center gap-3">
            <PrimaryButton onClick={() => void saveStream()} disabled={streamSaving}>
              {streamSaving ? "Lagrer…" : "Lagre stream-innstillinger"}
            </PrimaryButton>
            {streamSaved && <SavedBadge />}
          </div>
        </div>
      )}

      {/* ══ TAB: UTSEENDE ══ */}
      {activeTab === "utseende" && (
        <div className="max-w-xl">
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
                    className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
                    style={{ color: S.muted }}>
                    <X className="h-3 w-3" /> Fjern logo
                  </button>
                )}
                {bannerPreview && (
                  <button onClick={() => { setBannerFile(null); setBannerPreview(null); updateTheme("bannerUrl", null); }}
                    className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
                    style={{ color: S.muted }}>
                    <X className="h-3 w-3" /> Fjern banner
                  </button>
                )}
              </div>
            )}
          </Section>

          <Section title="Ferdiglagde bannere" desc="Velg en gradient eller last opp eget bilde over.">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {BANNER_PRESETS.map((preset) => {
                const active = selectedBanner === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => void selectBannerPreset(preset)}
                    title={preset.label}
                    className="relative h-16 overflow-hidden rounded-lg transition-all"
                    style={{
                      border:    `2px solid ${active ? S.teal : S.lineHi}`,
                      transform: active ? "scale(1.05)" : undefined,
                      background: preset.css,
                    }}
                  >
                    {active && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(5,8,22,0.3)" }}>
                        <span className="text-lg" style={{ color: S.text }}>✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs" style={{ color: S.muted }}>
              {BANNER_PRESETS.find((p) => p.id === selectedBanner)?.label ?? "Ingen preset valgt"}
            </p>
          </Section>

          <Section title="Ferdiglagde org-avatarer" desc="Velg en avatar eller last opp eget logobilde over.">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {AVATAR_PRESETS.map((preset) => {
                const active = selectedAvatar === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => void selectAvatarPreset(preset)}
                    title={preset.label}
                    className="flex h-16 w-full items-center justify-center rounded-xl text-2xl transition-all"
                    style={{
                      border:    `2px solid ${active ? S.teal : S.lineHi}`,
                      transform: active ? "scale(1.05)" : undefined,
                      background: preset.bg,
                    }}
                  >
                    {preset.emoji}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs" style={{ color: S.muted }}>
              {AVATAR_PRESETS.find((p) => p.id === selectedAvatar)?.label ?? "Ingen preset valgt"}
            </p>
          </Section>

          <Section title="Typografi og stil">
            <div className="mb-5">
              <p className="mb-2 text-xs font-medium" style={{ color: S.muted }}>Fontstil</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FONT_OPTIONS.map((opt) => {
                  const active = theme.fontStyle === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateTheme("fontStyle", opt.value)}
                      className="flex flex-col rounded-xl p-3 text-left transition-all"
                      style={{
                        background: active ? `${S.teal}10` : S.surface2,
                        border:     `1px solid ${active ? S.teal : S.lineHi}`,
                      }}
                    >
                      <span className="text-sm font-semibold" style={{ color: S.text }}>{opt.label}</span>
                      <span className="mt-0.5 text-[10px]" style={{ color: S.subtle }}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium" style={{ color: S.muted }}>Hjørnestil</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {BORDER_RADIUS_OPTIONS.map((opt) => {
                  const br = opt.value === "rounded-none" ? "0" : opt.value === "rounded-sm" ? "4px" : opt.value === "rounded-lg" ? "8px" : "16px";
                  const active = theme.borderRadius === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateTheme("borderRadius", opt.value)}
                      className="flex flex-col items-center gap-2 p-3 transition-all"
                      style={{
                        background: active ? `${S.teal}10` : S.surface2,
                        border:     `1px solid ${active ? S.teal : S.lineHi}`,
                        borderRadius: br,
                      }}
                    >
                      <div className="h-6 w-full"
                        style={{ background: S.surface, border: `1px solid ${S.line}`, borderRadius: br }} />
                      <span className="text-xs font-medium" style={{ color: S.muted }}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>

          <Section title="Velkomstmelding" desc="Vises på feed når nye brukere logger inn for første gang">
            <textarea
              value={theme.welcomeMessage}
              onChange={(e) => updateTheme("welcomeMessage", e.target.value)}
              placeholder="Velkommen! 👋 Her finner du alt du trenger…"
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-lg px-4 py-3 text-sm outline-none placeholder:opacity-40"
              style={inputStyle()}
            />
            <p className="mt-1 text-right text-xs" style={{ color: S.subtle }}>
              {theme.welcomeMessage.length}/500
            </p>
          </Section>

          {themeError && <p className="mb-3 text-sm" style={{ color: S.rose }}>{themeError}</p>}
          <div className="flex items-center gap-3">
            <PrimaryButton onClick={() => void saveTheme()} disabled={themeSaving}>
              {themeSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {themeSaving ? "Lagrer…" : "Lagre"}
            </PrimaryButton>
            {themeSaved && <SavedBadge />}
          </div>
        </div>
      )}

      {/* ══ TAB: FUNKSJONER ══ */}
      {activeTab === "funksjoner" && (
        <div className="max-w-xl">
          {!isOwner && (
            <div
              className="mb-6 rounded-xl px-5 py-4"
              style={{ background: `${S.amber}10`, border: `1px solid ${S.amber}30` }}
            >
              <p className="text-sm" style={{ color: S.amber }}>Kun eieren av organisasjonen kan endre funksjoner.</p>
            </div>
          )}
          <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${S.line}`, background: S.surface }}>
            {relevantFeatures.map((feature, i) => {
              const defaultEnabled = !DISABLED_BY_DEFAULT.has(feature);
              const isEnabled = features[feature] ?? defaultEnabled;
              const isLast = i === relevantFeatures.length - 1;
              return (
                <div
                  key={feature}
                  className="flex items-center justify-between px-5 py-4 transition-colors"
                  style={{ borderBottom: isLast ? undefined : `1px solid ${S.line}` }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: S.text }}>{FEATURE_LABELS[feature]}</p>
                    <p className="text-xs" style={{ color: S.muted }}>{FEATURE_DESCRIPTIONS[feature]}</p>
                    {feature === "live" && isEnabled && (
                      <button
                        onClick={() => setTab("generelt")}
                        className="mt-1 text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ color: S.teal }}
                      >
                        Konfigurer stream →
                      </button>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {featSaving[feature] && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: S.muted }} />}
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
          <p className="mt-3 text-xs" style={{ color: S.subtle }}>
            Endringer trer i kraft umiddelbart for alle medlemmer.
          </p>
        </div>
      )}

      {/* ══ TAB: SHOP ══ */}
      {activeTab === "shop" && <ShopAdminTab orgId={org.id} />}

      {/* ══ TAB: STATISTIKK ══ */}
      {activeTab === "statistikk" && (
        <StatistikkTab stats={stats} />
      )}

      {/* ══ TAB: FARESONE (kun OWNER) ══ */}
      {activeTab === "faresone" && isOwner && (
        <div className="max-w-xl">
          <div className="mb-6 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: S.rose }} />
            <div>
              <h3 className="text-sm font-semibold" style={{ color: S.text }}>Faresone</h3>
              <p className="mt-0.5 text-xs" style={{ color: S.muted }}>
                Handlinger her kan ikke angres. Vær forsiktig.
              </p>
            </div>
          </div>

          <div
            className="rounded-xl p-5"
            style={{ background: `${S.rose}08`, border: `1px solid ${S.rose}30` }}
          >
            <h4 className="mb-1 text-sm font-semibold" style={{ color: S.rose }}>
              Slett organisasjon
            </h4>
            <p className="mb-4 text-xs" style={{ color: S.muted }}>
              Dette vil permanent slette alle data tilknyttet organisasjonen — medlemmer,
              kanaler, meldinger, coins, Fanpass-historikk og filer. Handlingen kan ikke angres.
            </p>
            <button
              disabled
              className="rounded-lg px-4 py-2 text-sm font-semibold cursor-not-allowed"
              style={{ background: `${S.rose}20`, color: S.rose, opacity: 0.6 }}
            >
              Slett organisasjon — kontakt Intraa support
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
