/**
 * Central notification dispatcher.
 *
 * All notification creation goes through these helpers so:
 *  - Schema usage is consistent
 *  - Push delivery is consistent
 *  - Metadata structure is consistent (used by auto-dismiss and UI)
 *
 * Each helper:
 *  1. Creates a Notification row
 *  2. Fires push notification (fire-and-forget)
 *  3. Broadcasts to realtime channel `user:<userId>:notifications` so the
 *     bell badge updates without polling
 */

import { db } from "@/server/db";
import { sendPushToUser, stripHtml } from "@/lib/webpush";
import { createSupabaseServer } from "@/lib/supabase-server";

type DispatchOpts = {
  userId:    string;
  type:      | "MESSAGE" | "MENTION" | "REPLY" | "COMMENT" | "LIKE" | "TICKET" | "USER"
             | "FRIEND_REQUEST" | "FRIEND_ACCEPTED"
             | "CALL_INCOMING"  | "CALL_MISSED"
             | "CHESS_INVITE"   | "CHESS_MOVE"    | "CHESS_RESULT"
             | "BROADCAST"      | "STORY"
             | "FANPASS_GRANTED" | "FANPASS_EXPIRING" | "SPONSOR_TAG";
  title:           string;
  body:            string;
  href:            string;
  iconUrl?:        string | null;
  metadata?:       Record<string, unknown>;
  priority?:       number;
  expiresInSec?:   number;
  organizationId?: string | null;
  pushTitle?:      string;
  pushBody?:       string;
};

async function broadcastToUser(userId: string, payload: unknown) {
  try {
    const supabase = createSupabaseServer();
    const channel  = supabase.channel(`user:${userId}:notifications`);
    await channel.subscribe();
    await channel.send({ type: "broadcast", event: "notification", payload });
    await supabase.removeChannel(channel);
  } catch { /* silent */ }
}

export async function dispatch(opts: DispatchOpts) {
  const expiresAt = opts.expiresInSec
    ? new Date(Date.now() + opts.expiresInSec * 1000)
    : null;

  const notif = await db.notification.create({
    data: {
      userId:         opts.userId,
      type:           opts.type,
      title:          opts.title,
      body:           opts.body,
      href:           opts.href,
      iconUrl:        opts.iconUrl ?? null,
      metadata:       opts.metadata ? JSON.parse(JSON.stringify(opts.metadata)) : null,
      priority:       opts.priority ?? 0,
      expiresAt,
      organizationId: opts.organizationId ?? null,
    },
  });

  // Fire-and-forget realtime
  void broadcastToUser(opts.userId, notif);

  // Fire-and-forget push
  void sendPushToUser(opts.userId, {
    title: opts.pushTitle ?? opts.title,
    body:  opts.pushBody  ?? stripHtml(opts.body),
    url:   opts.href,
  }).catch(() => {});

  return notif;
}

// ─── Domain-specific helpers ──────────────────────────────────────────────────

export function notifyDM(opts: {
  receiverId: string;
  senderId:   string;
  senderName: string;
  senderAvatar?: string | null;
  preview:    string;
}) {
  return dispatch({
    userId:   opts.receiverId,
    type:     "MESSAGE",
    title:    opts.senderName,
    body:     opts.preview,
    href:     `/meldinger?userId=${opts.senderId}`,
    iconUrl:  opts.senderAvatar ?? null,
    metadata: { fromUserId: opts.senderId, kind: "dm" },
  });
}

export function notifyChannelMention(opts: {
  receiverId:   string;
  mentionerName: string;
  channelId:    string;
  channelName:  string;
  preview:      string;
  orgId:        string;
}) {
  return dispatch({
    userId:         opts.receiverId,
    type:           "MENTION",
    title:          `${opts.mentionerName} nevnte deg`,
    body:           `i #${opts.channelName}: ${opts.preview}`,
    href:           `/meldinger?channelId=${opts.channelId}`,
    organizationId: opts.orgId,
    metadata:       { channelId: opts.channelId, kind: "mention" },
  });
}

export function notifyFriendRequest(opts: {
  receiverId: string;
  senderId:   string;
  senderName: string;
  senderAvatar?: string | null;
}) {
  return dispatch({
    userId:   opts.receiverId,
    type:     "FRIEND_REQUEST",
    title:    "Ny venneforespørsel",
    body:     `${opts.senderName} vil bli venner med deg`,
    href:     `/venner?tab=requests`,
    iconUrl:  opts.senderAvatar ?? null,
    metadata: { fromUserId: opts.senderId },
  });
}

export function notifyFriendAccepted(opts: {
  receiverId: string;
  accepterName: string;
  accepterId:   string;
  accepterAvatar?: string | null;
}) {
  return dispatch({
    userId:   opts.receiverId,
    type:     "FRIEND_ACCEPTED",
    title:    `${opts.accepterName} er nå vennen din`,
    body:     "Send en melding for å starte samtalen",
    href:     `/meldinger?userId=${opts.accepterId}`,
    iconUrl:  opts.accepterAvatar ?? null,
    metadata: { fromUserId: opts.accepterId },
  });
}

export function notifyIncomingCall(opts: {
  receiverId:   string;
  callerId:     string;
  callerName:   string;
  callerAvatar?: string | null;
  callType:     "audio" | "video";
}) {
  return dispatch({
    userId:        opts.receiverId,
    type:          "CALL_INCOMING",
    title:         `${opts.callerName} ringer`,
    body:          opts.callType === "video" ? "Videosamtale" : "Lydsamtale",
    href:          `/meldinger?userId=${opts.callerId}`,
    iconUrl:       opts.callerAvatar ?? null,
    priority:      10,
    expiresInSec:  60,    // ringer-vinduet
    metadata:      { fromUserId: opts.callerId, callType: opts.callType, kind: "ringing" },
    pushTitle:     `📞 ${opts.callerName} ringer`,
  });
}

export function notifyMissedCall(opts: {
  receiverId:   string;
  callerId:     string;
  callerName:   string;
  callerAvatar?: string | null;
  callType:     "audio" | "video";
}) {
  return dispatch({
    userId:   opts.receiverId,
    type:     "CALL_MISSED",
    title:    `Ubesvart anrop fra ${opts.callerName}`,
    body:     opts.callType === "video" ? "Videosamtale" : "Lydsamtale",
    href:     `/meldinger?userId=${opts.callerId}`,
    iconUrl:  opts.callerAvatar ?? null,
    metadata: { fromUserId: opts.callerId, callType: opts.callType },
  });
}

export function notifyChessInvite(opts: {
  receiverId:    string;
  senderName:    string;
  senderAvatar?: string | null;
  inviteId:      string;
  orgSlug:       string;
}) {
  return dispatch({
    userId:   opts.receiverId,
    type:     "CHESS_INVITE",
    title:    "Sjakk-invitasjon",
    body:     `${opts.senderName} utfordrer deg til sjakk`,
    href:     `/${opts.orgSlug}/spill/sjakk`,
    iconUrl:  opts.senderAvatar ?? null,
    metadata: { inviteId: opts.inviteId, kind: "chess_invite" },
  });
}

export function notifyChessMove(opts: {
  receiverId:   string;
  opponentName: string;
  gameId:       string;
  orgSlug:      string;
}) {
  return dispatch({
    userId:   opts.receiverId,
    type:     "CHESS_MOVE",
    title:    "Din tur!",
    body:     `${opts.opponentName} har gjort sitt trekk`,
    href:     `/${opts.orgSlug}/spill/sjakk/${opts.gameId}`,
    metadata: { gameId: opts.gameId },
  });
}

export function notifyChessResult(opts: {
  receiverId:   string;
  opponentName: string;
  result:       "win" | "loss" | "draw";
  gameId:       string;
  orgSlug:      string;
}) {
  const title = opts.result === "win"  ? "🏆 Du vant!"
              : opts.result === "loss" ? "Du tapte"
              :                          "🤝 Remis";
  return dispatch({
    userId:   opts.receiverId,
    type:     "CHESS_RESULT",
    title,
    body:     `mot ${opts.opponentName}`,
    href:     `/${opts.orgSlug}/spill/sjakk/${opts.gameId}`,
    metadata: { gameId: opts.gameId, result: opts.result },
  });
}

export function notifyBroadcast(opts: {
  receiverId:   string;
  creatorName:  string;
  creatorAvatar?: string | null;
  channelId:    string;
  channelName:  string;
  preview:      string;
  orgId:        string;
}) {
  return dispatch({
    userId:         opts.receiverId,
    type:           "BROADCAST",
    title:          `♛ ${opts.creatorName} broadcastet`,
    body:           opts.preview,
    href:           `/meldinger?channelId=${opts.channelId}`,
    iconUrl:        opts.creatorAvatar ?? null,
    organizationId: opts.orgId,
    metadata:       { channelId: opts.channelId },
  });
}

export function notifyStory(opts: {
  receiverId:    string;
  creatorName:   string;
  creatorAvatar?: string | null;
  channelId:     string;
  orgId:         string;
}) {
  return dispatch({
    userId:         opts.receiverId,
    type:           "STORY",
    title:          `${opts.creatorName} la til en story`,
    body:           "Trykk for å se",
    href:           `/meldinger?channelId=${opts.channelId}`,
    iconUrl:        opts.creatorAvatar ?? null,
    organizationId: opts.orgId,
    metadata:       { channelId: opts.channelId },
  });
}

export function notifyFanpassGranted(opts: {
  receiverId: string;
  orgName:    string;
  orgSlug:    string;
  orgId:      string;
}) {
  return dispatch({
    userId:         opts.receiverId,
    type:           "FANPASS_GRANTED",
    title:          "♛ Du har fått Fanpass!",
    body:           `Velkommen til ${opts.orgName}'s Fanpass-medlemmer`,
    href:           `/${opts.orgSlug}`,
    organizationId: opts.orgId,
    metadata:       { kind: "fanpass" },
  });
}

export function notifySponsorTag(opts: {
  receiverId:  string;  // sponsor user-id
  creatorName: string;
  brandSlug:   string;
}) {
  return dispatch({
    userId:   opts.receiverId,
    type:     "SPONSOR_TAG",
    title:    "Du ble tagget i en story",
    body:     `${opts.creatorName} tagget brandet ditt`,
    href:     `/brand/dashboard`,
    metadata: { brandSlug: opts.brandSlug },
  });
}
