"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell, MessageSquare, AtSign, MessageCircle, Heart, Ticket, UserPlus, Phone, PhoneMissed,
  Crown, Sparkles, Trophy, Radio, Briefcase, BellOff, Trash2, Check, X,
} from "lucide-react";
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
  deleteNotification, clearReadNotifications,
} from "@/server/actions/notifications";
import type { DbNotification, NotifTypeAll } from "@/server/actions/notifications";

type FilterKey = "ALL" | "MESSAGES" | "SOCIAL" | "GAMES" | "BROADCASTS" | "CALLS";

const FILTERS: { key: FilterKey; label: string; types: NotifTypeAll[] }[] = [
  { key: "ALL",        label: "Alle",       types: [] },
  { key: "MESSAGES",   label: "Meldinger",  types: ["MESSAGE", "MENTION", "REPLY", "COMMENT"] },
  { key: "SOCIAL",     label: "Sosialt",    types: ["FRIEND_REQUEST", "FRIEND_ACCEPTED", "LIKE", "USER"] },
  { key: "GAMES",      label: "Spill",      types: ["CHESS_INVITE", "CHESS_MOVE", "CHESS_RESULT"] },
  { key: "BROADCASTS", label: "Broadcasts", types: ["BROADCAST", "STORY", "FANPASS_GRANTED", "FANPASS_EXPIRING", "SPONSOR_TAG"] },
  { key: "CALLS",      label: "Anrop",      types: ["CALL_INCOMING", "CALL_MISSED"] },
];

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
  if (mins < 60) return `${mins} min siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} time${hours !== 1 ? "r" : ""} siden`;
  const days = Math.floor(hours / 24);
  if (days < 7)   return `${days} dag${days !== 1 ? "er" : ""} siden`;
  return new Date(date).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

function initials(s: string | null | undefined) {
  return (s ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function dayBucket(date: Date | string): "I dag" | "I går" | "Tidligere" {
  const now = new Date();
  const d   = new Date(date);
  if (now.toDateString() === d.toDateString()) return "I dag";
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (y.toDateString() === d.toDateString())   return "I går";
  return "Tidligere";
}

export default function NotifikasjonerPage() {
  const [notifs, setNotifs] = useState<DbNotification[]>([]);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getNotifications();
      setNotifs(data);
    });
  }, []);

  const unread = notifs.filter((n) => !n.readAt).length;

  // Filter
  const filterDef  = FILTERS.find((f) => f.key === filter)!;
  const filtered   = filter === "ALL"
    ? notifs
    : notifs.filter((n) => filterDef.types.includes(n.type));

  // Group by day
  const grouped: Record<string, DbNotification[]> = {};
  for (const n of filtered) {
    const b = dayBucket(n.createdAt);
    (grouped[b] ??= []).push(n);
  }
  const dayOrder: ("I dag" | "I går" | "Tidligere")[] = ["I dag", "I går", "Tidligere"];

  async function handleRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date() } : n));
    startTransition(async () => { await markNotificationRead(id); });
  }

  async function handleDelete(id: string) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => { await deleteNotification(id); });
  }

  function handleMarkAll() {
    setNotifs((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    startTransition(async () => { await markAllNotificationsRead(); });
  }

  async function handleClearRead() {
    setNotifs((prev) => prev.filter((n) => !n.readAt));
    startTransition(async () => { await clearReadNotifications(); });
  }

  // Count per filter for chip badges
  const filterCounts = FILTERS.reduce((acc, f) => {
    acc[f.key] = f.key === "ALL"
      ? notifs.filter((n) => !n.readAt).length
      : notifs.filter((n) => f.types.includes(n.type) && !n.readAt).length;
    return acc;
  }, {} as Record<FilterKey, number>);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8" style={{ background: "#050816", minHeight: "100vh" }}>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(96,165,250,0.10))",
              border:     "1px solid rgba(168,85,247,0.30)",
              color:      "#A855F7",
            }}
          >
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Varsler</h1>
            <p className="text-xs text-white/40">
              {unread === 0 ? "Du er oppdatert" : `${unread} ulest${unread === 1 ? "" : "e"}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button
              onClick={handleMarkAll}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: "rgba(168,85,247,0.15)",
                color:      "#A855F7",
                border:     "1px solid rgba(168,85,247,0.30)",
              }}
            >
              <Check className="inline h-3 w-3 mr-1" />
              Merk alle som lest
            </button>
          )}
          {notifs.some((n) => n.readAt) && (
            <button
              onClick={handleClearRead}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white hover:bg-white/[0.06]"
              title="Slett alle leste"
            >
              <Trash2 className="inline h-3 w-3 mr-1" />
              Rydd
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          const count    = filterCounts[f.key];
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5"
              style={{
                background: isActive ? "rgba(168,85,247,0.20)" : "rgba(255,255,255,0.04)",
                color:      isActive ? "#fff" : "rgba(255,255,255,0.60)",
                border:     `1px solid ${isActive ? "rgba(168,85,247,0.45)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {f.label}
              {count > 0 && (
                <span
                  className="text-[10px] rounded-full px-1.5 leading-[16px] h-4"
                  style={{ background: "rgba(168,85,247,0.30)", color: "#fff" }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl py-16 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <BellOff className="h-7 w-7 text-white/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-white/60">
            {filter === "ALL" ? "Ingen varsler ennå" : "Ingen varsler i denne kategorien"}
          </p>
          <p className="mt-1 text-xs text-white/30">
            Du får beskjed her når noen sender melding, ringer, inviterer til spill eller annet skjer
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {dayOrder.map((day) => {
            const items = grouped[day];
            if (!items || items.length === 0) return null;
            return (
              <div key={day}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{day}</p>
                <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {items.map((notif) => {
                    const meta = TYPE_META[notif.type] ?? TYPE_META.USER;
                    const Icon = meta.icon;
                    const isRead = !!notif.readAt;
                    return (
                      <div
                        key={notif.id}
                        className="group relative flex items-start gap-3 px-4 py-3.5 border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.04]"
                        style={{ background: !isRead ? "rgba(168,85,247,0.04)" : "transparent" }}
                      >
                        <Link
                          href={notif.href}
                          onClick={() => handleRead(notif.id)}
                          className="absolute inset-0"
                          aria-label="Åpne varsel"
                        />

                        {/* Avatar + type icon */}
                        <div className="relative shrink-0">
                          {notif.iconUrl ? (
                            <div
                              className="h-10 w-10 rounded-full"
                              style={{ background: `url(${notif.iconUrl}) center/cover, rgba(255,255,255,0.05)` }}
                            />
                          ) : (
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
                              style={{
                                background: `${meta.color}15`,
                                color:      meta.color,
                                border:     `1px solid ${meta.color}30`,
                              }}
                            >
                              {initials(notif.title)}
                            </div>
                          )}
                          <div
                            className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full"
                            style={{
                              background: "#0B1027",
                              border:     `1.5px solid ${meta.color}`,
                              color:      meta.color,
                            }}
                          >
                            <Icon className="h-3 w-3" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${isRead ? "text-white/70" : "font-semibold text-white"}`}>
                            {notif.title}
                          </p>
                          <p className="mt-0.5 text-xs text-white/50 line-clamp-2">{notif.body}</p>
                          <p className="mt-1 text-[10px] text-white/30">{relTime(notif.createdAt)}</p>
                        </div>

                        {!isRead && (
                          <span
                            className="mt-2 h-2 w-2 shrink-0 rounded-full"
                            style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
                          />
                        )}

                        <button
                          onClick={(e) => { e.preventDefault(); void handleDelete(notif.id); }}
                          className="relative z-10 self-start opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-white/40 hover:text-white hover:bg-white/10"
                          title="Slett"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
