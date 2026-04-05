"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { MessageSquare, Ticket, MessageCircle, UserPlus } from "lucide-react";
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
} from "@/server/actions/notifications";
import type { DbNotification } from "@/server/actions/notifications";
import type { NotifType } from "@/lib/notifications";

const TYPE_CONFIG: Record<NotifType, { icon: React.ElementType; color: string; bg: string }> = {
  MESSAGE: { icon: MessageSquare, color: "text-blue-400",    bg: "bg-blue-500/10"    },
  TICKET:  { icon: Ticket,        color: "text-yellow-400",  bg: "bg-yellow-500/10"  },
  COMMENT: { icon: MessageCircle, color: "text-violet-400",  bg: "bg-violet-500/10"  },
  USER:    { icon: UserPlus,      color: "text-emerald-400", bg: "bg-emerald-500/10" },
};

function relTime(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Nå";
  if (mins < 60) return `${mins} min siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} time${hours !== 1 ? "r" : ""} siden`;
  return "I går";
}

export default function NotifikasjonerPage() {
  const [notifs,  setNotifs]  = useState<DbNotification[]>([]);
  const [, startTransition]   = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getNotifications();
      setNotifs(data);
    });
  }, []);

  const unread = notifs.filter((n) => !n.readAt).length;

  function handleRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date() } : n));
    startTransition(async () => { await markNotificationRead(id); });
  }

  function handleMarkAll() {
    setNotifs((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    startTransition(async () => { await markAllNotificationsRead(); });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Notifikasjoner</h1>
          {unread > 0 && <p className="mt-0.5 text-sm text-zinc-500">{unread} uleste</p>}
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAll}
            className="text-sm text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Merk alle som lest
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <p className="text-center text-sm text-zinc-600">Ingen notifikasjoner ennå.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notifs.map((notif) => {
            const { icon: Icon, color, bg } = TYPE_CONFIG[notif.type];
            const isRead = !!notif.readAt;
            return (
              <Link
                key={notif.id}
                href={notif.href}
                onClick={() => handleRead(notif.id)}
                className={`flex items-start gap-4 rounded-xl border px-5 py-4 transition-colors hover:bg-zinc-900 ${
                  isRead ? "border-zinc-800 bg-transparent" : "border-zinc-700 bg-zinc-900"
                }`}
              >
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${isRead ? "text-zinc-300" : "text-white"}`}>
                      {notif.title}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-600">{relTime(notif.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500">{notif.body}</p>
                </div>
                {!isRead && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
