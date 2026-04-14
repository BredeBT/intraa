"use client";

import { usePathname } from "next/navigation";
import { useWebRTCGlobal } from "@/context/WebRTCContext";

export function IncomingCallBanner() {
  const { incomingCall, answerCall, rejectCall } = useWebRTCGlobal();
  const pathname = usePathname();

  // On /meldinger the DM-level banner handles it
  if (!incomingCall || pathname.startsWith("/meldinger")) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 pointer-events-none">
      <div className="pointer-events-auto bg-[#1a1a2e] border border-purple-500/40 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          {/* Avatar med pulse */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 border-2 border-purple-500/40 flex items-center justify-center text-lg font-semibold text-purple-300">
              {(incomingCall.fromName ?? "?")[0]?.toUpperCase()}
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/40 animate-ping" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {incomingCall.fromName} ringer
            </p>
            <p className="text-xs text-white/50">
              {incomingCall.type === "video" ? "Videosamtale" : "Lydsamtale"}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={rejectCall}
              aria-label="Avslå anrop"
              className="w-11 h-11 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/30 active:scale-95 transition-all text-lg"
            >
              ✕
            </button>
            <button
              onClick={answerCall}
              aria-label="Svar på anrop"
              className="w-11 h-11 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500/30 active:scale-95 transition-all animate-pulse text-lg"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
