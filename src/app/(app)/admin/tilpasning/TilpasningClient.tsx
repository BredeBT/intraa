"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Check, Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Theme {
  logoUrl:         string | null;
  bannerUrl:       string | null;
  primaryColor:    string;
  accentColor:     string;
  backgroundColor: string;
  sidebarColor:    string;
  borderRadius:    string;
  fontStyle:       string;
  welcomeMessage:  string;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: { name: string; colors: Pick<Theme, "primaryColor" | "accentColor" | "backgroundColor" | "sidebarColor"> }[] = [
  { name: "Standard",   colors: { primaryColor: "#7c3aed", accentColor: "#a855f7", backgroundColor: "#09090b", sidebarColor: "#18181b" } },
  { name: "Midnatt",    colors: { primaryColor: "#2563eb", accentColor: "#3b82f6", backgroundColor: "#020617", sidebarColor: "#0f172a" } },
  { name: "Skog",       colors: { primaryColor: "#16a34a", accentColor: "#22c55e", backgroundColor: "#052e16", sidebarColor: "#14532d" } },
  { name: "Solnedgang", colors: { primaryColor: "#ea580c", accentColor: "#f97316", backgroundColor: "#0c0a09", sidebarColor: "#1c1917" } },
  { name: "Hav",        colors: { primaryColor: "#0891b2", accentColor: "#06b6d4", backgroundColor: "#042f2e", sidebarColor: "#134e4a" } },
  { name: "Rose",       colors: { primaryColor: "#e11d48", accentColor: "#f43f5e", backgroundColor: "#0c0a09", sidebarColor: "#1c1917" } },
];

const BORDER_RADIUS_OPTIONS = [
  { value: "rounded-none", label: "Skarpe" },
  { value: "rounded-sm",   label: "Litt runde" },
  { value: "rounded-lg",   label: "Runde" },
  { value: "rounded-2xl",  label: "Svært runde" },
];

const FONT_OPTIONS = [
  { value: "default",  label: "Standard",  desc: "Systemfont, nøytral og ryddig" },
  { value: "modern",   label: "Moderne",   desc: "Inter / sans-serif" },
  { value: "classic",  label: "Klassisk",  desc: "Georgia / serif" },
  { value: "mono",     label: "Monospace", desc: "JetBrains Mono" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function uploadImage(file: File, folder: string): Promise<string> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) return ((await res.json()) as { url: string }).url;
  } catch { /* fall through */ }
  // base64 fallback
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
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

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
      <div className="flex items-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 transition-colors focus-within:border-indigo-500">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0 outline-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
          maxLength={7}
          className="flex-1 bg-transparent font-mono text-sm text-white outline-none"
        />
        <div className="h-5 w-5 shrink-0 rounded-full border border-zinc-600" style={{ backgroundColor: value }} />
      </div>
    </div>
  );
}

function ImageDropzone({
  label, desc, current, onFile,
}: {
  label:   string;
  desc:    string;
  current: string | null;
  onFile:  (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) onFile(file);
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
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
            <ImageIcon className="h-8 w-8 text-zinc-600" />
            <p className="text-center text-xs text-zinc-500">{desc}</p>
            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300">
              <Upload className="h-3.5 w-3.5" /> Velg bilde
            </div>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </div>
      <p className="mt-1 text-[10px] text-zinc-600">{desc}</p>
    </div>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

function LivePreview({ theme, logoUrl }: { theme: Theme; logoUrl: string | null }) {
  const br = theme.borderRadius === "rounded-none" ? "0px"
    : theme.borderRadius === "rounded-sm"  ? "4px"
    : theme.borderRadius === "rounded-lg"  ? "8px"
    : "16px";

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 shadow-2xl" style={{ borderRadius: br }}>
      <div className="flex h-52">
        {/* Mini sidebar */}
        <div className="flex w-24 shrink-0 flex-col" style={{ backgroundColor: theme.sidebarColor }}>
          {/* Org header */}
          <div className="flex items-center gap-1.5 border-b border-white/10 px-2 py-2.5">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-5 w-5 rounded object-cover" />
            ) : (
              <div className="h-5 w-5 rounded" style={{ backgroundColor: theme.primaryColor }} />
            )}
            <span className="truncate text-[8px] font-bold text-white/80">Org</span>
          </div>
          {/* Nav items */}
          <div className="flex flex-col gap-0.5 px-1.5 py-2">
            {["Feed", "Chat", "Tickets", "Filer"].map((item, i) => (
              <div
                key={item}
                className="rounded px-1.5 py-1 text-[7px] font-medium"
                style={{
                  backgroundColor: i === 0 ? theme.primaryColor : "transparent",
                  color: i === 0 ? "#fff" : "rgba(255,255,255,0.4)",
                  borderRadius: br,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        {/* Main area */}
        <div className="flex flex-1 flex-col" style={{ backgroundColor: theme.backgroundColor }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="text-[8px] font-semibold text-white/70">Feed</span>
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
          </div>
          {/* Feed cards */}
          <div className="flex flex-1 flex-col gap-1.5 overflow-hidden p-2">
            {[85, 65, 75].map((w, i) => (
              <div key={i} className="border border-white/10 p-2" style={{ backgroundColor: theme.sidebarColor, borderRadius: br }}>
                <div className="mb-1 flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                  <div className="h-1.5 rounded-full bg-white/20" style={{ width: `${w / 3}px` }} />
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10" />
                <div className="mt-0.5 rounded-full bg-white/10" style={{ height: "6px", width: `${w}%` }} />
              </div>
            ))}
          </div>
          {/* Button example */}
          <div className="border-t border-white/10 px-3 py-1.5">
            <div className="inline-flex items-center rounded px-2 py-0.5 text-[7px] font-semibold text-white"
              style={{ backgroundColor: theme.primaryColor, borderRadius: br }}>
              Ny melding
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TilpasningClient({ initial }: { initial: Theme }) {
  const [theme,    setTheme]    = useState<Theme>(initial);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");

  // Separate preview states for logo/banner (show upload immediately)
  const [logoPreview,   setLogoPreview]   = useState<string | null>(initial.logoUrl);
  const [bannerPreview, setBannerPreview] = useState<string | null>(initial.bannerUrl);
  const [logoFile,      setLogoFile]      = useState<File | null>(null);
  const [bannerFile,    setBannerFile]    = useState<File | null>(null);

  // Paste support for logo
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function update<K extends keyof Theme>(key: K, val: Theme[K]) {
    setTheme((p) => ({ ...p, [key]: val }));
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    setTheme((p) => ({ ...p, ...preset.colors }));
  }

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError("");

    let logoUrl   = theme.logoUrl;
    let bannerUrl = theme.bannerUrl;

    if (logoFile) {
      logoUrl = await uploadImage(logoFile, "logos");
    }
    if (bannerFile) {
      bannerUrl = await uploadImage(bannerFile, "banners");
    }

    const res = await fetch("/api/tenant/theme", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...theme, logoUrl, bannerUrl }),
    });

    if (res.ok) {
      const data = await res.json() as { theme: Theme };
      setTheme({ ...data.theme, welcomeMessage: data.theme.welcomeMessage ?? "" });
      setLogoFile(null);
      setBannerFile(null);
      setSaved(true);
      // Inject CSS vars immediately
      applyThemeToDom({ ...data.theme });
      setTimeout(() => setSaved(false), 2500);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Noe gikk galt");
    }
    setSaving(false);
  }, [saving, theme, logoFile, bannerFile]);

  return (
    <div className="px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Tilpasning</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Tilpass utseendet til organisasjonen din</p>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-rose-400">{error}</p>}
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-400">
              <Check className="h-4 w-4" /> Lagret og aktivert
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Lagrer…" : "Lagre og aktiver"}
          </button>
        </div>
      </div>

      <div className="flex gap-8 xl:items-start">
        {/* ── Left: settings ── */}
        <div className="min-w-0 flex-1">

          {/* A) Logo og banner */}
          <Section title="Logo og banner" desc="Logoen vises i sidebaren. Banneret vises øverst på feed-siden.">
            <div className="grid gap-5 sm:grid-cols-2">
              <ImageDropzone
                label="Logo"
                desc="Klikk, dra og slipp, eller Ctrl+V"
                current={logoPreview}
                onFile={(f) => { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }}
              />
              <ImageDropzone
                label="Bannerbilde"
                desc="Anbefalt: 1200×300px"
                current={bannerPreview}
                onFile={(f) => { setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); }}
              />
            </div>
            {(logoPreview ?? bannerPreview) && (
              <div className="mt-3 flex gap-3">
                {logoPreview && (
                  <button
                    onClick={() => { setLogoFile(null); setLogoPreview(null); update("logoUrl", null); }}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-rose-400"
                  >
                    <X className="h-3 w-3" /> Fjern logo
                  </button>
                )}
                {bannerPreview && (
                  <button
                    onClick={() => { setBannerFile(null); setBannerPreview(null); update("bannerUrl", null); }}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-rose-400"
                  >
                    <X className="h-3 w-3" /> Fjern banner
                  </button>
                )}
              </div>
            )}
          </Section>

          {/* B) Farger */}
          <Section title="Farger" desc="Velg et ferdig tema eller tilpass fargene manuelt">
            {/* Presets */}
            <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  title={preset.name}
                  className="group flex flex-col items-center gap-1.5 rounded-xl border border-zinc-700 p-2.5 transition-all hover:border-zinc-500 hover:bg-zinc-800"
                >
                  <div className="flex gap-0.5">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: preset.colors.primaryColor }} />
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: preset.colors.accentColor }} />
                  </div>
                  <span className="text-[9px] font-medium text-zinc-400 group-hover:text-white">{preset.name}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorInput label="Primærfarge"   value={theme.primaryColor}    onChange={(v) => update("primaryColor", v)} />
              <ColorInput label="Aksentfarge"   value={theme.accentColor}     onChange={(v) => update("accentColor", v)} />
              <ColorInput label="Bakgrunnsfarge" value={theme.backgroundColor} onChange={(v) => update("backgroundColor", v)} />
              <ColorInput label="Sidefeltfarge" value={theme.sidebarColor}    onChange={(v) => update("sidebarColor", v)} />
            </div>
          </Section>

          {/* C) Typografi */}
          <Section title="Typografi og stil">
            <div className="mb-5">
              <p className="mb-2 text-xs font-medium text-zinc-400">Fontstil</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FONT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update("fontStyle", opt.value)}
                    className={`flex flex-col rounded-xl border p-3 text-left transition-all ${
                      theme.fontStyle === opt.value
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800"
                    }`}
                  >
                    <span className="text-sm font-semibold text-white">{opt.label}</span>
                    <span className="mt-0.5 text-[10px] text-zinc-500">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-400">Hjørnestil på kort og bokser</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {BORDER_RADIUS_OPTIONS.map((opt) => {
                  const br = opt.value === "rounded-none" ? "0" : opt.value === "rounded-sm" ? "4px" : opt.value === "rounded-lg" ? "8px" : "16px";
                  return (
                    <button
                      key={opt.value}
                      onClick={() => update("borderRadius", opt.value)}
                      className={`flex flex-col items-center gap-2 border p-3 transition-all ${
                        theme.borderRadius === opt.value
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800"
                      }`}
                      style={{ borderRadius: br }}
                    >
                      <div className="h-6 w-full border border-zinc-600 bg-zinc-800" style={{ borderRadius: br }} />
                      <span className="text-xs font-medium text-zinc-300">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* D) Velkomstmelding */}
          <Section title="Velkomstmelding" desc="Vises på feed når nye brukere logger inn for første gang">
            <textarea
              value={theme.welcomeMessage}
              onChange={(e) => update("welcomeMessage", e.target.value)}
              placeholder="Velkommen til organisasjonen! 👋 Her finner du alt du trenger for å komme i gang…"
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500"
            />
            <p className="mt-1 text-right text-xs text-zinc-600">{theme.welcomeMessage.length}/500</p>
          </Section>
        </div>

        {/* ── Right: live preview ── */}
        <div className="hidden w-72 shrink-0 xl:block">
          <div className="sticky top-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Forhåndsvisning</p>
            <LivePreview theme={theme} logoUrl={logoPreview} />
            <p className="mt-3 text-center text-[10px] text-zinc-600">Oppdateres i sanntid</p>
          </div>
        </div>
      </div>

      {/* Bottom save */}
      <div className="mt-4 flex items-center justify-end gap-3 border-t border-zinc-800 pt-6">
        {error && <p className="text-sm text-rose-400">{error}</p>}
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-400">
            <Check className="h-4 w-4" /> Lagret og aktivert
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Lagrer…" : "Lagre og aktiver"}
        </button>
      </div>
    </div>
  );
}

// ─── Apply theme to DOM ───────────────────────────────────────────────────────

function applyThemeToDom(theme: Theme) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary",    theme.primaryColor);
  root.style.setProperty("--color-accent",     theme.accentColor);
  root.style.setProperty("--color-bg",         theme.backgroundColor);
  root.style.setProperty("--color-sidebar",    theme.sidebarColor);

  // Font
  const fontMap: Record<string, string> = {
    default:  "system-ui, sans-serif",
    modern:   "Inter, sans-serif",
    classic:  "Georgia, serif",
    mono:     "'JetBrains Mono', monospace",
  };
  root.style.setProperty("--font-body", fontMap[theme.fontStyle] ?? fontMap.default!);
}
