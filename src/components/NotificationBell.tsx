"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, MessageSquare, Ticket, MessageCircle, UserPlus } from "lucide-react";
import { MOCK_NOTIFICATIONS, type Notification, type NotifType } from "@/lib/notifications";

const TYPE_ICONS: Record<NotifType, React.ElementType> = {
  message: MessageSquare,
  ticket:  Ticket,
  comment: MessageCircle,
  user:    UserPlus,
};

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.read).length;
  const preview = notifs.slice(0, 5);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-80 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <span className="text-sm font-semibold text-white">Notifikasjoner</span>
            {unread > 0 && (
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400">
                {unread} uleste
              </span>
            )}
          </div>

          <div className="flex flex-col">
            {preview.map((notif) => {
              const Icon = TYPE_ICONS[notif.type];
              return (
                <Link
                  key={notif.id}
                  href={notif.href}
                  onClick={() => { markRead(notif.id); setOpen(false); }}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-800 ${
                    !notif.read ? "bg-zinc-800/50" : ""
                  }`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${!notif.read ? "text-indigo-400" : "text-zinc-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-medium ${notif.read ? "text-zinc-300" : "text-white"}`}>
                      {notif.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{notif.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-600">{notif.time}</span>
                </Link>
              );
            })}
          </div>

          <div className="border-t border-zinc-800 px-4 py-2.5">
            <Link
              href="/notifikasjoner"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
            >
              Se alle notifikasjoner
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
