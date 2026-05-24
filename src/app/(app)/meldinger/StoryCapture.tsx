"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Image as ImageIcon, X, RotateCw, Loader2, Send, Type, AlertTriangle, Briefcase, Check } from "lucide-react";

type Step = "choose" | "camera" | "preview" | "uploading";

interface Props {
  channelId: string;
  onClose:   () => void;
  onPosted:  () => void;
}

/**
 * Image compression — scales to max 1080px on long edge, JPEG quality 0.85.
 * Returns a File with the new blob.
 */
async function compress(blob: Blob, maxPx = 1080): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
      canvas.toBlob((b) => {
        if (!b) return reject(new Error("Canvas toBlob failed"));
        resolve(new File([b], `story-${Date.now()}.jpg`, { type: "image/jpeg" }));
      }, "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

interface SponsorOption {
  id:        string;
  slug:      string;
  brandName: string;
  logoUrl:   string | null;
}

export default function StoryCapture({ channelId, onClose, onPosted }: Props) {
  const [step,       setStep]       = useState<Step>("choose");
  const [error,      setError]      = useState<string | null>(null);
  const [facing,     setFacing]     = useState<"user" | "environment">("environment");
  const [imageFile,  setImageFile]  = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption,    setCaption]    = useState("");
  const [dims,       setDims]       = useState<{ w: number; h: number } | null>(null);

  // Sponsor tagging
  const [sponsorPickerOpen, setSponsorPickerOpen] = useState(false);
  const [sponsors,          setSponsors]          = useState<SponsorOption[]>([]);
  const [selectedSponsor,   setSelectedSponsor]   = useState<SponsorOption | null>(null);
  const [sponsorSearch,     setSponsorSearch]     = useState("");

  // Lazy-fetch sponsors on first open
  async function openSponsorPicker() {
    setSponsorPickerOpen(true);
    if (sponsors.length === 0) {
      try {
        const res = await fetch("/api/sponsors");
        if (res.ok) {
          const data = await res.json() as { sponsors: SponsorOption[] };
          setSponsors(data.sponsors);
        }
      } catch { /* silent */ }
    }
  }

  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start / restart camera when entering camera step or switching facing
  useEffect(() => {
    if (step !== "camera") return;
    let cancelled = false;

    async function start() {
      // Stop any existing stream
      streamRef.current?.getTracks().forEach((t) => t.stop());

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => null);
        }
      } catch (err) {
        console.warn("[story] camera error:", err);
        setError("Kunne ikke åpne kamera. Sjekk at appen har tillatelse.");
      }
    }

    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [step, facing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Capture from camera ─────────────────────────────────────────────────
  async function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;

    const w = video.videoWidth  || 1280;
    const h = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Front-facing camera: mirror horizontally so what user sees matches output
    if (facing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = await compress(blob);
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setDims({ w: file.size > 0 ? canvas.width : 0, h: canvas.height });

      // Stop stream — we don't need camera anymore
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      setStep("preview");
    }, "image/jpeg", 0.92);
  }

  // ── Gallery (file picker) ───────────────────────────────────────────────
  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Bare bildefiler er tillatt");
      return;
    }
    const compressed = await compress(file);
    setImageFile(compressed);

    // Get dims for layout hint
    const url = URL.createObjectURL(compressed);
    setPreviewUrl(url);
    const img = new Image();
    img.onload = () => setDims({ w: img.width, h: img.height });
    img.src = url;

    setStep("preview");
  }

  // ── Send to server ──────────────────────────────────────────────────────
  async function send() {
    if (!imageFile) return;
    setStep("uploading");
    setError(null);

    try {
      // Step 1: upload image to /api/upload
      const fd = new FormData();
      fd.append("file", imageFile);
      const upRes = await fetch("/api/upload", { method: "POST", body: fd });
      if (!upRes.ok) {
        const d = await upRes.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Opplasting feilet");
      }
      const { url } = await upRes.json() as { url: string };

      // Step 2: create story
      const stRes = await fetch(`/api/channels/${channelId}/stories`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          imageUrl:  url,
          caption:   caption.trim() || null,
          width:     dims?.w ?? null,
          height:    dims?.h ?? null,
          sponsorId: selectedSponsor?.id ?? null,
        }),
      });
      if (!stRes.ok) {
        const d = await stRes.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Kunne ikke poste story");
      }

      onPosted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
      setStep("preview");
    }
  }

  // ────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{
        background:           "rgba(5,8,22,0.92)",
        backdropFilter:       "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10"
        style={{ background: "rgba(255,255,255,0.06)", color: "#fff" }}
      >
        <X className="h-5 w-5" />
      </button>

      {/* ── Step: chooser ──────────────────────────────────────────────── */}
      {step === "choose" && (
        <div className="w-full max-w-md px-6">
          <h2 className="mb-1 text-center text-xl font-bold text-white">Legg til story</h2>
          <p className="mb-7 text-center text-sm text-white/50">
            Stories er synlige i 24 timer for ♛-medlemmer
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setStep("camera")}
              className="flex aspect-square flex-col items-center justify-center gap-3 rounded-3xl p-6 transition-transform hover:scale-[1.03]"
              style={{
                background: "linear-gradient(135deg, rgba(94,234,212,0.15), rgba(168,85,247,0.20))",
                border:     "1px solid rgba(168,85,247,0.30)",
              }}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "linear-gradient(135deg, #5EEAD4, #A855F7)", color: "#fff" }}
              >
                <Camera className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold text-white">Ta bilde</span>
              <span className="-mt-2 text-[11px] text-white/50">Kamera</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-3 rounded-3xl p-6 transition-transform hover:scale-[1.03]"
              style={{
                background: "rgba(255,255,255,0.05)",
                border:     "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "rgba(255,255,255,0.10)", color: "#fff" }}
              >
                <ImageIcon className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold text-white">Velg fra galleri</span>
              <span className="-mt-2 text-[11px] text-white/50">Bilder</span>
            </button>
          </div>

          {/* Hidden file input for gallery */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── Step: camera ───────────────────────────────────────────────── */}
      {step === "camera" && (
        <div className="relative h-full w-full max-w-[440px] sm:max-h-[780px] sm:aspect-[9/16] sm:my-auto overflow-hidden bg-black sm:rounded-3xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }}
          />

          {/* Top bar: switch camera */}
          <div className="absolute top-4 left-4 right-16 flex gap-2">
            <button
              onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
              title="Bytt kamera"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          {/* Capture button */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <button
              onClick={() => void capturePhoto()}
              aria-label="Ta bilde"
              className="flex h-20 w-20 items-center justify-center rounded-full transition-transform active:scale-90"
              style={{
                background: "rgba(255,255,255,0.15)",
                border:     "4px solid #fff",
              }}
            >
              <span
                className="block h-14 w-14 rounded-full"
                style={{ background: "#fff" }}
              />
            </button>
          </div>

          {error && (
            <div className="absolute bottom-32 left-4 right-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-xs text-rose-100 backdrop-blur">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── Step: preview ──────────────────────────────────────────────── */}
      {(step === "preview" || step === "uploading") && previewUrl && (
        <div className="relative h-full w-full max-w-[440px] sm:max-h-[780px] sm:aspect-[9/16] sm:my-auto overflow-hidden bg-black sm:rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="h-full w-full object-contain"
          />

          {/* Caption input — gradient overlay at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 px-4 pt-12 pb-4"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
            }}
          >
            {/* Sponsor tag chip — kompakt over caption */}
            <button
              type="button"
              onClick={() => void openSponsorPicker()}
              disabled={step === "uploading"}
              className="mb-2 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors"
              style={{
                background: selectedSponsor ? "rgba(96,165,250,0.20)" : "rgba(0,0,0,0.4)",
                border:     selectedSponsor ? "1px solid rgba(96,165,250,0.45)" : "1px solid rgba(255,255,255,0.15)",
                color:      selectedSponsor ? "#fff" : "rgba(255,255,255,0.6)",
                backdropFilter: "blur(10px)",
              }}
            >
              {selectedSponsor ? (
                <>
                  <div
                    className="h-4 w-4 rounded shrink-0"
                    style={{
                      background: selectedSponsor.logoUrl
                        ? `url(${selectedSponsor.logoUrl}) center/cover`
                        : "linear-gradient(135deg, #60A5FA, #A855F7)",
                    }}
                  />
                  <span className="font-semibold">Sponsoret av {selectedSponsor.brandName}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); setSelectedSponsor(null); }}
                    className="text-white/60 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </>
              ) : (
                <>
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Legg til sponsor</span>
                </>
              )}
            </button>

            <div className="mb-3 flex items-start gap-2 rounded-2xl px-3 py-2.5"
                 style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)" }}>
              <Type className="mt-1 h-4 w-4 shrink-0 text-white/50" />
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Legg til en caption…"
                rows={2}
                maxLength={280}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none resize-none"
                disabled={step === "uploading"}
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => { setStep("choose"); setPreviewUrl(null); setImageFile(null); setCaption(""); }}
                disabled={step === "uploading"}
                className="rounded-full px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                Forkast
              </button>
              <button
                onClick={() => void send()}
                disabled={step === "uploading"}
                className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.03] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
                  color:      "#fff",
                  boxShadow:  "0 4px 16px rgba(168,85,247,0.5)",
                }}
              >
                {step === "uploading"
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sender…</>
                  : <><Send className="h-4 w-4" /> Send til ♛</>}
              </button>
            </div>
          </div>

          {error && step === "preview" && (
            <div className="absolute top-4 left-4 right-16 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-xs text-rose-100 backdrop-blur">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Sponsor picker modal — nested */}
          {sponsorPickerOpen && (
            <div
              onClick={() => setSponsorPickerOpen(false)}
              className="absolute inset-0 z-30 flex items-end sm:items-center justify-center"
              style={{ background: "rgba(5,8,22,0.85)", backdropFilter: "blur(8px)" }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-sm sm:rounded-2xl overflow-hidden"
                style={{ background: "var(--bg-secondary)", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Velg sponsor</p>
                  <button
                    onClick={() => setSponsorPickerOpen(false)}
                    className="text-white/40 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-3 border-b border-white/10">
                  <input
                    value={sponsorSearch}
                    onChange={(e) => setSponsorSearch(e.target.value)}
                    placeholder="Søk etter brand…"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                  />
                </div>
                <div className="max-h-[50vh] overflow-y-auto">
                  {sponsors.length === 0 ? (
                    <p className="p-6 text-center text-xs text-white/50">
                      Ingen sponsors registrert ennå.
                    </p>
                  ) : (
                    sponsors
                      .filter((s) => !sponsorSearch || s.brandName.toLowerCase().includes(sponsorSearch.toLowerCase()))
                      .map((s) => {
                        const isSel = selectedSponsor?.id === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => { setSelectedSponsor(s); setSponsorPickerOpen(false); }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                          >
                            <div
                              className="h-9 w-9 shrink-0 rounded-lg"
                              style={{
                                background: s.logoUrl
                                  ? `url(${s.logoUrl}) center/cover`
                                  : "linear-gradient(135deg, #60A5FA, #A855F7)",
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{s.brandName}</p>
                              <p className="text-[11px] text-white/40 truncate">@{s.slug}</p>
                            </div>
                            {isSel && <Check className="h-4 w-4 shrink-0" style={{ color: "#60A5FA" }} />}
                          </button>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
