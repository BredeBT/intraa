"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, MessageSquare, Ticket, MessageCircle, UserPlus, Check, X } from "lucide-react";
import { getNotifications, markNotificationRead } from "@/server/actions/notifications";
import type { DbNotification } from "@/server/actions/notifications";
import { getPendingInvitations } from "@/server/actions/invitations";
import type { PendingInvitation } from "@/server/actions/invitations";
import type { NotifType } from "@/lib/notifications";

const TYPE_ICONS: Record<NotifType, React.ElementType> = {
  MESSAGE: MessageSquare,
  TICKET:  Ticket,
  COMMENT: MessageCircle,
  USER:    UserPlus,
};

function relTime(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Nå";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}t`;
  return "I går";
}

export default function NotificationBell() {
  const [notifs,      setNotifs]      = useState<DbNotification[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [open,        setOpen]        = useState(false);
  const [, startTransition]           = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startTransition(async () => {
      const [data, invites] = await Promise.all([
        getNotifications(),
        getPendingInvitations(),
      ]);
      setNotifs(data);
      setInvitations(invites);
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date() } : n));
    startTransition(async () => { await markNotificationRead(id); });
  }

  async function handleAccept(token: string) {
    const res = await fetch(`/api/invitations/${token}/accept`, { method: "POST" });
    if (res.ok) {
      const data = await res.json() as { slug: string };
      setInvitations((prev) => prev.filter((i) => i.token !== token));
      setOpen(false);
      // Switch to the new org's cookie then navigate
      await fetch("/api/user/org", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ slug: data.slug }),
      });
      router.push("/feed");
      router.refresh();
    }
  }

  async function handleDecline(token: string) {
    await fetch(`/api/invitations/${token}/decline`, { method: "POST" });
    setInvitations((prev) => prev.filter((i) => i.token !== token));
  }

  const unreadNotifs = notifs.filter((n) => !n.readAt).length;
  const totalUnread  = unreadNotifs + invitations.length;
  const preview      = notifs.slice(0, 5);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {totalUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-80 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <span className="text-sm font-semibold text-white">Notifikasjoner</span>
            {totalUnread > 0 && (
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400">
                {totalUnread} uleste
              </span>
            )}
          </div>

          <div className="flex flex-col">
            {/* Pending invitations */}
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="border-b border-zinc-800 bg-violet-500/5 px-4 py-3"
              >
                <div className="mb-2 flex items-start gap-2">
                  <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white">
                      Invitasjon til {inv.orgName}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Fra {inv.invitedByName}. Godta eller avslå.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(inv.token)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md bg-violet-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500"
                  >
                    <Check className="h-3 w-3" /> Godta
                  </button>
                  <button
                    onClick={() => handleDecline(inv.token)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    <X className="h-3 w-3" /> Avslå
                  </button>
                </div>
              </div>
            ))}

            {/* Regular notifications */}
            {preview.length === 0 && invitations.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-zinc-600">Ingen notifikasjoner ennå.</p>
            )}
            {preview.map((notif) => {
              const Icon   = TYPE_ICONS[notif.type];
              const isRead = !!notif.readAt;
              return (
                <Link
                  key={notif.id}
                  href={notif.href}
                  onClick={() => { handleRead(notif.id); setOpen(false); }}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-800 ${!isRead ? "bg-zinc-800/50" : ""}`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${!isRead ? "text-indigo-400" : "text-zinc-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-medium ${isRead ? "text-zinc-300" : "text-white"}`}>
                      {notif.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{notif.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-600">{relTime(notif.createdAt)}</span>
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
