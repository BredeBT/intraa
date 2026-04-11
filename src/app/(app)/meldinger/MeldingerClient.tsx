"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  Search, Send, MessageSquare, ChevronDown, ChevronRight,
  Hash, Plus, X, Users, Check, UserPlus, Clock,
} from "lucide-react";
import type { UserSearchResult } from "@/app/api/users/search/route";
import dynamic from "next/dynamic";

// Lazy-load heavy channel/group views
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
interface ActiveChannel { type: "channel"; channelId: string; channelName: string; orgId: string; role: string; members: { id: string; name: string | null }[] }
interface ActiveGroup   { type: "group";   groupId: string; groupName: string; createdBy: string; members: { id: string; name: string | null; avatarUrl: string | null }[] }
type Active = ActiveDM | ActiveChannel | ActiveGroup | null;

interface Props {
  currentUserId:   string;
  currentUserName: string;
  communities:     Community[];
  conversations:   Conversation[];
  groups:          Group[];
  invitablePeople: { id: string; name: string | null; avatarUrl: string | null }[];
  allMembers:      { id: string; name: string | null }[];
  initialUserId:   string | null;
  initialChannelId: string | null;
  initialGroupId:  string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Avatar({ avatarUrl, name, size = 8 }: { avatarUrl: string | null; name: string | null; size?: number }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt="" className={`h-${size} w-${size} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`h-${size} w-${size} flex shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-white`}>
      {initials(name)}
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

function OrgIcon({ logoUrl, name, size = 5 }: { logoUrl: string | null; name: string; size?: number }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" className={`h-${size} w-${size} shrink-0 rounded object-cover`} />;
  }
  return (
    <div className={`h-${size} w-${size} flex shrink-0 items-center justify-center rounded bg-indigo-600 text-[9px] font-bold text-white`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

// ─── New Group Modal ──────────────────────────────────────────────────────────

function NewGroupModal({
  people,
  currentUserId,
  onClose,
  onCreated,
}: {
  people:        { id: string; name: string | null; avatarUrl: string | null }[];
  currentUserId: string;
  onClose:       () => void;
  onCreated:     (group: Group) => void;
}) {
  const [name,     setName]    = useState("");
  const [search,   setSearch]  = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState("");

  const filtered = people.filter((p) =>
    p.id !== currentUserId && (!search || (p.name ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function create() {
    if (!name.trim()) { setError("Gruppenavn er påkrevd"); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/groups", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: name.trim(), memberIds: selected }),
    });
    const data = await res.json() as { group?: { id: string; name: string; members: { id: string; name: string | null; avatarUrl: string | null }[] }; error?: string };
    if (!res.ok || !data.group) { setError(data.error ?? "Noe gikk galt"); setLoading(false); return; }
    onCreated({ id: data.group.id, name: data.group.name, createdBy: currentUserId, lastMessage: null, unread: 0, members: data.group.members });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Ny gruppe</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-5">
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Gruppenavn</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="f.eks. Prosjektteamet"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Legg til medlemmer</label>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 mb-2">
              <Search className="h-3.5 w-3.5 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Søk…"
                className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-500 outline-none"
              />
            </div>
            {selected.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {selected.map((id) => {
                  const p = people.find((x) => x.id === id);
                  return (
                    <span key={id} className="flex items-center gap-1 rounded-full bg-indigo-600/20 px-2 py-0.5 text-xs text-indigo-300">
                      {p?.name?.split(" ")[0]}
                      <button onClick={() => toggle(id)}><X className="h-2.5 w-2.5" /></button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-800">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-xs text-zinc-500">Ingen resultater</p>
              ) : filtered.map((p) => (
                <button key={p.id} onClick={() => toggle(p.id)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-zinc-800 transition-colors">
                  <Avatar avatarUrl={p.avatarUrl} name={p.name} size={6} />
                  <span className="flex-1 text-sm text-white">{p.name ?? "Ukjent"}</span>
                  {selected.includes(p.id) && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <button onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Avbryt</button>
          <button onClick={create} disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40">
            {loading ? "Oppretter…" : "Opprett gruppe"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DM View ──────────────────────────────────────────────────────────────────

interface DMMessage {
  id:        string;
  content:   string;
  createdAt: string;
  senderId:  string;
  sender:    { id: string; name: string | null; avatarUrl: string | null };
}

function DMView({
  friendId, friend, currentUserId,
}: {
  friendId:      string;
  friend:        Friend;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [text,     setText]     = useState("");
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [, start] = useTransition();

  useEffect(() => {
    fetch(`/api/dm/${friendId}`)
      .then((r) => r.json() as Promise<{ messages: DMMessage[] }>)
      .then(({ messages: msgs }) => setMessages(msgs));
    fetch(`/api/dm/${friendId}/read`, { method: "PATCH" }).catch(() => null);
  }, [friendId]);

  useEffect(() => {
    const INTERVAL = 8000;
    let id: ReturnType<typeof setInterval>;
    const run = async () => {
      const res = await fetch(`/api/dm/${friendId}`);
      if (res.ok) setMessages((await res.json() as { messages: DMMessage[] }).messages);
    };
    id = setInterval(run, INTERVAL);
    const onVisibility = () => {
      if (document.hidden) clearInterval(id);
      else id = setInterval(run, INTERVAL);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisibility); };
  }, [friendId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/dm/${friendId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ content: text }),
    });
    if (res.ok) {
      const data = await res.json() as { message: DMMessage };
      setMessages((prev) => [...prev, data.message]);
      setText("");
    }
    setSending(false);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-5 py-3">
        <Avatar avatarUrl={friend.avatarUrl} name={friend.name} />
        <span className="text-sm font-semibold text-white">{friend.name ?? "Ukjent"}</span>
      </div>
      <div className="flex-1 overflow-y-auto bg-zinc-950 px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-600">Ingen meldinger ennå. Si hei!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : ""}`}>
              {!isMe && <Avatar avatarUrl={msg.sender.avatarUrl} name={msg.sender.name} size={6} />}
              <div>
                <div className={`max-w-xs whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${isMe ? "rounded-br-sm bg-indigo-600 text-white" : "rounded-bl-sm bg-zinc-800 text-zinc-200"}`}>
                  {msg.content}
                </div>
                <p className={`mt-0.5 text-[10px] text-zinc-600 ${isMe ? "text-right" : ""}`}>{formatTime(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-5 py-3">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="Skriv en melding…"
            className="flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={() => void send()}
            disabled={!text.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:opacity-80 disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MeldingerClient({
  currentUserId, currentUserName, communities, conversations, groups: initialGroups,
  invitablePeople, allMembers, initialUserId, initialChannelId, initialGroupId,
}: Props) {
  const [active,         setActive]        = useState<Active>(null);
  const [groups,         setGroups]        = useState(initialGroups);
  const [showNewGroup,   setShowNewGroup]  = useState(false);
  const [expandedOrgs,   setExpandedOrgs] = useState<Set<string>>(new Set(communities.map((c) => c.orgId)));
  const [dmSearch,       setDmSearch]     = useState("");
  const [searchResults,  setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchLoading,  setSearchLoading] = useState(false);
  const [friendSending,  setFriendSending] = useState<string | null>(null);
  const [localStatuses,  setLocalStatuses] = useState<Record<string, UserSearchResult["friendStatus"]>>({});
  // Local unread overrides — zeroed immediately when user opens a conversation
  const [channelUnreads, setChannelUnreads] = useState<Record<string, number>>({});
  const [dmUnreads,      setDmUnreads]      = useState<Record<string, number>>({});
  const [groupUnreads,   setGroupUnreads]   = useState<Record<string, number>>({});

  // Set initial active from URL params
  useEffect(() => {
    if (initialChannelId) {
      for (const c of communities) {
        const ch = c.channels.find((ch) => ch.id === initialChannelId);
        if (ch) {
          setActive({
            type: "channel", channelId: ch.id, channelName: ch.name, orgId: c.orgId, role: c.role,
            members: allMembers,
          });
          return;
        }
      }
    }
    if (initialGroupId) {
      const g = initialGroups.find((g) => g.id === initialGroupId);
      if (g) {
        setActive({ type: "group", groupId: g.id, groupName: g.name, createdBy: g.createdBy, members: g.members });
        return;
      }
    }
    if (initialUserId) {
      const conv = conversations.find((c) => c.friend.id === initialUserId);
      if (conv) setActive({ type: "dm", userId: conv.friend.id });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleOrg(orgId: string) {
    setExpandedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId);
      else next.add(orgId);
      return next;
    });
  }

  function openChannel(c: Community, ch: OrgChannel) {
    setChannelUnreads((p) => ({ ...p, [ch.id]: 0 }));
    fetch(`/api/channels/${ch.id}/read`, { method: "PATCH" }).catch(() => null);
    setActive({
      type: "channel",
      channelId:   ch.id,
      channelName: ch.name,
      orgId:       c.orgId,
      role:        c.role,
      members:     allMembers,
    });
  }

  function openGroup(g: Group) {
    setGroupUnreads((p) => ({ ...p, [g.id]: 0 }));
    fetch(`/api/groups/${g.id}/read`, { method: "PATCH" }).catch(() => null);
    setActive({ type: "group", groupId: g.id, groupName: g.name, createdBy: g.createdBy, members: g.members });
  }

  function openDM(friend: Friend) {
    setDmUnreads((p) => ({ ...p, [friend.id]: 0 }));
    fetch(`/api/dm/${friend.id}/read`, { method: "PATCH" }).catch(() => null);
    setActive({ type: "dm", userId: friend.id });
  }

  // Debounced global user search
  useEffect(() => {
    const q = dmSearch.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json() as { users: UserSearchResult[] };
          setSearchResults(data.users);
          setLocalStatuses({});
        }
      } catch { /* silent */ } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [dmSearch]);

  async function sendFriendRequest(userId: string) {
    setFriendSending(userId);
    const res = await fetch("/api/friends/request", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ receiverId: userId }),
    });
    if (res.ok) {
      setLocalStatuses((prev) => ({ ...prev, [userId]: "PENDING_SENT" }));
    }
    setFriendSending(null);
  }

  const filteredConvs = conversations.filter((c) =>
    !dmSearch || (c.friend.name ?? "").toLowerCase().includes(dmSearch.toLowerCase())
  );

  const activeConvFriend = active?.type === "dm"
    ? conversations.find((c) => c.friend.id === active.userId)?.friend ?? null
    : null;

  const totalDMUnread = conversations.reduce((s, c) => s + (dmUnreads[c.friend.id] ?? c.unreadCount), 0);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ─── Left: sidebar ─────────────────────────────────────────────────── */}
      <div className="flex w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 overflow-y-auto">

        {/* MINE COMMUNITIES */}
        <div className="border-b border-zinc-800">
          <div className="px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Mine Communities</span>
          </div>
          {communities.length === 0 && (
            <p className="px-4 pb-3 text-xs text-zinc-600">Du er ikke med i noen communities ennå.</p>
          )}
          {communities.map((c) => {
            const expanded = expandedOrgs.has(c.orgId);
            const orgUnread = c.channels.reduce((s, ch) => s + (channelUnreads[ch.id] ?? ch.unread), 0);
            return (
              <div key={c.orgId}>
                {/* Org header */}
                <button
                  onClick={() => toggleOrg(c.orgId)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors group"
                >
                  <ChevronRight className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform ${expanded ? "rotate-90" : ""}`} />
                  <OrgIcon logoUrl={c.logoUrl} name={c.orgName} />
                  <span className="flex-1 truncate text-xs font-semibold text-zinc-300">{c.orgName}</span>
                  {orgUnread > 0 && !expanded && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white">
                      {orgUnread}
                    </span>
                  )}
                </button>
                {/* Channels */}
                {expanded && c.channels.map((ch) => {
                  const isActive = active?.type === "channel" && active.channelId === ch.id;
                  const chUnread = channelUnreads[ch.id] ?? ch.unread;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => openChannel(c, ch)}
                      className={`flex w-full items-center gap-2 py-1.5 pl-9 pr-4 text-left transition-colors ${isActive ? "bg-zinc-800 text-white" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"}`}
                    >
                      <Hash className="h-3 w-3 shrink-0" />
                      <span className={`flex-1 truncate text-xs ${chUnread > 0 ? "font-semibold text-white" : ""}`}>{ch.name}</span>
                      {chUnread > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white">
                          {chUnread}
                        </span>
                      )}
                    </button>
                  );
                })}
                {expanded && c.channels.length === 0 && (
                  <p className="pl-9 pr-4 pb-2 text-[10px] text-zinc-600">Ingen kanaler</p>
                )}
              </div>
            );
          })}
        </div>

        {/* DIREKTEMELDINGER */}
        <div className="border-b border-zinc-800">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Direktemeldinger
              {totalDMUnread > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {totalDMUnread}
                </span>
              )}
            </span>
          </div>
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-1.5">
              <Search className="h-3 w-3 text-zinc-500" />
              <input
                value={dmSearch}
                onChange={(e) => setDmSearch(e.target.value)}
                placeholder="Finn venn…"
                className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-500 outline-none"
              />
            </div>
          </div>
          {/* Global search results */}
          {dmSearch.trim().length >= 2 && (
            <div className="pb-1">
              {searchLoading && (
                <p className="px-4 py-2 text-[10px] text-zinc-500">Søker…</p>
              )}
              {!searchLoading && searchResults.length === 0 && (
                <p className="px-4 py-2 text-[10px] text-zinc-500">Ingen brukere funnet.</p>
              )}
              {searchResults.map((u) => {
                const status = localStatuses[u.id] ?? u.friendStatus;
                return (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 transition-colors">
                    <Avatar avatarUrl={u.avatarUrl} name={u.name} size={6} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-200">{u.name ?? "Ukjent"}</p>
                      {u.username && <p className="truncate text-[10px] text-zinc-500">@{u.username}</p>}
                    </div>
                    {status === "ACCEPTED" ? (
                      <button
                        onClick={() => openDM({ id: u.id, name: u.name, avatarUrl: u.avatarUrl })}
                        className="flex shrink-0 items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white hover:opacity-80 transition-opacity"
                      >
                        <MessageSquare className="h-3 w-3" /> DM
                      </button>
                    ) : status === "PENDING_SENT" ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-500">
                        <Clock className="h-3 w-3" /> Sendt
                      </span>
                    ) : status === "PENDING_RECEIVED" ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400">
                        <Check className="h-3 w-3" /> Svar
                      </span>
                    ) : (
                      <button
                        onClick={() => void sendFriendRequest(u.id)}
                        disabled={friendSending === u.id}
                        className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:border-indigo-500 hover:text-indigo-400 disabled:opacity-40 transition-colors"
                      >
                        <UserPlus className="h-3 w-3" /> Legg til
                      </button>
                    )}
                  </div>
                );
              })}
              <div className="mx-4 my-1 h-px bg-zinc-800" />
            </div>
          )}
          {filteredConvs.length === 0 && !dmSearch && (
            <p className="px-4 pb-3 text-xs text-zinc-600">Ingen venner ennå.</p>
          )}
          {filteredConvs.map(({ friend, lastMessage, unreadCount }) => {
            const isActive = active?.type === "dm" && active.userId === friend.id;
            const dmUnread = dmUnreads[friend.id] ?? unreadCount;
            return (
              <button
                key={friend.id}
                onClick={() => openDM(friend)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-zinc-800 ${isActive ? "bg-zinc-800" : ""}`}
              >
                <Avatar avatarUrl={friend.avatarUrl} name={friend.name} size={6} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`truncate text-xs ${dmUnread > 0 ? "font-semibold text-white" : "text-zinc-300"}`}>
                      {friend.name ?? "Ukjent"}
                    </span>
                    {lastMessage && (
                      <span className="ml-1 shrink-0 text-[9px] text-zinc-600">{formatTime(lastMessage.createdAt)}</span>
                    )}
                  </div>
                  {lastMessage && (
                    <p className="truncate text-[10px] text-zinc-500">{lastMessage.content}</p>
                  )}
                </div>
                {dmUnread > 0 && (
                  <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white">
                    {dmUnread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* GRUPPER */}
        <div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Grupper</span>
            <button
              onClick={() => setShowNewGroup(true)}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
              title="Ny gruppe"
            >
              <Plus className="h-3 w-3" />
              <span>Ny</span>
            </button>
          </div>
          {groups.length === 0 && (
            <p className="px-4 pb-3 text-xs text-zinc-600">Ingen grupper ennå.</p>
          )}
          {groups.map((g) => {
            const isActive  = active?.type === "group" && active.groupId === g.id;
            const gUnread   = groupUnreads[g.id] ?? g.unread;
            return (
              <button
                key={g.id}
                onClick={() => openGroup(g)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-zinc-800 ${isActive ? "bg-zinc-800" : ""}`}
              >
                <div className="relative flex h-6 w-6 shrink-0">
                  {g.members.slice(0, 2).map((m, i) => (
                    <div key={m.id} className={`absolute flex h-4 w-4 items-center justify-center rounded-full bg-zinc-600 text-[8px] font-bold text-white ${i === 0 ? "top-0 left-0" : "bottom-0 right-0"}`}>
                      {(m.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`truncate text-xs ${gUnread > 0 ? "font-semibold text-white" : "text-zinc-300"}`}>{g.name}</span>
                    <span className="ml-1 shrink-0 text-[9px] text-zinc-500">
                      <Users className="h-2.5 w-2.5" />
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500">{g.members.length} medlemmer</p>
                </div>
                {gUnread > 0 && (
                  <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white">
                    {gUnread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Right: message view ────────────────────────────────────────────── */}
      {active === null ? (
        <div className="flex flex-1 items-center justify-center bg-zinc-950">
          <div className="text-center">
            <MessageSquare className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
            <p className="text-sm font-medium text-zinc-400">Velg en kanal, samtale eller gruppe</p>
            <p className="mt-1 text-xs text-zinc-600">Kommuniser med teamet ditt</p>
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
          onDeleted={() => {
            setGroups((prev) => prev.filter((g) => g.id !== active.groupId));
            setActive(null);
          }}
        />
      ) : (
        <DMView
          key={active.userId}
          friendId={active.userId}
          friend={activeConvFriend ?? { id: active.userId, name: null, avatarUrl: null }}
          currentUserId={currentUserId}
        />
      )}

      {/* New group modal */}
      {showNewGroup && (
        <NewGroupModal
          people={invitablePeople}
          currentUserId={currentUserId}
          onClose={() => setShowNewGroup(false)}
          onCreated={(g) => {
            setGroups((prev) => [...prev, g]);
            openGroup(g);
          }}
        />
      )}
    </div>
  );
}
