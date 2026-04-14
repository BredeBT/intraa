"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import {
  Search, Send, MessageSquare, ChevronDown, ChevronLeft,
  Hash, Plus, X, Check, UserPlus, Clock,
} from "lucide-react";
import RichTextEditor, { type RichTextEditorRef } from "@/components/RichTextEditor";
import SafeHtml from "@/components/SafeHtml";
import type { UserSearchResult } from "@/app/api/users/search/route";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase-client";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Phone, Video, MicOff, VideoOff, PhoneOff } from "lucide-react";

const ChannelView = dynamic(() => import("./ChannelView"), { ssr: false });
const GroupView   = dynamic(() => import("./GroupView"),   { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgChannel { id: string; name: string; type: string; unread: number }

interface Community {
  orgId:   string;
  orgName: string;
  orgType: string;
  logoUrl: string | null;
  role:    string;
  channels: OrgChannel[];
}

interface Friend { id: string; name: string | null; avatarUrl: string | null }

interface Conversation {
  friend:      Friend;
  lastMessage: { content: string; createdAt: string } | null;
  unreadCount: number;
}

interface Group {
  id:          string;
  name:        string;
  createdBy:   string;
  lastMessage: { content: string; createdAt: string } | null;
  unread:      number;
  members:     { id: string; name: string | null; avatarUrl: string | null }[];
}

interface ActiveDM      { type: "dm";      userId: string }
interface ActiveChannel { type: "channel"; channelId: string; channelName: string; orgId: string; role: string; orgName: string; members: { id: string; name: string | null }[] }
interface ActiveGroup   { type: "group";   groupId: string; groupName: string; createdBy: string; members: { id: string; name: string | null; avatarUrl: string | null }[] }
type Active = ActiveDM | ActiveChannel | ActiveGroup | null;

interface Props {
  currentUserId:    string;
  currentUserName:  string;
  communities:      Community[];
  conversations:    Conversation[];
  groups:           Group[];
  invitablePeople:  { id: string; name: string | null; avatarUrl: string | null }[];
  allMembers:       { id: string; name: string | null }[];
  initialUserId:    string | null;
  initialChannelId: string | null;
  initialGroupId:   string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "nå";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}t`;
  if (h < 48) return "i går";
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

function msgTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string) {
  const d   = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.setHours(0,0,0,0) - new Date(iso).setHours(0,0,0,0)) / 86400000);
  if (diffDays === 0) return `I dag ${d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}`;
  if (diffDays === 1) return "I går";
  return d.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "short" });
}

function strip(html: string, max = 45) {
  return html.replace(/<[^>]*>/g, "").slice(0, max);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ avatarUrl, name, size = 10, isOnline }: { avatarUrl: string | null; name: string | null; size?: number; isOnline?: boolean }) {
  const cls = `h-${size} w-${size} shrink-0 rounded-full object-cover`;
  const dot = isOnline ? (
    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-[#12121e]" />
  ) : null;
  const inner = avatarUrl
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={avatarUrl} alt="" className={cls} />
    : <div className={`${cls} flex items-center justify-center bg-gradient-to-br from-zinc-600 to-zinc-700 text-xs font-bold text-white`}>{initials(name)}</div>;
  if (!isOnline) return inner;
  return <div className="relative shrink-0">{inner}{dot}</div>;
}

function OrgAvatar({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  if (logoUrl) return <img src={logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />;  // eslint-disable-line @next/next/no-img-element
  return (
    <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-sm font-bold text-white">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function GroupAvatar({ members }: { members: { name: string | null }[] }) {
  return (
    <div className="relative h-10 w-10 shrink-0">
      {members.slice(0, 2).map((m, i) => (
        <div key={i} className={`absolute flex h-6 w-6 items-center justify-center rounded-full bg-zinc-600 text-[9px] font-bold text-white ring-2 ring-zinc-900 ${i === 0 ? "top-0 left-0" : "bottom-0 right-0"}`}>
          {(m.name ?? "?").charAt(0).toUpperCase()}
        </div>
      ))}
    </div>
  );
}

// ─── Message grouping for DMView ──────────────────────────────────────────────

interface DMMessage {
  id:        string;
  content:   string;
  createdAt: string;
  senderId:  string;
  sender:    { id: string; name: string | null; avatarUrl: string | null };
}

interface MsgGroup {
  senderId: string;
  sender:   DMMessage["sender"];
  msgs:     DMMessage[];
  firstAt:  string;
  lastAt:   string;
}

function groupMessages(messages: DMMessage[]): MsgGroup[] {
  const groups: MsgGroup[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    const gap = last ? new Date(msg.createdAt).getTime() - new Date(last.lastAt).getTime() : Infinity;
    if (last && last.senderId === msg.senderId && gap < 5 * 60_000) {
      last.msgs.push(msg);
      last.lastAt = msg.createdAt;
    } else {
      groups.push({ senderId: msg.senderId, sender: msg.sender, msgs: [msg], firstAt: msg.createdAt, lastAt: msg.createdAt });
    }
  }
  return groups;
}

// ─── New Group Modal ──────────────────────────────────────────────────────────

function NewGroupModal({
  people, currentUserId, onClose, onCreated,
}: {
  people:        { id: string; name: string | null; avatarUrl: string | null }[];
  currentUserId: string;
  onClose:       () => void;
  onCreated:     (group: Group) => void;
}) {
  const [name,     setName]     = useState("");
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const filtered = people.filter((p) =>
    p.id !== currentUserId && (!search || (p.name ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function create() {
    if (!name.trim()) { setError("Gruppenavn er påkrevd"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ name: name.trim(), memberIds: selected }),
    });
    const data = await res.json() as { group?: { id: string; name: string; members: { id: string; name: string | null; avatarUrl: string | null }[] }; error?: string };
    if (!res.ok || !data.group) { setError(data.error ?? "Noe gikk galt"); setLoading(false); return; }
    onCreated({ id: data.group.id, name: data.group.name, createdBy: currentUserId, lastMessage: null, unread: 0, members: data.group.members });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Ny gruppe</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-5">
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Gruppenavn"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-violet-500 transition-colors"
          />
          <div>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 mb-2">
              <Search className="h-3.5 w-3.5 text-zinc-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk…"
                className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-500 outline-none" />
            </div>
            {selected.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {selected.map((id) => {
                  const p = people.find((x) => x.id === id);
                  return (
                    <span key={id} className="flex items-center gap-1 rounded-full bg-violet-600/20 px-2 py-0.5 text-xs text-violet-300">
                      {p?.name?.split(" ")[0]}
                      <button onClick={() => toggle(id)}><X className="h-2.5 w-2.5" /></button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="max-h-36 overflow-y-auto rounded-xl border border-zinc-800">
              {filtered.length === 0
                ? <p className="px-3 py-3 text-xs text-zinc-500">Ingen resultater</p>
                : filtered.map((p) => (
                  <button key={p.id} onClick={() => toggle(p.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-zinc-800 transition-colors">
                    <Avatar avatarUrl={p.avatarUrl} name={p.name} size={7} />
                    <span className="flex-1 text-sm text-white">{p.name ?? "Ukjent"}</span>
                    {selected.includes(p.id) && <Check className="h-3.5 w-3.5 text-violet-400" />}
                  </button>
                ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <button onClick={onClose} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Avbryt</button>
          <button onClick={() => void create()} disabled={loading}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40 transition-colors">
            {loading ? "Oppretter…" : "Opprett gruppe"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DM View ──────────────────────────────────────────────────────────────────

function DMView({ friendId, friend, currentUserId }: { friendId: string; friend: Friend; currentUserId: string }) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [sending,  setSending]  = useState(false);
  const [hasText,  setHasText]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RichTextEditorRef>(null);
  const [, start] = useTransition();

  useEffect(() => {
    fetch(`/api/dm/${friendId}`)
      .then((r) => r.json() as Promise<{ messages: DMMessage[] }>)
      .then(({ messages: msgs }) => setMessages(msgs));
    fetch(`/api/dm/${friendId}/read`, { method: "PATCH" }).catch(() => null);
  }, [friendId]);

  const dmChannel = [currentUserId, friendId].sort().join(":");
  const { broadcast } = useRealtimeChannel<DMMessage>(`dm:${dmChannel}`, (msg) => {
    setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!editorRef.current || editorRef.current.isEmpty() || sending) return;
    const html = editorRef.current.getHTML();
    setSending(true);
    editorRef.current.clear();
    setHasText(false);
    const res = await fetch(`/api/dm/${friendId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ content: html }),
    });
    if (res.ok) {
      const data = await res.json() as { message: DMMessage };
      setMessages((prev) => [...prev, data.message]);
      void broadcast(data.message);
    }
    setSending(false);
  }

  const groups = groupMessages(messages);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Avatar avatarUrl={friend.avatarUrl} name={friend.name} size={14} />
              <p className="mt-3 text-sm font-semibold text-white">{friend.name ?? "Ukjent"}</p>
              <p className="mt-1 text-xs text-white/30">Starten på samtalen din med {friend.name?.split(" ")[0] ?? "denne personen"}</p>
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          const isMe = msg.senderId === currentUserId;
          const prev = messages[index - 1];
          const next = messages[index + 1];
          const GAP  = 5 * 60_000;
          const isFirstInGroup = !prev || prev.senderId !== msg.senderId || new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > GAP;
          const isLastInGroup  = !next || next.senderId !== msg.senderId || new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() > GAP;

          // Day separator — show when date changes or > 15 min from prev
          const showDaySep = !prev || new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 15 * 60_000;

          return (
            <div key={msg.id}>
              {showDaySep && (
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[11px] text-white/30 font-medium">{dayLabel(msg.createdAt)}</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
              )}

              {isMe ? (
                /* Own messages — right aligned */
                <div className={`flex flex-col items-end gap-0.5 ${isLastInGroup ? "mb-4" : "mb-0.5"}`}>
                  {isFirstInGroup && <span className="text-[11px] text-white/30 mr-1 mb-0.5">{friend.name ? "Du" : "Du"}</span>}
                  <div className="w-fit max-w-[75%] md:max-w-[65%] bg-purple-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
                    <SafeHtml content={msg.content} className="text-[14px] leading-relaxed" />
                  </div>
                  {isLastInGroup && <span className="text-[11px] text-white/20 px-1">{msgTime(msg.createdAt)}</span>}
                </div>
              ) : (
                /* Other's messages — left aligned */
                <div className={`flex gap-2.5 ${isLastInGroup ? "mb-4" : "mb-0.5"}`}>
                  {isFirstInGroup ? (
                    <div className="w-8 h-8 shrink-0 self-end">
                      <Avatar avatarUrl={msg.sender.avatarUrl} name={msg.sender.name} size={8} />
                    </div>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    {isFirstInGroup && <span className="text-xs text-white/40 ml-1">{msg.sender.name ?? "Ukjent"}</span>}
                    <div className="w-fit max-w-[75%] md:max-w-[65%] bg-white/[0.08] text-white rounded-2xl rounded-tl-sm px-4 py-2.5">
                      <SafeHtml content={msg.content} className="text-[14px] leading-relaxed" />
                    </div>
                    {isLastInGroup && <span className="text-[11px] text-white/20 ml-1">{msgTime(msg.createdAt)}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/[0.06] px-4 py-3">
        <div className="flex items-end gap-3">
          <div className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-2.5 focus-within:border-purple-500/30 focus-within:bg-white/[0.08] transition-all">
            <RichTextEditor
              ref={editorRef}
              placeholder="Skriv en melding…"
              onEnter={() => void send()}
              className="min-h-[1.5rem] max-h-32 overflow-y-auto bg-transparent text-sm text-white"
            />
          </div>
          <button
            onClick={() => void send()}
            disabled={sending}
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              !sending
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-white/[0.06] text-white/20"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inbox sidebar item ───────────────────────────────────────────────────────

function InboxItem({
  avatar, title, subtitle, preview, time, unread, isActive, onClick,
}: {
  avatar:   React.ReactNode;
  title:    string;
  subtitle?: string;
  preview?: string;
  time?:    string;
  unread:   number;
  isActive: boolean;
  onClick:  () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={isActive ? { background: "#6c47ff18", borderLeft: "2px solid #6c47ff" } : { borderLeft: "2px solid transparent" }}
      className="relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
    >
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-sm ${unread > 0 ? "font-semibold text-white" : "font-medium text-white/70"}`}>{title}</span>
          {time && <span className="shrink-0 text-[10px] text-white/30">{time}</span>}
        </div>
        {(subtitle || preview) && (
          <p className="truncate text-[11px] text-white/30 mt-0.5">
            {subtitle && <span className="text-white/20">{subtitle}</span>}
            {subtitle && preview && " · "}
            {preview}
          </p>
        )}
      </div>
      {unread > 0 && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 px-1.5 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  label, count, expanded, onToggle, action,
}: {
  label:    string;
  count:    number;
  expanded: boolean;
  onToggle: () => void;
  action?:  React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-1.5">
      <button onClick={onToggle} className="flex flex-1 items-center gap-1.5 text-left group">
        <ChevronDown className={`h-3 w-3 text-white/30 transition-transform ${expanded ? "" : "-rotate-90"}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</span>
        {count > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-600/80 px-1 text-[9px] font-bold text-white">
            {count}
          </span>
        )}
      </button>
      {action}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MeldingerClient({
  currentUserId, currentUserName, communities, conversations, groups: initialGroups,
  invitablePeople, allMembers, initialUserId, initialChannelId, initialGroupId,
}: Props) {
  const [active,       setActive]      = useState<Active>(null);
  const [mobileView,   setMobileView]  = useState<"list" | "chat">(
    initialUserId || initialChannelId || initialGroupId ? "chat" : "list"
  );
  const [groups,       setGroups]      = useState(initialGroups);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [onlineUsers,  setOnlineUsers] = useState<string[]>([]);

  // WebRTC — always called; friendId is empty string when not in a DM
  const activeDMFriendId = active?.type === "dm" ? active.userId : "";
  const webrtc = useWebRTC(currentUserId, activeDMFriendId, currentUserName);

  // Supabase Presence — track who is online
  useEffect(() => {
    const ch = supabase.channel("presence:global")
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        const ids = Object.values(state).flat().map((p) => (p as unknown as { userId: string }).userId);
        setOnlineUsers(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ userId: currentUserId });
        }
      });
    return () => { void supabase.removeChannel(ch); };
  }, [currentUserId]);

  // Section collapse state
  const [showDMs,       setShowDMs]       = useState(true);
  const [showGroups,    setShowGroups]    = useState(true);
  const [showCommunity, setShowCommunity] = useState(true);

  // Search
  const [search,         setSearch]         = useState("");
  const [searchResults,  setSearchResults]  = useState<UserSearchResult[]>([]);
  const [searchLoading,  setSearchLoading]  = useState(false);
  const [friendSending,  setFriendSending]  = useState<string | null>(null);
  const [localStatuses,  setLocalStatuses]  = useState<Record<string, UserSearchResult["friendStatus"]>>({});

  // Local unread overrides
  const [channelUnreads, setChannelUnreads] = useState<Record<string, number>>({});
  const [dmUnreads,      setDmUnreads]      = useState<Record<string, number>>({});
  const [groupUnreads,   setGroupUnreads]   = useState<Record<string, number>>({});
  const [expandedOrgs,   setExpandedOrgs]   = useState<Set<string>>(new Set(communities.map((c) => c.orgId)));

  // Set initial active from URL params
  useEffect(() => {
    if (initialChannelId) {
      for (const c of communities) {
        const ch = c.channels.find((ch) => ch.id === initialChannelId);
        if (ch) { setActive({ type: "channel", channelId: ch.id, channelName: ch.name, orgId: c.orgId, orgName: c.orgName, role: c.role, members: allMembers }); return; }
      }
    }
    if (initialGroupId) {
      const g = initialGroups.find((g) => g.id === initialGroupId);
      if (g) { setActive({ type: "group", groupId: g.id, groupName: g.name, createdBy: g.createdBy, members: g.members }); return; }
    }
    if (initialUserId) {
      const conv = conversations.find((c) => c.friend.id === initialUserId);
      if (conv) setActive({ type: "dm", userId: conv.friend.id });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        if (res.ok) { const data = await res.json() as { users: UserSearchResult[] }; setSearchResults(data.users); setLocalStatuses({}); }
      } catch { /* silent */ } finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function sendFriendRequest(userId: string) {
    setFriendSending(userId);
    const res = await fetch("/api/friends/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receiverId: userId }) });
    if (res.ok) setLocalStatuses((prev) => ({ ...prev, [userId]: "PENDING_SENT" }));
    setFriendSending(null);
  }

  function openChannel(c: Community, ch: OrgChannel) {
    setChannelUnreads((p) => ({ ...p, [ch.id]: 0 }));
    fetch(`/api/channels/${ch.id}/read`, { method: "PATCH" }).catch(() => null);
    setActive({ type: "channel", channelId: ch.id, channelName: ch.name, orgId: c.orgId, orgName: c.orgName, role: c.role, members: allMembers });
    setMobileView("chat");
  }

  function openGroup(g: Group) {
    setGroupUnreads((p) => ({ ...p, [g.id]: 0 }));
    fetch(`/api/groups/${g.id}/read`, { method: "PATCH" }).catch(() => null);
    setActive({ type: "group", groupId: g.id, groupName: g.name, createdBy: g.createdBy, members: g.members });
    setMobileView("chat");
  }

  function openDM(friend: Friend) {
    setDmUnreads((p) => ({ ...p, [friend.id]: 0 }));
    fetch(`/api/dm/${friend.id}/read`, { method: "PATCH" }).catch(() => null);
    setActive({ type: "dm", userId: friend.id });
    setMobileView("chat");
  }

  // Derived
  const activeConvFriend = active?.type === "dm"
    ? conversations.find((c) => c.friend.id === active.userId)?.friend ?? null
    : null;

  const filteredConvs = conversations.filter((c) =>
    !search || (c.friend.name ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredGroups = groups.filter((g) =>
    !search || g.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalDMUnread    = conversations.reduce((s, c) => s + (dmUnreads[c.friend.id] ?? c.unreadCount), 0);
  const totalGroupUnread = groups.reduce((s, g) => s + (groupUnreads[g.id] ?? g.unread), 0);
  const totalChanUnread  = communities.reduce((s, c) => s + c.channels.reduce((ss, ch) => ss + (channelUnreads[ch.id] ?? ch.unread), 0), 0);

  // Active chat header info
  const chatHeader = (() => {
    if (!active) return null;
    if (active.type === "dm") return { avatar: <Avatar avatarUrl={activeConvFriend?.avatarUrl ?? null} name={activeConvFriend?.name ?? null} size={8} />, title: activeConvFriend?.name ?? "DM", subtitle: null };
    if (active.type === "group") return { avatar: <GroupAvatar members={active.members} />, title: active.groupName, subtitle: `${active.members.length} medlemmer` };
    if (active.type === "channel") return { avatar: <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800"><Hash className="h-4 w-4 text-zinc-400" /></div>, title: active.channelName, subtitle: active.orgName };
    return null;
  })();

  return (
    <div className="flex h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] overflow-hidden" style={{ background: "#0d0d14" }}>

      {/* ─── Sidebar ────────────────────────────────────────────────────────── */}
      <div className={`${mobileView === "list" ? "flex" : "hidden"} md:flex w-full md:w-72 shrink-0 flex-col border-r border-white/[0.06]`} style={{ background: "#12121e" }}>

        {/* Search */}
        <div className="shrink-0 p-3 border-b border-white/[0.06]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søk i samtaler..."
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/30 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-white/30 hover:text-white transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* Global search results */}
        {search.trim().length >= 2 && (
          <div className="border-b border-zinc-800/60 overflow-y-auto">
            {searchLoading && <p className="px-4 py-2.5 text-xs text-zinc-500">Søker…</p>}
            {!searchLoading && searchResults.length === 0 && filteredConvs.length === 0 && filteredGroups.length === 0 && (
              <p className="px-4 py-2.5 text-xs text-zinc-500">Ingen resultater</p>
            )}
            {searchResults.map((u) => {
              const status = localStatuses[u.id] ?? u.friendStatus;
              return (
                <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/60 transition-colors">
                  <Avatar avatarUrl={u.avatarUrl} name={u.name} size={8} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-200">{u.name ?? "Ukjent"}</p>
                    {u.username && <p className="truncate text-xs text-zinc-500">@{u.username}</p>}
                  </div>
                  {status === "ACCEPTED" ? (
                    <button onClick={() => openDM({ id: u.id, name: u.name, avatarUrl: u.avatarUrl })}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition-colors">
                      <MessageSquare className="h-3 w-3" /> Skriv
                    </button>
                  ) : status === "PENDING_SENT" ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" /> Sendt
                    </span>
                  ) : status === "PENDING_RECEIVED" ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400">
                      <Check className="h-3 w-3" /> Svar
                    </span>
                  ) : (
                    <button onClick={() => void sendFriendRequest(u.id)} disabled={friendSending === u.id}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:border-violet-500 hover:text-violet-400 disabled:opacity-40 transition-colors">
                      <UserPlus className="h-3 w-3" /> Legg til
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">

          {/* DMs */}
          <SectionHeader label="Direktemeldinger" count={totalDMUnread} expanded={showDMs} onToggle={() => setShowDMs((v) => !v)} />
          {showDMs && (
            filteredConvs.length === 0
              ? <p className="px-4 pb-3 text-xs text-zinc-600">{search ? "Ingen treff" : "Ingen venner ennå."}</p>
              : filteredConvs.map(({ friend, lastMessage, unreadCount }) => {
                  const dmUnread = dmUnreads[friend.id] ?? unreadCount;
                  const isOnline = onlineUsers.includes(friend.id);
                  return (
                    <InboxItem
                      key={friend.id}
                      avatar={<Avatar avatarUrl={friend.avatarUrl} name={friend.name} size={10} isOnline={isOnline} />}
                      title={friend.name ?? "Ukjent"}
                      preview={lastMessage ? strip(lastMessage.content) : undefined}
                      time={lastMessage ? relTime(lastMessage.createdAt) : undefined}
                      unread={dmUnread}
                      isActive={active?.type === "dm" && active.userId === friend.id}
                      onClick={() => openDM(friend)}
                    />
                  );
                })
          )}

          {/* Groups */}
          <SectionHeader
            label="Grupper" count={totalGroupUnread} expanded={showGroups} onToggle={() => setShowGroups((v) => !v)}
            action={
              <button onClick={() => setShowNewGroup(true)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
                <Plus className="h-3 w-3" /> Ny
              </button>
            }
          />
          {showGroups && (
            filteredGroups.length === 0
              ? <p className="px-4 pb-3 text-xs text-zinc-600">{search ? "Ingen treff" : "Ingen grupper ennå."}</p>
              : filteredGroups.map((g) => {
                  const gUnread = groupUnreads[g.id] ?? g.unread;
                  return (
                    <InboxItem
                      key={g.id}
                      avatar={<GroupAvatar members={g.members} />}
                      title={g.name}
                      subtitle={`${g.members.length} medl.`}
                      preview={g.lastMessage ? strip(g.lastMessage.content) : undefined}
                      time={g.lastMessage ? relTime(g.lastMessage.createdAt) : undefined}
                      unread={gUnread}
                      isActive={active?.type === "group" && active.groupId === g.id}
                      onClick={() => openGroup(g)}
                    />
                  );
                })
          )}

          {/* Communities / channels */}
          <SectionHeader label="Communities" count={totalChanUnread} expanded={showCommunity} onToggle={() => setShowCommunity((v) => !v)} />
          {showCommunity && communities.map((c) => {
            const orgExpanded = expandedOrgs.has(c.orgId);
            const orgUnread   = c.channels.reduce((s, ch) => s + (channelUnreads[ch.id] ?? ch.unread), 0);
            const showChannels = !search || c.channels.some((ch) => ch.name.toLowerCase().includes(search.toLowerCase()));
            if (!showChannels) return null;

            return (
              <div key={c.orgId}>
                {/* Org row */}
                <button
                  onClick={() => setExpandedOrgs((prev) => { const n = new Set(prev); if (n.has(c.orgId)) n.delete(c.orgId); else n.add(c.orgId); return n; })}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-800/60 transition-colors"
                >
                  <OrgAvatar logoUrl={c.logoUrl} name={c.orgName} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-300">{c.orgName}</p>
                    <p className="text-[11px] text-zinc-600">{c.channels.length} kanaler</p>
                  </div>
                  {orgUnread > 0 && !orgExpanded && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[10px] font-bold text-white">{orgUnread}</span>
                  )}
                  <ChevronDown className={`h-3.5 w-3.5 text-zinc-600 transition-transform ${orgExpanded ? "" : "-rotate-90"}`} />
                </button>

                {/* Channels */}
                {orgExpanded && c.channels
                  .filter((ch) => !search || ch.name.toLowerCase().includes(search.toLowerCase()))
                  .map((ch) => {
                    const chUnread = channelUnreads[ch.id] ?? ch.unread;
                    const isActive = active?.type === "channel" && active.channelId === ch.id;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => openChannel(c, ch)}
                        className={`relative flex w-full items-center gap-2.5 py-2 pl-[4.5rem] pr-4 text-left transition-colors hover:bg-zinc-800/60 ${
                          isActive ? "bg-zinc-800/80 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-violet-500" : ""
                        }`}
                      >
                        <Hash className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                        <span className={`flex-1 truncate text-sm ${chUnread > 0 ? "font-semibold text-white" : "text-zinc-500"}`}>{ch.name}</span>
                        {chUnread > 0 && (
                          <span className="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[10px] font-bold text-white">{chUnread}</span>
                        )}
                      </button>
                    );
                  })
                }
              </div>
            );
          })}

          <div className="h-4" />
        </div>

        {/* New conversation button */}
        <div className="shrink-0 border-t border-white/[0.06]">
          <button
            onClick={() => { setSearch(""); document.querySelector<HTMLInputElement>('input[placeholder="Søk i samtaler..."]')?.focus(); }}
            className="m-3 flex w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-xl bg-purple-500/10 border border-purple-500/20 py-2.5 text-sm text-purple-300 hover:bg-purple-500/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ny samtale
          </button>
        </div>
      </div>

      {/* ─── Chat area ──────────────────────────────────────────────────────── */}
      <div className={`${mobileView === "chat" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0`} style={{ background: "#0d0d14" }}>

        {/* Header */}
        {chatHeader && (
          <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-5 py-3.5">
            <button
              className="md:hidden shrink-0 rounded-lg p-1 text-white/40 hover:text-white transition-colors"
              onClick={() => setMobileView("list")}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="relative">
              {chatHeader.avatar}
              {active?.type === "dm" && onlineUsers.includes(active.userId) && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-[#12121e]" />
              )}
            </div>
            <div>
              <p className="text-[15px] font-medium text-white">{chatHeader.title}</p>
              {active?.type === "dm" ? (
                onlineUsers.includes(active.userId)
                  ? <p className="text-xs text-green-400">Online nå</p>
                  : chatHeader.subtitle
                    ? <p className="text-xs text-white/30">{chatHeader.subtitle}</p>
                    : null
              ) : chatHeader.subtitle ? (
                <p className="text-xs text-white/30">{chatHeader.subtitle}</p>
              ) : null}
            </div>

            {/* Call buttons — only for DM, not during active call */}
            {active?.type === "dm" && webrtc.callState === "idle" && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => void webrtc.startCall("audio")}
                  title="Lydsamtale"
                  className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.10] transition-all"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => void webrtc.startCall("video")}
                  title="Videosamtale"
                  className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.10] transition-all"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile back (no active) */}
        {!chatHeader && mobileView === "chat" && (
          <button
            className="md:hidden shrink-0 flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setMobileView("list")}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Tilbake</span>
          </button>
        )}

        {active === null ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800">
                <MessageSquare className="h-7 w-7 text-zinc-600" />
              </div>
              <p className="text-sm font-medium text-zinc-400">Velg en samtale</p>
              <p className="mt-1 text-xs text-zinc-600">eller søk etter noen å skrive til</p>
            </div>
          </div>
        ) : active.type === "channel" ? (
          <ChannelView
            key={active.channelId}
            channelId={active.channelId}
            channelName={active.channelName}
            orgId={active.orgId}
            userId={currentUserId}
            userName={currentUserName}
            userRole={active.role}
            members={active.members}
          />
        ) : active.type === "group" ? (
          <GroupView
            key={active.groupId}
            groupId={active.groupId}
            groupName={active.groupName}
            createdBy={active.createdBy}
            currentUserId={currentUserId}
            members={active.members}
            onDeleted={() => { setGroups((prev) => prev.filter((g) => g.id !== active.groupId)); setActive(null); setMobileView("list"); }}
          />
        ) : (
          <div className="relative flex flex-1 flex-col overflow-hidden min-h-0">

            {/* ── Incoming call banner ──────────────────────────────────────── */}
            {webrtc.incomingCall && (
              <div className="mx-4 mt-3 shrink-0 flex items-center gap-4 rounded-2xl border border-purple-500/30 p-4" style={{ background: "#1a1a2e" }}>
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-lg animate-pulse">
                  {webrtc.incomingCall.type === "video" ? "📹" : "📞"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{activeConvFriend?.name ?? "Noen"} ringer...</p>
                  <p className="text-xs text-white/50">{webrtc.incomingCall.type === "video" ? "Videosamtale" : "Lydsamtale"}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={webrtc.rejectCall}
                    className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-all"
                  >
                    <PhoneOff className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => void webrtc.answerCall()}
                    className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500/30 transition-all"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Permission error ──────────────────────────────────────────── */}
            {webrtc.callError && (
              <div className="mx-4 mt-3 shrink-0 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {webrtc.callError}
              </div>
            )}

            <DMView
              key={active.userId}
              friendId={active.userId}
              friend={activeConvFriend ?? { id: active.userId, name: null, avatarUrl: null }}
              currentUserId={currentUserId}
            />

            {/* ── Call overlay ──────────────────────────────────────────────── */}
            {(webrtc.callState === "connected" || webrtc.callState === "calling") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-50 backdrop-blur-sm" style={{ background: "#0a0a1499" }}>

                {webrtc.callType === "video" ? (
                  <div className="relative w-full h-full md:h-auto md:max-w-lg md:mx-4">
                    <video
                      ref={webrtc.remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full md:h-auto md:aspect-video bg-black rounded-none md:rounded-2xl object-cover object-top"
                    />
                    <video
                      ref={webrtc.localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ transform: "scaleX(-1)" }}
                      className="absolute bottom-32 right-4 md:bottom-3 md:right-3 w-24 md:w-28 aspect-[3/4] md:aspect-video bg-black rounded-xl object-cover border-2 border-white/20"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-purple-500/20 border-2 border-purple-500/30 flex items-center justify-center text-4xl font-bold text-white animate-pulse">
                      {(activeConvFriend?.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <p className="text-lg font-medium text-white">{activeConvFriend?.name ?? "Ukjent"}</p>
                    <p className="text-sm text-white/50">
                      {webrtc.callState === "calling" ? "Ringer..." : "Samtale pågår"}
                    </p>
                  </div>
                )}

                {/* Autoplay fallback — Safari blocks unmuted video.play() */}
                {webrtc.needsUserInteraction && (
                  <button
                    onClick={() => {
                      void webrtc.remoteVideoRef.current?.play();
                      webrtc.setNeedsUserInteraction(false);
                    }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    Trykk for å aktivere lyd
                  </button>
                )}

                {/* Controls */}
                <div className="absolute bottom-8 md:bottom-auto md:relative left-1/2 -translate-x-1/2 flex gap-4"
                     style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
                  <button
                    onClick={webrtc.toggleMute}
                    title={webrtc.isMuted ? "Slå på mikrofon" : "Demp mikrofon"}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border ${
                      webrtc.isMuted
                        ? "bg-red-500/30 border-red-500/50 text-red-400"
                        : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                    }`}
                  >
                    <MicOff className="w-5 h-5" />
                  </button>

                  {webrtc.callType === "video" && (
                    <button
                      onClick={webrtc.toggleCamera}
                      title={webrtc.isCameraOff ? "Slå på kamera" : "Slå av kamera"}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border ${
                        webrtc.isCameraOff
                          ? "bg-red-500/30 border-red-500/50 text-red-400"
                          : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                      }`}
                    >
                      <VideoOff className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    onClick={webrtc.endCall}
                    title="Avslutt samtale"
                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-all"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showNewGroup && (
        <NewGroupModal
          people={invitablePeople}
          currentUserId={currentUserId}
          onClose={() => setShowNewGroup(false)}
          onCreated={(g) => { setGroups((prev) => [...prev, g]); openGroup(g); }}
        />
      )}
    </div>
  );
}
