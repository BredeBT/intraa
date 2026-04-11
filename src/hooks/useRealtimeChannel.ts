"use client";

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtimeChannel<T = unknown>(
  channelName: string,
  onMessage: (payload: T) => void,
) {
  const channelRef    = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);   // true once SUBSCRIBED ack received
  const callbackRef   = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    if (!channelName) return;

    console.log("[Realtime] Kobler til kanal:", channelName);

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "new_message" }, (raw) => {
        console.log("[Realtime] Mottok melding på", channelName, raw);
        callbackRef.current(raw.payload as T);
      })
      .subscribe((status, err) => {
        console.log("[Realtime] Status:", status, err ?? "");
        subscribedRef.current = status === "SUBSCRIBED";
      });

    channelRef.current = channel;

    return () => {
      console.log("[Realtime] Kobler fra kanal:", channelName);
      subscribedRef.current = false;
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName]);

  const broadcast = useCallback(async (message: T) => {
    const ch = channelRef.current;
    if (!ch) {
      console.warn("[Realtime] broadcast() kalt men ingen kanal er koblet til");
      return;
    }
    if (!subscribedRef.current) {
      console.warn("[Realtime] broadcast() kalt men kanalen er ikke SUBSCRIBED ennå — venter...");
      // Poll every 50ms up to 2s for the channel to become subscribed
      await new Promise<void>((resolve) => {
        let attempts = 0;
        const id = setInterval(() => {
          if (subscribedRef.current || ++attempts > 40) {
            clearInterval(id);
            resolve();
          }
        }, 50);
      });
    }
    const result = await ch.send({
      type:    "broadcast",
      event:   "new_message",
      payload: message,
    });
    console.log("[Realtime] Broadcast sendt på", channelRef.current ? "aktiv kanal" : "ingen kanal", "→ result:", result);
  }, []);

  return { broadcast };
}
