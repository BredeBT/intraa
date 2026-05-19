"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

/**
 * Voice-note playback component.
 * Shows play/pause + progress bar + duration.
 * Fixed-width inside chat bubbles so it doesn't sprawl.
 */
export default function VoiceMessage({
  url,
  durationSec,
}: {
  url:         string;
  durationSec: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(durationSec ?? 0);

  // Sync audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setCurrent(audio.currentTime);
      setProgress(audio.duration > 0 ? audio.currentTime / audio.duration : 0);
    };
    const onMeta = () => {
      if (audio.duration && isFinite(audio.duration)) setDuration(Math.round(audio.duration));
    };
    const onEnd  = () => { setPlaying(false); setProgress(0); setCurrent(0); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  }

  return (
    <div
      className="inline-flex items-center gap-3 rounded-2xl px-3 py-2 max-w-[280px]"
      style={{
        background: "rgba(255,255,255,0.06)",
        border:     "1px solid rgba(168,85,247,0.2)",
      }}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      <button
        onClick={toggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105"
        style={{
          background: "linear-gradient(135deg, #A855F7, #A855F7)",
          color:      "#050816",
        }}
        aria-label={playing ? "Pause" : "Spill av"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
      </button>

      <div className="flex-1 min-w-0">
        {/* Progress bar */}
        <div
          onClick={seek}
          className="relative h-1.5 w-full cursor-pointer rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.10)" }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{
              width:      `${progress * 100}%`,
              background: "linear-gradient(to right, #A855F7, #A855F7)",
            }}
          />
        </div>

        {/* Time row */}
        <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.5)" }}>
          <span>{fmt(playing || current > 0 ? current : 0)}</span>
          <span>{duration ? fmt(duration) : "--:--"}</span>
        </div>
      </div>
    </div>
  );
}
