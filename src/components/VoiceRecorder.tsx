"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, X, Send, Loader2 } from "lucide-react";

interface Props {
  /** Called when user sends a recording. Returns when upload completes. */
  onSend:    (audioUrl: string, durationSec: number) => Promise<void> | void;
  /** Called when user cancels (closes the recorder UI without sending). */
  onCancel:  () => void;
  /** Max recording length in seconds. Default 300 (5 min). */
  maxSeconds?: number;
}

/**
 * Voice note recorder.
 * - Requests mic permission on mount
 * - Uses MediaRecorder API (webm/opus preferred, falls back to default)
 * - Shows live amplitude bars + elapsed time
 * - Upload to /api/upload on Send
 */
export default function VoiceRecorder({ onSend, onCancel, maxSeconds = 300 }: Props) {
  const [state, setState]     = useState<"requesting" | "ready" | "recording" | "preview" | "uploading" | "error">("requesting");
  const [error, setError]     = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef        = useRef<MediaStream  | null>(null);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const startTimeRef     = useRef<number>(0);
  const rafRef           = useRef<number>(0);
  const timerRef         = useRef<NodeJS.Timeout | null>(null);
  const blobRef          = useRef<Blob | null>(null);
  const durationRef      = useRef<number>(0);

  // Request mic permission immediately on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        // Setup audio analyser for amplitude visualization
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        setState("ready");
        // Auto-start recording — user tapped mic, they want to record
        startRecording();
      } catch (err) {
        console.warn("[voice] mic error:", err);
        setError("Kunne ikke få mikrofon-tilgang");
        setState("error");
      }
    }

    void init();
    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanup() {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    void audioCtxRef.current?.close().catch(() => null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }

  function startRecording() {
    if (!streamRef.current) return;

    // Pick the best supported mime type
    const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

    const mr = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType });
      blobRef.current = blob;
      durationRef.current = Math.round((Date.now() - startTimeRef.current) / 1000);
      setPreviewUrl(URL.createObjectURL(blob));
      setState("preview");
    };
    mr.start();
    mediaRecorderRef.current = mr;
    startTimeRef.current = Date.now();
    setElapsed(0);
    setState("recording");

    // Tick elapsed time
    timerRef.current = setInterval(() => {
      const sec = Math.round((Date.now() - startTimeRef.current) / 1000);
      setElapsed(sec);
      if (sec >= maxSeconds) stopRecording();
    }, 200);

    // Amplitude loop
    const buf = new Uint8Array(analyserRef.current!.frequencyBinCount);
    const tick = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += (buf[i] ?? 0);
      setAmplitude(Math.min(1, sum / (buf.length * 128)));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }

  async function handleSend() {
    if (!blobRef.current) return;
    setState("uploading");
    try {
      const ext = blobRef.current.type.includes("webm") ? "webm"
                : blobRef.current.type.includes("mp4")  ? "m4a"
                : blobRef.current.type.includes("ogg")  ? "ogg"
                : "audio";
      const file = new File([blobRef.current], `voicenote-${Date.now()}.${ext}`, { type: blobRef.current.type });
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Opplasting feilet");
      }
      const data = await res.json() as { url: string };
      await onSend(data.url, durationRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sending feilet");
      setState("preview");
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }

  // ── States ──────────────────────────────────────────────────────────────────

  if (state === "error") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
        <Mic className="h-4 w-4 shrink-0" />
        <span className="flex-1">{error ?? "Mikrofon utilgjengelig"}</span>
        <button onClick={onCancel} className="text-xs text-rose-200 hover:text-white">Lukk</button>
      </div>
    );
  }

  if (state === "requesting") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span className="flex-1">Spør om mikrofon-tilgang…</span>
        <button onClick={onCancel} className="text-xs text-zinc-500 hover:text-white">Avbryt</button>
      </div>
    );
  }

  if (state === "recording" || state === "ready") {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{ background: "rgba(168,85,247,0.10)", border: "1px solid rgba(168,85,247,0.3)" }}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
        </span>
        <span className="text-xs font-mono text-white tabular-nums shrink-0">
          {formatTime(elapsed)}
        </span>

        {/* Amplitude bars */}
        <div className="flex items-center gap-0.5 flex-1 h-6">
          {Array.from({ length: 24 }).map((_, i) => {
            const dist = Math.abs(i - 12) / 12;
            const intensity = Math.max(0.15, amplitude * (1 - dist * 0.6));
            return (
              <span
                key={i}
                className="flex-1 rounded-full"
                style={{
                  height: `${Math.max(15, intensity * 100)}%`,
                  background: `linear-gradient(to top, #5EEAD4, #A855F7)`,
                  opacity: 0.4 + intensity * 0.6,
                  transition: "height 80ms ease, opacity 80ms ease",
                }}
              />
            );
          })}
        </div>

        <button
          onClick={onCancel}
          title="Avbryt"
          className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={stopRecording}
          title="Stopp og forhåndsvis"
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full text-white transition-transform hover:scale-105"
          style={{ background: "linear-gradient(135deg, #5EEAD4, #A855F7)" }}
        >
          <span className="block h-3 w-3 rounded-sm bg-white/90" />
        </button>
      </div>
    );
  }

  // Preview state
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <Mic className="h-4 w-4 shrink-0" style={{ color: "#A855F7" }} />
      <span className="text-xs text-zinc-400 shrink-0">{formatTime(durationRef.current)}</span>
      {previewUrl && (
        <audio src={previewUrl} controls className="flex-1 h-8" />
      )}
      <button
        onClick={onCancel}
        disabled={state === "uploading"}
        title="Forkast"
        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
      <button
        onClick={() => void handleSend()}
        disabled={state === "uploading"}
        title="Send"
        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full text-white transition-transform hover:scale-105 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #5EEAD4, #A855F7)" }}
      >
        {state === "uploading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
    </div>
  );
}
