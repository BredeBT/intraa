"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Ticket, MessageCircle, UserPlus } from "lucide-react";
import { MOCK_NOTIFICATIONS, type Notification, type NotifType } from "@/lib/notifications";

const TYPE_CONFIG: Record<NotifType, { icon: React.ElementType; color: string; bg: string }> = {
  message:  { icon: MessageSquare, color: "text-blue-400",   bg: "bg-blue-500/10" },
  ticket:   { icon: Ticket,        color: "text-yellow-400", bg: "bg-yellow-500/10" },
  comment:  { icon: MessageCircle, color: "text-violet-400", bg: "bg-violet-500/10" },
  user:     { icon: UserPlus,      color: "text-emerald-400",bg: "bg-emerald-500/10" },
};

export default function NotifikasjonerPage() {
  const [notifs, setNotifs] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unread = notifs.filter((n) => !n.read).length;

  function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Notifikasjoner</h1>
          {unread > 0 && (
            <p className="mt-0.5 text-sm text-zinc-500">{unread} uleste</p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Merk alle som lest
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {notifs.map((notif) => {
          const { icon: Icon, color, bg } = TYPE_CONFIG[notif.type];
          return (
            <Link
              key={notif.id}
              href={notif.href}
              onClick={() => markRead(notif.id)}
              className={`flex items-start gap-4 rounded-xl border px-5 py-4 transition-colors hover:bg-zinc-900 ${
                notif.read
                  ? "border-zinc-800 bg-transparent"
                  : "border-zinc-700 bg-zinc-900"
              }`}
            >
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${notif.read ? "text-zinc-300" : "text-white"}`}>
                    {notif.title}
                  </p>
                  <span className="shrink-0 text-xs text-zinc-600">{notif.time}</span>
                </div>
                <p className="mt-0.5 text-sm text-zinc-500">{notif.body}</p>
              </div>
              {!notif.read && (
                <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
