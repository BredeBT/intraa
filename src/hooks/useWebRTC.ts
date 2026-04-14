"use client";

import { useEffect, useRef, useState, useCallback, useContext } from "react";
import { supabase } from "@/lib/supabase-client";
import { ICE_SERVERS } from "@/lib/webrtc-config";
import { callSounds } from "@/lib/call-sounds";
import { WebRTCContext } from "@/context/WebRTCContext";
import type SimplePeerType from "simple-peer";

export type CallState = "idle" | "calling" | "receiving" | "connected" | "ended";
export type CallType  = "audio" | "video";

export interface IncomingCall {
  from:   string;
  type:   CallType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signal: any;
}

export function useWebRTC(currentUserId: string, friendId: string, userName?: string) {
  const [callState,            setCallState]            = useState<CallState>("idle");
  const [callType,             setCallType]             = useState<CallType>("audio");
  const [localStream,          setLocalStream]          = useState<MediaStream | null>(null);
  const [remoteStream,         setRemoteStream]         = useState<MediaStream | null>(null);
  const [isMuted,              setIsMuted]              = useState(false);
  const [isCameraOff,          setIsCameraOff]          = useState(false);
  const [incomingCall,         setIncomingCall]         = useState<IncomingCall | null>(null);
  const [callError,            setCallError]            = useState<string | null>(null);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);

  const peerRef          = useRef<SimplePeerType.Instance | null>(null);
  const localVideoRef    = useRef<HTMLVideoElement>(null);
  const remoteVideoRef   = useRef<HTMLVideoElement>(null);
  const channelRef       = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef   = useRef<MediaStream | null>(null);
  const dialCleanupRef   = useRef<(() => void) | null>(null);

  const signalingChannel = [currentUserId, friendId].filter(Boolean).sort().join(":");

  // Read global context (for cross-page incoming call signal handoff)
  const globalCtx = useContext(WebRTCContext);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const cleanupPeer = useCallback(() => {
    console.log("[WebRTC] cleanupPeer");
    dialCleanupRef.current?.();
    dialCleanupRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIncomingCall(null);
    setCallState("idle");
    setCallError(null);
    setNeedsUserInteraction(false);
  }, []);

  // ── Pick up pending incoming call from global context ──────────────────────
  // Triggered when user navigates to /meldinger after answering from global banner
  useEffect(() => {
    if (!globalCtx) return;
    const { incomingCall: pending, clearIncomingCall } = globalCtx;
    if (pending && pending.from === friendId && callState === "idle") {
      console.log("[WebRTC] Picking up pending call from global context");
      setIncomingCall({ from: pending.from, type: pending.type, signal: pending.signal });
      setCallType(pending.type);
      setCallState("receiving");
      clearIncomingCall();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalCtx?.incomingCall, friendId, callState]);

  // ── Signaling channel ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!friendId || !currentUserId) return;
    console.log("[WebRTC] Setter opp kanal:", `call:${signalingChannel}`);

    const ch = supabase
      .channel(`call:${signalingChannel}`)
      .on("broadcast", { event: "call-offer" }, ({ payload }: { payload: { to: string; from: string; type: CallType; signal: unknown } }) => {
        console.log("[WebRTC] call-offer fra:", payload.from, "→", payload.to, "| meg:", currentUserId);
        if (payload.to !== currentUserId) { console.log("[WebRTC] Ignorerer — ikke til meg"); return; }
        // Dismiss global banner since we're handling it locally in the DM view
        globalCtx?.clearIncomingCall();
        console.log("[WebRTC] Setter incomingCall, type:", payload.type);
        setIncomingCall({ from: payload.from, type: payload.type, signal: payload.signal });
        setCallType(payload.type);
        setCallState("receiving");
      })
      .on("broadcast", { event: "call-answer" }, ({ payload }: { payload: { to: string; signal: unknown } }) => {
        console.log("[WebRTC] call-answer mottatt, til:", payload.to, "| meg:", currentUserId);
        if (payload.to !== currentUserId) return;
        if (peerRef.current) {
          console.log("[WebRTC] Signalerer initiator-peer med answer");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          peerRef.current.signal(payload.signal as any);
        } else {
          console.error("[WebRTC] peerRef er null ved call-answer!");
        }
      })
      .on("broadcast", { event: "ice-candidate" }, ({ payload }: { payload: { to: string; signal: unknown } }) => {
        if (payload.to !== currentUserId) return;
        console.log("[WebRTC] ICE candidate mottatt");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        peerRef.current?.signal(payload.signal as any);
      })
      .on("broadcast", { event: "call-ended" }, ({ payload }: { payload: { to: string } }) => {
        console.log("[WebRTC] call-ended mottatt, til:", payload.to);
        if (payload.to !== currentUserId) return;
        cleanupPeer();
      })
      .subscribe((status) => {
        console.log("[WebRTC] Kanal-status:", status);
      });

    channelRef.current = ch;
    return () => {
      console.log("[WebRTC] Fjerner kanal");
      void supabase.removeChannel(ch);
      channelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, friendId, signalingChannel, cleanupPeer]);

  // ── Get user media ────────────────────────────────────────────────────────
  const getMedia = useCallback(async (type: CallType): Promise<MediaStream | null> => {
    console.log("[WebRTC] Ber om media, type:", type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video"
          ? { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 480 } }
          : false,
      });
      console.log("[WebRTC] Stream OK:", stream.getTracks().map((t) => `${t.kind}(${t.readyState})`));
      return stream;
    } catch (err) {
      const e = err as { name: string; message: string };
      console.error("[WebRTC] getUserMedia feilet:", e.name, e.message);
      if (e.name === "NotAllowedError")  setCallError("Du må gi tillatelse til mikrofon/kamera for å ringe");
      else if (e.name === "NotFoundError") setCallError("Ingen mikrofon/kamera funnet på enheten");
      else setCallError("Kunne ikke starte samtale — sjekk tilkoblingen");
      return null;
    }
  }, []);

  // ── Attach local video ────────────────────────────────────────────────────
  const attachLocalVideo = useCallback((stream: MediaStream) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch((e: Error) => console.error("[WebRTC] Local play feilet:", e));
      console.log("[WebRTC] Local video attached");
    } else {
      console.error("[WebRTC] localVideoRef null — overlay ikke rendret ennå?");
    }
  }, []);

  // ── Create peer — trickle:false bundles SDP+ICE into one signal ───────────
  const createPeer = useCallback(async (
    initiator:    boolean,
    stream:       MediaStream,
    onSignalData: (signal: unknown) => void,
  ): Promise<SimplePeerType.Instance> => {
    console.log("[WebRTC] createPeer, initiator:", initiator);
    const SP = (await import("simple-peer")).default;

    // trickle:false → single SDP offer/answer that includes all ICE candidates.
    const peer = new SP({ initiator, trickle: false, stream, config: ICE_SERVERS });

    peer.on("signal", (data: unknown) => {
      const sig = data as { type?: string };
      console.log("[WebRTC] Peer signal:", sig.type ?? "candidate");
      onSignalData(data);
    });

    peer.on("connect", () => {
      console.log("[WebRTC] Peer tilkoblet — data-kanal oppe!");
      // Stop dialing sound when connection is established
      dialCleanupRef.current?.();
      dialCleanupRef.current = null;
    });

    peer.on("stream", async (remote: MediaStream) => {
      console.log("[WebRTC] GOT REMOTE STREAM!", remote.getTracks().map((t) => t.kind));
      // Stop dialing sound when remote stream arrives
      dialCleanupRef.current?.();
      dialCleanupRef.current = null;
      setRemoteStream(remote);
      setCallState("connected");

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remote;
        try {
          await remoteVideoRef.current.play();
          console.log("[WebRTC] Remote video spiller!");
          setNeedsUserInteraction(false);
        } catch (e) {
          console.error("[WebRTC] Autoplay blokkert:", e);
          setNeedsUserInteraction(true);
        }
      } else {
        console.error("[WebRTC] remoteVideoRef null ved stream-mottak!");
      }
    });

    peer.on("error", (err: Error) => {
      console.error("[WebRTC] Peer feil:", err.message);
      cleanupPeer();
    });

    peer.on("close", () => {
      console.log("[WebRTC] Peer lukket");
      cleanupPeer();
    });

    return peer;
  }, [cleanupPeer]);

  // ── Send notification to friend's personal channel ────────────────────────
  const sendCallNotification = useCallback((signal: unknown, type: CallType) => {
    if (!friendId) return;
    const ch = supabase.channel(`notify:calls:${friendId}`);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void ch.send({
          type:    "broadcast",
          event:   "incoming-call",
          payload: {
            from:     currentUserId,
            fromName: userName ?? "Noen",
            to:       friendId,
            type,
            signal,
          },
        });
        setTimeout(() => void supabase.removeChannel(ch), 3000);
      }
    });
  }, [friendId, currentUserId, userName]);

  // ── Start call (initiator) ────────────────────────────────────────────────
  const startCall = useCallback(async (type: CallType) => {
    console.log("[WebRTC] startCall type:", type);
    setCallError(null);
    setCallType(type);
    // Render overlay FIRST so video refs are available
    setCallState("calling");
    await new Promise<void>((r) => setTimeout(r, 100));

    const stream = await getMedia(type);
    if (!stream) { cleanupPeer(); return; }

    localStreamRef.current = stream;
    setLocalStream(stream);
    attachLocalVideo(stream);

    // Start dialing sound
    dialCleanupRef.current = callSounds.startDialing();

    const peer = await createPeer(true, stream, (signal) => {
      console.log("[WebRTC] Sender call-offer til:", friendId);
      channelRef.current?.send({
        type: "broadcast", event: "call-offer",
        payload: { from: currentUserId, to: friendId, type, signal },
      });
      // Also notify friend's personal channel (for global banner)
      sendCallNotification(signal, type);
    });

    peerRef.current = peer;
  }, [getMedia, createPeer, cleanupPeer, attachLocalVideo, currentUserId, friendId, sendCallNotification]);

  // ── Answer call (receiver) ────────────────────────────────────────────────
  const answerCall = useCallback(async () => {
    if (!incomingCall) return;
    const { from: callerFrom, signal: callerSignal, type } = incomingCall;
    console.log("[WebRTC] answerCall, type:", type, "fra:", callerFrom);
    setCallError(null);

    // Render overlay FIRST so video refs are available
    setCallState("connected");
    await new Promise<void>((r) => setTimeout(r, 100));

    const stream = await getMedia(type);
    if (!stream) { cleanupPeer(); return; }

    localStreamRef.current = stream;
    setLocalStream(stream);
    attachLocalVideo(stream);

    const peer = await createPeer(false, stream, (signal) => {
      console.log("[WebRTC] Answer sender signal til:", callerFrom);
      channelRef.current?.send({
        type: "broadcast", event: "call-answer",
        payload: { from: currentUserId, to: callerFrom, signal },
      });
    });

    // Signal AFTER all event handlers are registered on the peer
    console.log("[WebRTC] Signalerer peer med incoming offer");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    peer.signal(callerSignal as any);

    peerRef.current = peer;
    setIncomingCall(null);
  }, [incomingCall, getMedia, createPeer, cleanupPeer, attachLocalVideo, currentUserId]);

  // ── End / reject ──────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    console.log("[WebRTC] endCall");
    dialCleanupRef.current?.();
    dialCleanupRef.current = null;
    channelRef.current?.send({
      type: "broadcast", event: "call-ended",
      payload: { from: currentUserId, to: friendId },
    });
    // Notify via personal channel so global banner on caller's side dismisses
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
    cleanupPeer();
  }, [cleanupPeer, currentUserId, friendId]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    console.log("[WebRTC] rejectCall");
    channelRef.current?.send({
      type: "broadcast", event: "call-ended",
      payload: { from: currentUserId, to: incomingCall.from },
    });
    setIncomingCall(null);
    setCallState("idle");
  }, [incomingCall, currentUserId]);

  // ── Toggles ───────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((p) => !p);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCameraOff((p) => !p);
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => { cleanupPeer(); }, [cleanupPeer]);

  return {
    callState, callType, isMuted, isCameraOff,
    incomingCall, localStream, remoteStream, callError,
    needsUserInteraction, setNeedsUserInteraction,
    localVideoRef, remoteVideoRef,
    startCall, answerCall, endCall, rejectCall,
    toggleMute, toggleCamera,
  };
}
