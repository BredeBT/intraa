"use client";

import { Phone, PhoneOff, MicOff, Mic } from "lucide-react";
import Link from "next/link";
import { useWebRTCGlobal } from "@/context/WebRTCContext";
import { usePathname } from "next/navigation";

/**
 * Floating call bar shown when a call is active and the user has navigated
 * away from the DM view. Lets them mute, return to the call, or hang up
 * without losing audio.
 */
export function GlobalCallBar() {
  const { callState, callType, activeFriendId, activeFriendName, isMuted, toggleMute, endCall } = useWebRTCGlobal();
  const pathname = usePathname();

  // Only show when connected and NOT already on the DM page with that friend
  const onCallPage = pathname.includes("/meldinger") && pathname.includes(activeFriendId ?? "____");
  // Also hide if we're on /meldinger with the userId param
  const onMeldingerWithFriend = pathname === "/meldinger" && typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("userId") === activeFriendId;

  if (callState !== "connected" || !activeFriendId || onCallPage || onMeldingerWithFriend) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-2xl bg-[#1a1a2e] border border-white/10 px-4 py-3 shadow-2xl backdrop-blur-sm">
        {/* Pulsing dot */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
        </span>

        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-white truncate">
            {callType === "video" ? "Videosamtale" : "Lydsamtale"}
          </span>
          {activeFriendName && (
            <span className="text-[11px] text-white/50 truncate">{activeFriendName}</span>
          )}
        </div>

        {/* Mute toggle */}
        <button
          onClick={toggleMute}
          title={isMuted ? "Slå på mikrofon" : "Demp mikrofon"}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            isMuted ? "bg-rose-500/20 text-rose-400" : "bg-white/10 text-white/70 hover:bg-white/20"
          }`}
        >
          {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </button>

        {/* Return to call */}
        <Link
          href={`/meldinger?userId=${activeFriendId}`}
          className="flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-medium text-white hover:bg-white/20 transition-colors"
        >
          <Phone className="h-3 w-3" />
          Gå tilbake
        </Link>

        {/* End call */}
        <button
          onClick={endCall}
          title="Avslutt samtale"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-500 transition-colors"
        >
          <PhoneOff className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
