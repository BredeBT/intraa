"use client";

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtimeChannel<T = unknown>(
  channelName: string,
  onMessage: (payload: T) => void,
) {
  const channelRef   = useRef<RealtimeChannel | null>(null);
  const callbackRef  = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    if (!channelName) return;

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "new_message" }, (raw) => {
        // Supabase wraps the payload — unwrap before passing to consumer
        callbackRef.current(raw.payload as T);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName]);

  const broadcast = useCallback(async (message: T) => {
    const ch = channelRef.current;
    if (!ch) return;
    await ch.send({ type: "broadcast", event: "new_message", payload: message });
  }, []);

  return { broadcast };
}
