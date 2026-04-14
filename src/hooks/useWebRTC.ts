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

  // Stable signalingChannel — both sides sort IDs the same way
  const signalingChannel = [currentUserId, friendId].filter(Boolean).sort().join(":");

  // ── Cleanup helper (no dep on state — uses refs) ───────────────────────────
  const cleanupPeer = useCallback(() => {
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

  // ── Signaling channel ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!friendId || !currentUserId) return;

    const ch = supabase.channel(`call:${signalingChannel}`)
      .on("broadcast", { event: "call-offer" }, ({ payload }: { payload: { to: string; from: string; type: CallType; signal: unknown } }) => {
        if (payload.to !== currentUserId) return;
        setIncomingCall({ from: payload.from, type: payload.type, signal: payload.signal });
        setCallType(payload.type);
        setCallState("receiving");
      })
      .on("broadcast", { event: "call-answer" }, ({ payload }: { payload: { to: string; signal: unknown } }) => {
        if (payload.to !== currentUserId) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        peerRef.current?.signal(payload.signal as any);
      })
      .on("broadcast", { event: "call-ended" }, ({ payload }: { payload: { to: string } }) => {
        if (payload.to !== currentUserId) return;
        cleanupPeer();
      });

    ch.subscribe();
    channelRef.current = ch;

    return () => {
      void supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [currentUserId, friendId, signalingChannel, cleanupPeer]);

  // ── Get user media (with error handling) ──────────────────────────────────
  const getMedia = useCallback(async (type: CallType): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video"
          ? { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 480 } }
          : false,
      });
      return stream;
    } catch (err) {
      const e = err as { name: string };
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

  // ── Create peer (lazily imports simple-peer to avoid SSR) ─────────────────
  const createPeer = useCallback(async (
    initiator: boolean,
    stream:    MediaStream,
    onSignal:  (signal: unknown) => void,
  ): Promise<SimplePeerType.Instance> => {
    const SP = (await import("simple-peer")).default;
    const peer = new SP({ initiator, trickle: true, stream, config: ICE_SERVERS });

    peer.on("signal", onSignal);

    peer.on("stream", (remote: MediaStream) => {
      setRemoteStream(remote);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
      setCallState("connected");
    });

    peer.on("error", () => cleanupPeer());
    peer.on("close", () => cleanupPeer());

    return peer;
  }, [cleanupPeer]);

  // ── Start call (initiator) ─────────────────────────────────────────────────
  const startCall = useCallback(async (type: CallType) => {
    setCallError(null);
    const stream = await getMedia(type);
    if (!stream) { cleanupPeer(); return; }

    localStreamRef.current = stream;
    setLocalStream(stream);
    setCallType(type);
    setCallState("calling");
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const peer = await createPeer(true, stream, (signal) => {
      channelRef.current?.send({
        type: "broadcast", event: "call-offer",
        payload: { from: currentUserId, to: friendId, type, signal },
      });
    });

    peerRef.current = peer;
  }, [getMedia, createPeer, cleanupPeer, currentUserId, friendId]);

  // ── Answer call (receiver) ────────────────────────────────────────────────
  const answerCall = useCallback(async () => {
    if (!incomingCall) return;
    setCallError(null);

    const stream = await getMedia(incomingCall.type);
    if (!stream) { cleanupPeer(); return; }

    localStreamRef.current = stream;
    setLocalStream(stream);
    setCallState("connected");
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const callerFrom = incomingCall.from;
    const callerSignal = incomingCall.signal;

    const peer = await createPeer(false, stream, (signal) => {
      channelRef.current?.send({
        type: "broadcast", event: "call-answer",
        payload: { from: currentUserId, to: callerFrom, signal },
      });
    });

    peer.signal(callerSignal);
    peerRef.current = peer;
    setIncomingCall(null);
  }, [incomingCall, getMedia, createPeer, cleanupPeer, currentUserId]);

  // ── End / reject call ──────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast", event: "call-ended",
      payload: { from: currentUserId, to: friendId },
    });
    cleanupPeer();
  }, [cleanupPeer, currentUserId, friendId]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    channelRef.current?.send({
      type: "broadcast", event: "call-ended",
      payload: { from: currentUserId, to: incomingCall.from },
    });
    setIncomingCall(null);
    setCallState("idle");
  }, [incomingCall, currentUserId]);

  // ── Audio / camera toggles ─────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((prev) => !prev);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCameraOff((prev) => !prev);
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => () => { cleanupPeer(); }, [cleanupPeer]);

  return {
    callState, callType, isMuted, isCameraOff,
    incomingCall, localStream, remoteStream, callError,
    localVideoRef, remoteVideoRef,
    startCall, answerCall, endCall, rejectCall,
    toggleMute, toggleCamera,
  };
}
