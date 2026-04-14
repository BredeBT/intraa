"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";
import { ICE_SERVERS } from "@/lib/webrtc-config";
import type SimplePeerType from "simple-peer";

export type CallState = "idle" | "calling" | "receiving" | "connected" | "ended";
export type CallType  = "audio" | "video";

export interface IncomingCall {
  from:   string;
  type:   CallType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signal: any;
}

export function useWebRTC(currentUserId: string, friendId: string) {
  const [callState,    setCallState]    = useState<CallState>("idle");
  const [callType,     setCallType]     = useState<CallType>("audio");
  const [localStream,  setLocalStream]  = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted,      setIsMuted]      = useState(false);
  const [isCameraOff,  setIsCameraOff]  = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callError,    setCallError]    = useState<string | null>(null);

  const peerRef        = useRef<SimplePeerType.Instance | null>(null);
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const signalingChannel = [currentUserId, friendId].filter(Boolean).sort().join(":");

  // ── Cleanup helper ────────────────────────────────────────────────────────
  const cleanupPeer = useCallback(() => {
    console.log("[WebRTC] cleanupPeer");
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
  }, []);

  // ── Signaling channel ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!friendId || !currentUserId) return;

    console.log("[WebRTC] Setter opp signalerings-kanal:", `call:${signalingChannel}`);

    const ch = supabase.channel(`call:${signalingChannel}`)
      .on("broadcast", { event: "call-offer" }, ({ payload }: { payload: { to: string; from: string; type: CallType; signal: unknown } }) => {
        console.log("[WebRTC] Mottok call-offer fra:", payload.from, "→ til:", payload.to, "| min id:", currentUserId);
        if (payload.to !== currentUserId) { console.log("[WebRTC] Ignorerer — ikke til meg"); return; }
        console.log("[WebRTC] Setter incomingCall, type:", payload.type);
        setIncomingCall({ from: payload.from, type: payload.type, signal: payload.signal });
        setCallType(payload.type);
        setCallState("receiving");
      })
      .on("broadcast", { event: "call-answer" }, ({ payload }: { payload: { to: string; signal: unknown } }) => {
        console.log("[WebRTC] Mottok call-answer, til:", payload.to, "| min id:", currentUserId);
        if (payload.to !== currentUserId) return;
        if (peerRef.current) {
          console.log("[WebRTC] Signalerer peer med svar");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          peerRef.current.signal(payload.signal as any);
        } else {
          console.error("[WebRTC] peerRef er null ved mottak av call-answer!");
        }
      })
      .on("broadcast", { event: "call-ended" }, ({ payload }: { payload: { to: string } }) => {
        console.log("[WebRTC] Mottok call-ended, til:", payload.to);
        if (payload.to !== currentUserId) return;
        cleanupPeer();
      });

    ch.subscribe((status) => {
      console.log("[WebRTC] Kanal-status:", status);
    });
    channelRef.current = ch;

    return () => {
      console.log("[WebRTC] Fjerner signalerings-kanal");
      void supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [currentUserId, friendId, signalingChannel, cleanupPeer]);

  // ── Get user media ────────────────────────────────────────────────────────
  const getMedia = useCallback(async (type: CallType): Promise<MediaStream | null> => {
    console.log("[WebRTC] Ber om media-tillatelse, type:", type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video"
          ? { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 480 } }
          : false,
      });
      console.log("[WebRTC] Stream mottatt:", stream.getTracks().map((t) => ({
        kind: t.kind, enabled: t.enabled, readyState: t.readyState,
      })));
      return stream;
    } catch (err) {
      const e = err as { name: string; message: string };
      console.error("[WebRTC] getUserMedia feilet:", e.name, e.message);
      if (e.name === "NotAllowedError") {
        setCallError("Du må gi tillatelse til mikrofon/kamera for å ringe");
      } else if (e.name === "NotFoundError") {
        setCallError("Ingen mikrofon/kamera funnet på enheten");
      } else {
        setCallError("Kunne ikke starte samtale — sjekk tilkoblingen");
      }
      return null;
    }
  }, []);

  // ── Create peer ───────────────────────────────────────────────────────────
  const createPeer = useCallback(async (
    initiator: boolean,
    stream:    MediaStream,
    onSignal:  (signal: unknown) => void,
  ): Promise<SimplePeerType.Instance> => {
    console.log("[WebRTC] createPeer, initiator:", initiator);
    const SP = (await import("simple-peer")).default;
    const peer = new SP({ initiator, trickle: true, stream, config: ICE_SERVERS });

    peer.on("signal", (signal: { type?: string }) => {
      console.log("[WebRTC] Sender signal:", signal.type ?? "candidate");
      onSignal(signal);
    });

    peer.on("connect", () => {
      console.log("[WebRTC] Peer tilkoblet! Data-kanal oppe.");
    });

    peer.on("stream", (remote: MediaStream) => {
      console.log("[WebRTC] Mottok remote stream!", remote.getTracks().map((t) => t.kind));
      setRemoteStream(remote);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remote;
        remoteVideoRef.current.play().catch((e: Error) => console.error("[WebRTC] Remote play feilet:", e));
        console.log("[WebRTC] Remote video satt");
      } else {
        console.error("[WebRTC] remoteVideoRef er null ved stream-mottak!");
      }
      setCallState("connected");
    });

    peer.on("error", (err: Error) => {
      console.error("[WebRTC] Peer feil:", err);
      cleanupPeer();
    });

    peer.on("close", () => {
      console.log("[WebRTC] Peer lukket");
      cleanupPeer();
    });

    return peer;
  }, [cleanupPeer]);

  // ── Assign local stream to video element ──────────────────────────────────
  // Called after state update so the overlay (and video ref) is rendered
  const attachLocalVideo = useCallback((stream: MediaStream) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch((e: Error) => console.error("[WebRTC] Local play feilet:", e));
      console.log("[WebRTC] Local video satt");
    } else {
      console.error("[WebRTC] localVideoRef er null! Overlay ikke rendret ennå?");
    }
  }, []);

  // ── Start call (initiator) ────────────────────────────────────────────────
  const startCall = useCallback(async (type: CallType) => {
    console.log("[WebRTC] startCall kalt med type:", type);
    setCallError(null);
    setCallType(type);

    // Set state FIRST so the overlay renders and video ref becomes available
    setCallState("calling");

    // Give React one frame to render the overlay before we need the ref
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    const stream = await getMedia(type);
    if (!stream) { cleanupPeer(); return; }

    localStreamRef.current = stream;
    setLocalStream(stream);
    attachLocalVideo(stream);

    const peer = await createPeer(true, stream, (signal) => {
      channelRef.current?.send({
        type: "broadcast", event: "call-offer",
        payload: { from: currentUserId, to: friendId, type, signal },
      });
    });

    peerRef.current = peer;
  }, [getMedia, createPeer, cleanupPeer, attachLocalVideo, currentUserId, friendId]);

  // ── Answer call (receiver) ────────────────────────────────────────────────
  const answerCall = useCallback(async () => {
    if (!incomingCall) return;
    console.log("[WebRTC] answerCall, type:", incomingCall.type);
    setCallError(null);

    // Set state FIRST so overlay renders
    setCallState("connected");
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    const stream = await getMedia(incomingCall.type);
    if (!stream) { cleanupPeer(); return; }

    localStreamRef.current = stream;
    setLocalStream(stream);
    attachLocalVideo(stream);

    const callerFrom   = incomingCall.from;
    const callerSignal = incomingCall.signal;

    const peer = await createPeer(false, stream, (signal) => {
      channelRef.current?.send({
        type: "broadcast", event: "call-answer",
        payload: { from: currentUserId, to: callerFrom, signal },
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    peer.signal(callerSignal as any);
    peerRef.current = peer;
    setIncomingCall(null);
  }, [incomingCall, getMedia, createPeer, cleanupPeer, attachLocalVideo, currentUserId]);

  // ── End / reject call ──────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    console.log("[WebRTC] endCall");
    channelRef.current?.send({
      type: "broadcast", event: "call-ended",
      payload: { from: currentUserId, to: friendId },
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
    setIsMuted((prev) => !prev);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCameraOff((prev) => !prev);
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => { cleanupPeer(); }, [cleanupPeer]);

  return {
    callState, callType, isMuted, isCameraOff,
    incomingCall, localStream, remoteStream, callError,
    localVideoRef, remoteVideoRef,
    startCall, answerCall, endCall, rejectCall,
    toggleMute, toggleCamera,
  };
}
