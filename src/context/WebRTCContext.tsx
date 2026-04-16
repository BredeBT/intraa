"use client";

import {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from "react";
import { supabase } from "@/lib/supabase-client";
import { callSounds } from "@/lib/call-sounds";
import { ICE_SERVERS } from "@/lib/webrtc-config";
import type SimplePeerType from "simple-peer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallState = "idle" | "calling" | "receiving" | "connected";
export type CallType  = "audio" | "video";

export interface GlobalIncomingCall {
  from:     string;
  fromName: string;
  type:     CallType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signal:   any;
  to:       string;
}

interface WebRTCContextValue {
  // Incoming call (pre-answer)
  incomingCall:      GlobalIncomingCall | null;
  clearIncomingCall: () => void;

  // Active call state — persists across page navigation
  callState:               CallState;
  callType:                CallType;
  activeFriendId:          string | null;
  activeFriendName:        string | null;
  localStream:             MediaStream | null;
  remoteStream:            MediaStream | null;
  isMuted:                 boolean;
  isCameraOff:             boolean;
  callError:               string | null;
  needsUserInteraction:    boolean;
  setNeedsUserInteraction: (v: boolean) => void;

  // Actions
  startCall:        (friendId: string, type: CallType, friendName?: string) => Promise<void>;
  answerCallDirect: (incoming: GlobalIncomingCall) => Promise<void>;
  answerCall:       () => void;   // navigate to DM (from global banner)
  endCall:          () => void;
  rejectCall:       () => void;
  toggleMute:       () => void;
  toggleCamera:     () => void;
}

export const WebRTCContext = createContext<WebRTCContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WebRTCProvider({
  children,
  userId,
  userName,
}: {
  children:  React.ReactNode;
  userId:    string;
  userName?: string;
}) {
  const [incomingCall,         setIncomingCall]         = useState<GlobalIncomingCall | null>(null);
  const [callState,            setCallState]            = useState<CallState>("idle");
  const [callType,             setCallType]             = useState<CallType>("audio");
  const [activeFriendId,       setActiveFriendId]       = useState<string | null>(null);
  const [activeFriendName,     setActiveFriendName]     = useState<string | null>(null);
  const [localStream,          setLocalStream]          = useState<MediaStream | null>(null);
  const [remoteStream,         setRemoteStream]         = useState<MediaStream | null>(null);
  const [isMuted,              setIsMuted]              = useState(false);
  const [isCameraOff,          setIsCameraOff]          = useState(false);
  const [callError,            setCallError]            = useState<string | null>(null);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);

  // Stable refs — survive page navigation
  const peerRef        = useRef<SimplePeerType.Instance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const dialCleanupRef = useRef<(() => void) | null>(null);
  const stopRingRef    = useRef<(() => void) | null>(null);
  const signalingChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const bcRef          = useRef<BroadcastChannel | null>(null);

  // ── BroadcastChannel — multi-tab ring coordination ──────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const bc = new BroadcastChannel("intraa-calls");
    bcRef.current = bc;
    bc.onmessage = (e: MessageEvent<{ type: string }>) => {
      if (e.data.type === "call-taken") {
        // Another tab answered or rejected — stop ringing here
        stopRingRef.current?.();
        stopRingRef.current = null;
        setIncomingCall(null);
        if (!peerRef.current) {
          setCallState("idle");
          setActiveFriendId(null);
          setActiveFriendName(null);
        }
      }
    };
    return () => { bc.close(); bcRef.current = null; };
  }, []);

  // ── Protect against accidental navigation during active call ────────────
  useEffect(() => {
    if (callState !== "connected" && callState !== "calling") return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [callState]);

  // ── Cleanup all call state ────────────────────────────────────────────────
  const cleanupCall = useCallback(() => {
    dialCleanupRef.current?.();
    dialCleanupRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setActiveFriendId(null);
    setActiveFriendName(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setCallError(null);
    setNeedsUserInteraction(false);
    setIncomingCall(null);
  }, []);

  // ── Personal notification channel — always-on ────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notify:calls:${userId}`)
      .on("broadcast", { event: "incoming-call" }, ({ payload }: { payload: GlobalIncomingCall }) => {
        if (payload.to !== userId) return;
        // If peer exists we're already in a call — auto-reject new call silently
        if (peerRef.current) return;
        // Stop any previous ring first (handles rapid re-dial)
        stopRingRef.current?.();
        stopRingRef.current = null;
        setIncomingCall(payload);
        setCallState("receiving");
        setActiveFriendId(payload.from);
        setActiveFriendName(payload.fromName);
        stopRingRef.current = callSounds.startRinging();
        // Browser notification when tab is not visible
        if (typeof window !== "undefined" && "Notification" in window && document.hidden) {
          void Notification.requestPermission().then((perm) => {
            if (perm === "granted") {
              new Notification(`${payload.fromName} ringer`, {
                body: payload.type === "video" ? "Videosamtale" : "Lydsamtale",
                icon: "/icon-192x192.png",
                requireInteraction: true,
              });
            }
          });
        }
      })
      .on("broadcast", { event: "call-ended-notify" }, ({ payload }: { payload: { to: string } }) => {
        if (payload.to !== userId) return;
        // Caller hung up while we were ringing — dismiss
        stopRingRef.current?.();
        stopRingRef.current = null;
        setIncomingCall(null);
        if (!peerRef.current) {
          setCallState("idle");
          setActiveFriendId(null);
          setActiveFriendName(null);
        }
      })
      .subscribe();

    return () => {
      stopRingRef.current?.();
      void supabase.removeChannel(ch);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Signaling channel — set up when activeFriendId is known ─────────────
  useEffect(() => {
    if (!activeFriendId || !userId) return;
    const sigId = [userId, activeFriendId].sort().join(":");

    const ch = supabase
      .channel(`call:${sigId}`)
      .on("broadcast", { event: "call-answer" }, ({ payload }: { payload: { to: string; signal: unknown } }) => {
        if (payload.to !== userId) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        peerRef.current?.signal(payload.signal as any);
      })
      .on("broadcast", { event: "ice-candidate" }, ({ payload }: { payload: { to: string; signal: unknown } }) => {
        if (payload.to !== userId) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        peerRef.current?.signal(payload.signal as any);
      })
      .on("broadcast", { event: "call-ended" }, ({ payload }: { payload: { to: string } }) => {
        if (payload.to !== userId) return;
        cleanupCall();
      })
      .subscribe();

    signalingChRef.current = ch;
    return () => {
      void supabase.removeChannel(ch);
      if (signalingChRef.current === ch) signalingChRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFriendId, userId, cleanupCall]);

  // ── Get user media ────────────────────────────────────────────────────────
  const getMedia = useCallback(async (type: CallType): Promise<MediaStream | null> => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video"
          ? { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 480 } }
          : false,
      });
    } catch (err) {
      const e = err as { name: string };
      if (e.name === "NotAllowedError")  setCallError("Du må gi tillatelse til mikrofon/kamera");
      else if (e.name === "NotFoundError") setCallError("Ingen mikrofon/kamera funnet");
      else setCallError("Kunne ikke starte samtale");
      return null;
    }
  }, []);

  // ── Create peer ───────────────────────────────────────────────────────────
  const createPeer = useCallback(async (
    initiator:    boolean,
    stream:       MediaStream,
    onSignalData: (signal: unknown) => void,
  ): Promise<SimplePeerType.Instance> => {
    const SP = (await import("simple-peer")).default;
    const peer = new SP({ initiator, trickle: false, stream, config: ICE_SERVERS });

    peer.on("signal", (data: unknown) => onSignalData(data));

    peer.on("connect", () => {
      dialCleanupRef.current?.();
      dialCleanupRef.current = null;
    });

    peer.on("stream", (remote: MediaStream) => {
      dialCleanupRef.current?.();
      dialCleanupRef.current = null;
      setRemoteStream(remote);
      setCallState("connected");
      setNeedsUserInteraction(false);
    });

    peer.on("error", () => cleanupCall());
    peer.on("close", () => cleanupCall());

    return peer;
  }, [cleanupCall]);

  // ── Start outgoing call ───────────────────────────────────────────────────
  const startCall = useCallback(async (friendId: string, type: CallType, friendName?: string) => {
    setCallError(null);
    setCallType(type);
    setActiveFriendId(friendId);
    setActiveFriendName(friendName ?? null);
    setCallState("calling");
    await new Promise<void>((r) => setTimeout(r, 100));

    const stream = await getMedia(type);
    if (!stream) { cleanupCall(); return; }

    localStreamRef.current = stream;
    setLocalStream(stream);
    dialCleanupRef.current = callSounds.startDialing();

    const peer = await createPeer(true, stream, (signal) => {
      signalingChRef.current?.send({
        type: "broadcast", event: "call-offer",
        payload: { from: userId, to: friendId, type, signal },
      });
      // Notify via personal channel (global banner on their side)
      const notifyCh = supabase.channel(`notify:calls:${friendId}`);
      notifyCh.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void notifyCh.send({
            type: "broadcast", event: "incoming-call",
            payload: { from: userId, fromName: userName ?? "Noen", to: friendId, type, signal },
          });
          setTimeout(() => void supabase.removeChannel(notifyCh), 3000);
        }
      });
      void fetch("/api/push/call", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calleeId: friendId, type }),
      }).catch(() => {});
    });

    peerRef.current = peer;
  }, [userId, userName, getMedia, createPeer, cleanupCall]);

  // ── Answer call directly (from DM view — no navigation needed) ───────────
  const answerCallDirect = useCallback(async (incoming: GlobalIncomingCall) => {
    stopRingRef.current?.();
    stopRingRef.current = null;
    bcRef.current?.postMessage({ type: "call-taken" });

    const { from: callerFrom, signal: callerSignal, type } = incoming;
    setCallError(null);
    setCallType(type);
    setActiveFriendId(callerFrom);
    setActiveFriendName(incoming.fromName);
    setCallState("connected");
    setIncomingCall(null);
    await new Promise<void>((r) => setTimeout(r, 100));

    const stream = await getMedia(type);
    if (!stream) { cleanupCall(); return; }

    localStreamRef.current = stream;
    setLocalStream(stream);

    const peer = await createPeer(false, stream, (signal) => {
      signalingChRef.current?.send({
        type: "broadcast", event: "call-answer",
        payload: { from: userId, to: callerFrom, signal },
      });
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    peer.signal(callerSignal as any);
    peerRef.current = peer;
  }, [userId, getMedia, createPeer, cleanupCall]);

  // ── Answer call from global banner — navigate to DM ───────────────────────
  const answerCall = useCallback(() => {
    if (!incomingCall) return;
    stopRingRef.current?.();
    stopRingRef.current = null;
    bcRef.current?.postMessage({ type: "call-taken" });
    // Keep incomingCall in state so DM view can read it and call answerCallDirect
    window.location.href = `/meldinger?userId=${incomingCall.from}`;
  }, [incomingCall]);

  // ── End call ──────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    dialCleanupRef.current?.();
    dialCleanupRef.current = null;
    const friendId = activeFriendId;
    signalingChRef.current?.send({
      type: "broadcast", event: "call-ended",
      payload: { from: userId, to: friendId ?? "" },
    });
    if (friendId) {
      const notifyCh = supabase.channel(`notify:calls:${friendId}`);
      notifyCh.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void notifyCh.send({
            type: "broadcast", event: "call-ended-notify",
            payload: { to: friendId },
          });
          setTimeout(() => void supabase.removeChannel(notifyCh), 1000);
        }
      });
    }
    cleanupCall();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupCall, userId, activeFriendId]);

  // ── Reject incoming call ──────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    stopRingRef.current?.();
    stopRingRef.current = null;
    bcRef.current?.postMessage({ type: "call-taken" });
    signalingChRef.current?.send({
      type: "broadcast", event: "call-ended",
      payload: { from: userId, to: incomingCall.from },
    });
    setIncomingCall(null);
    setCallState("idle");
    setActiveFriendId(null);
    setActiveFriendName(null);
  }, [incomingCall, userId]);

  // ── Clear incoming call (without rejecting) ───────────────────────────────
  const clearIncomingCall = useCallback(() => {
    stopRingRef.current?.();
    stopRingRef.current = null;
    setIncomingCall(null);
  }, []);

  // ── Toggles ───────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((p) => !p);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCameraOff((p) => !p);
  }, []);

  return (
    <WebRTCContext.Provider value={{
      incomingCall, clearIncomingCall,
      callState, callType, activeFriendId, activeFriendName,
      localStream, remoteStream,
      isMuted, isCameraOff,
      callError, needsUserInteraction, setNeedsUserInteraction,
      startCall, answerCallDirect, answerCall, endCall, rejectCall,
      toggleMute, toggleCamera,
    }}>
      {children}
    </WebRTCContext.Provider>
  );
}

export function useWebRTCGlobal(): WebRTCContextValue {
  const ctx = useContext(WebRTCContext);
  if (!ctx) throw new Error("useWebRTCGlobal must be used within <WebRTCProvider>");
  return ctx;
}
