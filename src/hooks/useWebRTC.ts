"use client";

import { useCallback, useContext, useEffect, useRef } from "react";
import { WebRTCContext } from "@/context/WebRTCContext";
import type { CallType, GlobalIncomingCall } from "@/context/WebRTCContext";

export type { CallState, CallType } from "@/context/WebRTCContext";
export type { GlobalIncomingCall as IncomingCall } from "@/context/WebRTCContext";

/**
 * Thin hook that reads from the global WebRTCContext (which holds the peer so
 * calls survive React-router navigation) and adds local video element refs.
 *
 * friendId — the ID of the person this DM view is open with.
 *            Only exposes call state when activeFriendId === friendId.
 */
export function useWebRTC(currentUserId: string, friendId: string, userName?: string) {
  const ctx = useContext(WebRTCContext)!;

  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to video element whenever stream changes
  useEffect(() => {
    if (!ctx.localStream || !localVideoRef.current) return;
    localVideoRef.current.srcObject = ctx.localStream;
    localVideoRef.current.play().catch(() => {});
  }, [ctx.localStream]);

  // Attach remote stream + handle autoplay restrictions
  useEffect(() => {
    if (!ctx.remoteStream || !remoteVideoRef.current) return;
    remoteVideoRef.current.srcObject = ctx.remoteStream;
    remoteVideoRef.current.play().catch(() => {
      ctx.setNeedsUserInteraction(true);
    });
  }, [ctx.remoteStream, ctx.setNeedsUserInteraction]);

  // ── Filter call state to this DM friend only ─────────────────────────────
  // If the active call is with someone else, show idle to this view
  const isMyCall = !ctx.activeFriendId || ctx.activeFriendId === friendId;
  const callState    = isMyCall ? ctx.callState    : ("idle"  as const);
  const callType     = isMyCall ? ctx.callType     : ("audio" as const);
  const localStream  = isMyCall ? ctx.localStream  : null;
  const remoteStream = isMyCall ? ctx.remoteStream : null;
  const isMuted      = isMyCall ? ctx.isMuted      : false;
  const isCameraOff  = isMyCall ? ctx.isCameraOff  : false;

  // Only expose incomingCall if it's from the current DM friend
  const incomingCall: GlobalIncomingCall | null =
    ctx.incomingCall?.from === friendId ? ctx.incomingCall : null;

  // ── Wrapped actions ───────────────────────────────────────────────────────

  const startCall = useCallback(async (type: CallType) => {
    await ctx.startCall(friendId, type, userName);
  }, [ctx, friendId, userName]);

  const answerCall = useCallback(async () => {
    const ic = ctx.incomingCall;
    if (!ic || ic.from !== friendId) return;
    await ctx.answerCallDirect(ic);
  }, [ctx, friendId]);

  const endCall    = ctx.endCall;
  const rejectCall = ctx.rejectCall;

  return {
    callState,
    callType,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    callError:               ctx.callError,
    needsUserInteraction:    ctx.needsUserInteraction,
    setNeedsUserInteraction: ctx.setNeedsUserInteraction,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    endCall,
    rejectCall,
    toggleMute:   ctx.toggleMute,
    toggleCamera: ctx.toggleCamera,
  };
}
