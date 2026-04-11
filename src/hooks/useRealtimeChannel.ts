"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtimeChannel(
  channelName: string,
  onMessage: (payload: Record<string, unknown>) => void,
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Keep a stable ref to the callback so we don't re-subscribe on every render
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "new_message" }, (payload) => {
        callbackRef.current(payload as Record<string, unknown>);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelName]);

  return channelRef;
}
