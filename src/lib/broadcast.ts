import { supabase } from "@/lib/supabase-client";

export async function broadcastMessage(channelName: string, message: unknown) {
  const ch = supabase.channel(channelName);
  await ch.send({ type: "broadcast", event: "new_message", payload: message });
}
