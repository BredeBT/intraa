"use client";

import {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from "react";
import { supabase } from "@/lib/supabase-client";
import { callSounds } from "@/lib/call-sounds";
import type { CallType } from "@/hooks/useWebRTC";

export interface GlobalIncomingCall {
  from:     string;
  fromName: string;
  type:     CallType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signal:   any;
  to:       string;
}

interface WebRTCContextValue {
  incomingCall:     GlobalIncomingCall | null;
  answerCall:       () => void;
  rejectCall:       () => void;
  clearIncomingCall: () => void;
}

export const WebRTCContext = createContext<WebRTCContextValue | null>(null);

export function WebRTCProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId:   string;
}) {
  const [incomingCall, setIncomingCall] = useState<GlobalIncomingCall | null>(null);
  const stopRingRef       = useRef<(() => void) | null>(null);
  const signalingChRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Personal notification channel ──────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const ch = supabase
      .channel(`notify:calls:${userId}`)
      .on("broadcast", { event: "incoming-call" }, ({ payload }: { payload: GlobalIncomingCall }) => {
        if (payload.to !== userId) return;
        setIncomingCall(payload);
        stopRingRef.current = callSounds.startRinging();

        // Browser notification when tab is not visible
        if (typeof window !== "undefined" && "Notification" in window && document.hidden) {
          void Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification(`${payload.fromName} ringer`, {
                body:              payload.type === "video" ? "Videosamtale" : "Lydsamtale",
                icon:              "/icon.png",
                requireInteraction: true,
              });
            }
          });
        }
      })
      .on("broadcast", { event: "call-ended-notify" }, ({ payload }: { payload: { to: string } }) => {
        if (payload.to !== userId) return;
        stopRingRef.current?.();
        stopRingRef.current = null;
        setIncomingCall(null);
      })
      .subscribe();

    return () => {
      stopRingRef.current?.();
      void supabase.removeChannel(ch);
    };
  }, [userId]);

  // ── Subscribe to signaling channel when incoming call arrives ──────────────
  // (allows global rejectCall to send call-ended on the right channel)
  useEffect(() => {
    if (!incomingCall || !userId) {
      if (signalingChRef.current) {
        void supabase.removeChannel(signalingChRef.current);
        signalingChRef.current = null;
      }
      return;
    }
    const sigId = [userId, incomingCall.from].sort().join(":");
    const ch    = supabase.channel(`call:${sigId}`);
    ch.subscribe();
    signalingChRef.current = ch;

    return () => {
      void supabase.removeChannel(ch);
      signalingChRef.current = null;
    };
  }, [incomingCall, userId]);

  const clearIncomingCall = useCallback(() => {
    stopRingRef.current?.();
    stopRingRef.current = null;
    setIncomingCall(null);
  }, []);

  const answerCall = useCallback(() => {
    if (!incomingCall) return;
    stopRingRef.current?.();
    stopRingRef.current = null;
    // Keep incomingCall in context so useWebRTC can read the signal after navigation
    window.location.href = `/meldinger?userId=${incomingCall.from}`;
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    stopRingRef.current?.();
    stopRingRef.current = null;
    signalingChRef.current?.send({
      type:    "broadcast",
      event:   "call-ended",
      payload: { from: userId, to: incomingCall.from },
    });
    setIncomingCall(null);
  }, [incomingCall, userId]);

  return (
    <WebRTCContext.Provider value={{ incomingCall, answerCall, rejectCall, clearIncomingCall }}>
      {children}
    </WebRTCContext.Provider>
  );
}

export function useWebRTCGlobal(): WebRTCContextValue {
  const ctx = useContext(WebRTCContext);
  if (!ctx) throw new Error("useWebRTCGlobal must be used within <WebRTCProvider>");
  return ctx;
}
