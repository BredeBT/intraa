"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Send, Lock } from "lucide-react";
import { getMockUser } from "@/lib/mock-auth";

const _user = getMockUser();
const MY_ROLE = "VIP"; // Phase 4: replace with user's actual role

interface Channel {
  id: string;
  name: string;
  requiresVip: boolean;
}

const CHANNELS: Channel[] = [
  { id: "ch-velkommen", name: "velkommen",  requiresVip: false },
  { id: "ch-generelt",  name: "generelt",   requiresVip: false },
  { id: "ch-vip",       name: "vip-lounge", requiresVip: true },
];

const REACTIONS = ["👍", "❤️", "😂", "🔥", "🚀", "👀"];

interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface Message {
  id: string;
  author: string;
  initials: string;
  text: string;
  time: string;
  channelId: string;
  reactions: Reaction[];
}

function now() {
  return new Date().toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
}

const INITIAL_MESSAGES: Message[] = [
  { id: "msg1", author: "Ole Rønning", initials: "OR", text: "Velkommen til communityet! 🎉 Glad for å ha deg her.", time: "10:00", channelId: "ch-velkommen", reactions: [{ emoji: "❤️", count: 5, reacted: false }, { emoji: "👍", count: 3, reacted: false }] },
  { id: "msg2", author: "Kari Moe", initials: "KM", text: "Hei alle! Gleder meg til å dele prosjekter her.", time: "10:05", channelId: "ch-velkommen", reactions: [{ emoji: "🔥", count: 2, reacted: false }] },
  { id: "msg3", author: "Thomas Kvam", initials: "TK", text: "God morgen! Noen som har testet den nye Tailwind v4 beta?", time: "08:45", channelId: "ch-generelt", reactions: [{ emoji: "👀", count: 4, reacted: false }] },
  { id: "msg4", author: "Maria Haugen", initials: "MH", text: "Ja! Mye ryddigere syntaks. Likte spesielt at man slipper config-filen.", time: "08:52", channelId: "ch-generelt", reactions: [{ emoji: "👍", count: 6, reacted: true }, { emoji: "🚀", count: 2, reacted: false }] },
  { id: "msg5", author: "Anders Sørensen", initials: "AS", text: "Enig! Har migrert et par prosjekter allerede.", time: "08:59", channelId: "ch-generelt", reactions: [] },
  { id: "msg6", author: "Kari Moe", initials: "KM", text: "VIP-ekslusivt tips: bruk `group-hover` med animasjoner for å lage smooth micro-interactions 🔥", time: "11:00", channelId: "ch-vip", reactions: [{ emoji: "🔥", count: 3, reacted: false }, { emoji: "🚀", count: 2, reacted: false }] },
  { id: "msg7", author: "Anders Sørensen", initials: "AS", text: "Gold! Og husk at du kan kombinere det med `has()` selector nå.", time: "11:12", channelId: "ch-vip", reactions: [{ emoji: "👍", count: 4, reacted: false }] },
];

export default function CommunityChatPage() {
  const [activeId, setActiveId]   = useState("ch-generelt");
  const [messages, setMessages]   = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput]         = useState("");
  const [showPicker, setShowPicker] = useState<string | null>(null);
  const [, startTransition]       = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = CHANNELS.find(c => c.id === activeId)!;
  const isLocked = active.requiresVip && MY_ROLE !== "VIP" && MY_ROLE !== "Moderator" && MY_ROLE !== "Eier";
  const visible = messages.filter(m => m.channelId === activeId);

  function handleSend() {
    const text = input.trim();
    if (!text || isLocked) return;
    const msg: Message = {
      id: `msg-${Date.now()}`,
      author: _user.name,
      initials: _user.initials,
      text,
      time: now(),
      channelId: activeId,
      reactions: [],
    };
    startTransition(() => setMessages(prev => [...prev, msg]));
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function toggleReaction(msgId: string, emoji: string) {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const existing = m.reactions.find(r => r.emoji === emoji);
      if (existing) {
        return {
          ...m,
          reactions: m.reactions.map(r =>
            r.emoji === emoji
              ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }
              : r
          ).filter(r => r.count > 0),
        };
      }
      return { ...m, reactions: [...m.reactions, { emoji, count: 1, reacted: true }] };
    }));
    setShowPicker(null);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeId]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Channel list */}
      <aside className="flex w-48 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 py-4">
        <p className="mb-1 px-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Kanaler</p>
        <nav className="flex flex-col gap-0.5 px-2">
          {CHANNELS.map(ch => {
            const locked = ch.requiresVip && MY_ROLE !== "VIP" && MY_ROLE !== "Moderator" && MY_ROLE !== "Eier";
            return (
              <button
                key={ch.id}
                onClick={() => setActiveId(ch.id)}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors ${
                  activeId === ch.id
                    ? "bg-violet-600 text-white"
                    : locked
                    ? "cursor-not-allowed text-zinc-600"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {locked
                  ? <Lock className="h-3.5 w-3.5 shrink-0" />
                  : <span className="text-zinc-500 text-xs">#</span>}
                <span className="truncate">{ch.name}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Message area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 border-b border-zinc-800 px-6 py-3">
          {active.requiresVip && <Lock className="h-3.5 w-3.5 text-amber-400" />}
          <p className="text-sm font-semibold text-white">#{active.name}</p>
          {active.requiresVip && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">VIP</span>
          )}
        </header>

        {isLocked ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-8">
            <Lock className="h-10 w-10 text-zinc-700" />
            <p className="font-semibold text-zinc-400">Kun for VIP-medlemmer</p>
            <p className="text-sm text-zinc-600">Oppgrader abonnementet ditt for å få tilgang til VIP-lounge.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
              {visible.map(msg => (
                <div
                  key={msg.id}
                  className="group flex items-start gap-3"
                  onMouseLeave={() => setShowPicker(null)}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
                    {msg.initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-white">{msg.author}</span>
                      <span className="text-xs text-zinc-600">{msg.time}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-300">{msg.text}</p>

                    {/* Reactions */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {msg.reactions.map(r => (
                        <button
                          key={r.emoji}
                          onClick={() => toggleReaction(msg.id, r.emoji)}
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                            r.reacted
                              ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                              : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                          }`}
                        >
                          {r.emoji} <span>{r.count}</span>
                        </button>
                      ))}

                      {/* Add reaction button */}
                      <div className="relative">
                        <button
                          onClick={() => setShowPicker(showPicker === msg.id ? null : msg.id)}
                          className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 hover:border-zinc-600 hover:text-zinc-300"
                        >
                          + 😊
                        </button>
                        {showPicker === msg.id && (
                          <div className="absolute bottom-full left-0 mb-1 flex gap-1 rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-xl z-10">
                            {REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(msg.id, emoji)}
                                className="rounded-lg p-1.5 text-base transition-colors hover:bg-zinc-800"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-zinc-800 px-6 py-4">
              <div className="flex items-center gap-3 rounded-xl bg-zinc-800 px-4 py-2.5">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={`Skriv i #${active.name}…`}
                  className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="text-zinc-500 transition-colors hover:text-violet-400 disabled:opacity-30"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
