"use client";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationButton() {
  const { supported, permission, subscribed, checking, subscribe, unsubscribe } = usePushNotifications();

  if (!supported || checking) return null;

  if (permission === "denied") {
    return (
      <p className="text-sm text-white/40">
        Varsler er blokkert i nettleseren din. Gå til nettleserinnstillinger for å aktivere.
      </p>
    );
  }

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      className="flex items-center gap-2 rounded-lg border border-[#6c47ff]/30 bg-[#6c47ff]/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6c47ff]/30"
    >
      {subscribed ? "🔔 Varsler aktivert — klikk for å deaktivere" : "🔕 Aktiver push-varsler"}
    </button>
  );
}
