"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell, MessageSquare, AtSign, MessageCircle, Heart, Ticket, UserPlus, Phone, PhoneMissed,
  Crown, Sparkles, Trophy, Radio, Briefcase, Check, X, BellOff,
} from "lucide-react";
import { getNotifications, markAllNotificationsRead, clearReadNotifications } from "@/server/actions/notifications";
import type { DbNotification, NotifTypeAll } from "@/server/actions/notifications";
import { getPendingInvitations } from "@/server/actions/invitations";
import type { PendingInvitation } from "@/server/actions/invitations";
import { supabase } from "@/lib/supabase-client";

interface TypeMeta {
  icon:  React.ElementType;
  color: string;
}
const TYPE_META: Record<NotifTypeAll, TypeMeta> = {
  MESSAGE:         { icon: MessageSquare, color: "#A855F7" },
  MENTION:         { icon: AtSign,        color: "#F472B6" },
  REPLY:           { icon: MessageCircle, color: "#A855F7" },
  COMMENT:         { icon: MessageCircle, color: "#60A5FA" },
  LIKE:            { icon: Heart,         color: "#F472B6" },
  TICKET:          { icon: Ticket,        color: "#FBBF24" },
  USER:            { icon: UserPlus,      color: "#5EEAD4" },
  FRIEND_REQUEST:  { icon: UserPlus,      color: "#5EEAD4" },
  FRIEND_ACCEPTED: { icon: UserPlus,      color: "#5EEAD4" },
  CALL_INCOMING:   { icon: Phone,         color: "#5EEAD4" },
  CALL_MISSED:     { icon: PhoneMissed,   color: "#F472B6" },
  CHESS_INVITE:    { icon: Crown,         color: "#FBBF24" },
  CHESS_MOVE:      { icon: Crown,         color: "#A855F7" },
  CHESS_RESULT:    { icon: Trophy,        color: "#FBBF24" },
  BROADCAST:       { icon: Radio,         color: "#A855F7" },
  STORY:           { icon: Sparkles,      color: "#60A5FA" },
  FANPASS_GRANTED: { icon: Crown,         color: "#A855F7" },
  FANPASS_EXPIRING:{ icon: Crown,         color: "#FBBF24" },
  SPONSOR_TAG:     { icon: Briefcase,     color: "#60A5FA" },
};

function relTime(date: Date | string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Nå";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}t`;
  const days = Math.floor(hours / 24);
  if (days < 7)   return `${days}d`;
  return new Date(date).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

function initials(s: string | null | undefined) {
  return (s ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function NotificationBell() {
  const [notifs,      setNotifs]      = useState<DbNotification[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [open,        setOpen]        = useState(false);
  const [userId,      setUserId]      = useState<string | null>(null);
  const [, startTransition]           = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const userIdRef = useRef<string | null>(null);

  // Initial fetch
  useEffect(() => {
    startTransition(async () => {
      const [data, invites] = await Promise.all([
        getNotifications(),
        getPendingInvitations(),
      ]);
      setNotifs(data);
      setInvitations(invites);
      if (data.length > 0) {
        userIdRef.current = data[0]!.userId;
        setUserId(data[0]!.userId);
      }
    });
  }, []);

  // Hvis vi ikke fikk userId fra første fetch (ingen notifs ennå),
  // poll én gang i minuttet til vi har den.
  useEffect(() => {
    if (userId) return;
    const poll = setInterval(async () => {
      const fresh = await getNotifications();
      setNotifs(fresh);
      if (fresh.length > 0 && !userIdRef.current) {
        userIdRef.current = fresh[0]!.userId;
        setUserId(fresh[0]!.userId);
      }
    }, 60000);
    return () => clearInterval(poll);
  }, [userId]);

  // Realtime subscription — settes opp én gang når userId blir kjent
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`user:${userId}:notifications`);
    channel
      .on("broadcast", { event: "notification" }, (payload) => {
        const next = payload.payload as DbNotification;
        setNotifs((prev) => {
          if (prev.some((n) => n.id === next.id)) return prev;
          return [next, ...prev];
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleAccept(token: string) {
    const res = await fetch(`/api/invitations/${token}/accept`, { method: "POST" });
    if (res.ok) {
      const data = await res.json() as { slug: string };
      setInvitations((prev) => prev.filter((i) => i.token !== token));
      setOpen(false);
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

  // Filter out expired notifications (defensive — server should also do this)
  const now = Date.now();
  const visible = notifs.filter((n) => !n.expiresAt || new Date(n.expiresAt).getTime() > now);

  const unreadNotifs = visible.filter((n) => !n.readAt).length;
  const totalUnread  = unreadNotifs + invitations.length;
  const preview      = visible.slice(0, 8);

  // Sort: incoming calls always first (priority 10), then by createdAt
  preview.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          const opening = !open;
          setOpen(opening);
          if (opening && unreadNotifs > 0) {
            setNotifs((prev) => prev.map((n) => n.readAt ? n : { ...n, readAt: new Date() }));
            startTransition(async () => { await markAllNotificationsRead(); });
          }
        }}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {totalUnread > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #A855F7, #F472B6)",
              boxShadow:  "0 0 8px rgba(168,85,247,0.6)",
            }}
          >
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl shadow-2xl"
          style={{
            background: "var(--bg-secondary)",
            border:     "1px solid var(--border-default)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
            <span className="text-sm font-bold text-white">Varsler</span>
            <div className="flex items-center gap-3">
              {totalUnread > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: "rgba(168,85,247,0.20)", color: "#A855F7" }}
                >
                  {totalUnread} ny{totalUnread === 1 ? "" : "e"}
                </span>
              )}
              {visible.length > 0 && (
                <button
                  onClick={async () => {
                    await clearReadNotifications();
                    setNotifs((prev) => prev.filter((n) => !n.readAt && (!n.expiresAt || new Date(n.expiresAt).getTime() > Date.now())));
                  }}
                  className="text-[10px] text-white/40 hover:text-white transition-colors"
                  title="Slett leste"
                >
                  Rydd
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {/* Pending org invitations — special handling */}
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="px-4 py-3 border-b border-white/[0.06]"
                style={{ background: "rgba(168,85,247,0.06)" }}
              >
                <div className="mb-2 flex items-start gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "rgba(168,85,247,0.20)", color: "#A855F7" }}
                  >
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      Invitasjon til {inv.orgName}
                    </p>
                    <p className="mt-0.5 text-xs text-white/50 truncate">
                      Fra {inv.invitedByName}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(inv.token)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #5EEAD4, #A855F7)" }}
                  >
                    <Check className="h-3 w-3" /> Godta
                  </button>
                  <button
                    onClick={() => handleDecline(inv.token)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md border border-white/10 bg-white/[0.04] py-1.5 text-xs font-medium text-white/60 hover:bg-white/[0.08]"
                  >
                    <X className="h-3 w-3" /> Avslå
                  </button>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {preview.length === 0 && invitations.length === 0 && (
              <div className="px-4 py-10 text-center">
                <BellOff className="h-6 w-6 text-white/20 mx-auto mb-2" />
                <p className="text-xs text-white/40">Ingen varsler ennå</p>
                <p className="mt-1 text-[10px] text-white/25">Du vil få beskjed her når noe skjer</p>
              </div>
            )}

            {/* Notifications list */}
            {preview.map((n) => <NotifRow key={n.id} notif={n} onClick={() => setOpen(false)} />)}
          </div>

          <div className="border-t border-white/[0.06] px-4 py-2.5">
            <Link
              href="/notifikasjoner"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium transition-colors"
              style={{ color: "#A855F7" }}
            >
              Se alle varsler →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifRow({ notif, onClick }: { notif: DbNotification; onClick: () => void }) {
  const meta = TYPE_META[notif.type] ?? TYPE_META.USER;
  const Icon = meta.icon;
  const isRead = !!notif.readAt;
  const isCall = notif.type === "CALL_INCOMING";

  return (
    <Link
      href={notif.href}
      onClick={onClick}
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04] border-b border-white/[0.04]"
      style={{
        background: !isRead ? "rgba(255,255,255,0.02)" : "transparent",
      }}
    >
      {/* Icon or avatar */}
      <div className="relative shrink-0">
        {notif.iconUrl ? (
          <div
            className="h-9 w-9 rounded-full"
            style={{ background: `url(${notif.iconUrl}) center/cover, var(--bg-glass)` }}
          />
        ) : (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              background: notif.iconUrl ? `url(${notif.iconUrl}) center/cover` : `${meta.color}15`,
              color:      meta.color,
              border:     `1px solid ${meta.color}30`,
            }}
          >
            {notif.iconUrl ? null : initials(notif.title)}
          </div>
        )}
        {/* Type-icon overlay (bottom-right) */}
        <div
          className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full"
          style={{
            background: "var(--bg-secondary)",
            border:     `1.5px solid ${meta.color}`,
            color:      meta.color,
          }}
        >
          <Icon className="h-2.5 w-2.5" />
        </div>
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <p className={`text-xs ${isRead ? "text-white/60" : "font-semibold text-white"}`}>
          {notif.title}
        </p>
        <p className="mt-0.5 text-[11px] text-white/50 line-clamp-2">{notif.body}</p>
        {isCall && (
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#5EEAD4" }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "#5EEAD4" }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "#5EEAD4" }} />
            </span>
            Ringer nå
          </span>
        )}
      </div>

      <span className="shrink-0 text-[10px] text-white/30">{relTime(notif.createdAt)}</span>
    </Link>
  );
}
