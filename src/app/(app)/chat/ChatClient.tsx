"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Send } from "lucide-react";
import { sendMessage } from "@/server/actions/messages";
import type { MessageWithAuthor } from "@/lib/types";
import { getMockUser } from "@/lib/mock-auth";

type Channel = { id: string; name: string; type: "channel" | "dm"; initials?: string };

const CHANNELS: Channel[] = [
  { id: "mock-channel-general", name: "general", type: "channel" },
  { id: "mock-channel-random", name: "random", type: "channel" },
  { id: "mock-channel-it", name: "it", type: "channel" },
];

const DMS: Channel[] = [
  { id: "mock-dm-mh", name: "Maria Haugen", type: "dm", initials: "MH" },
  { id: "mock-dm-tk", name: "Thomas Kvam", type: "dm", initials: "TK" },
];

const _mockUser = getMockUser();
const MOCK_AUTHOR_ID = _mockUser.id;
const MOCK_AUTHOR_NAME = _mockUser.name;

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function ChatClient({ initialMessages }: { initialMessages: MessageWithAuthor[] }) {
  const [activeId, setActiveId] = useState(CHANNELS[0].id);
  const [messages, setMessages] = useState<MessageWithAuthor[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = [...CHANNELS, ...DMS].find((c) => c.id === activeId)!;
  const channelLabel = active.type === "channel" ? `#${active.name}` : active.name;

  function handleSend() {
    const text = input.trim();
    if (!text) return;

    const optimistic: MessageWithAuthor = {
      id: `optimistic-${Date.now()}`,
      content: text,
      createdAt: new Date(),
      channelId: activeId,
      authorId: MOCK_AUTHOR_ID,
      author: { id: MOCK_AUTHOR_ID, name: MOCK_AUTHOR_NAME, email: "anders@intraa.no", avatarUrl: null, createdAt: new Date() },
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    startTransition(async () => {
      try {
        const saved = await sendMessage(activeId, MOCK_AUTHOR_ID, text);
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? saved : m))
        );
      } catch {
        // db ikke tilgjengelig — optimistisk melding beholdes
      }
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Channel / DM list */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 py-4">
        <p className="mb-1 px-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Kanaler
        </p>
        <nav className="flex flex-col gap-0.5 px-2">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveId(ch.id)}
              className={`rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors ${
                activeId === ch.id
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              # {ch.name}
            </button>
          ))}
        </nav>

        <p className="mb-1 mt-5 px-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Direktemeldinger
        </p>
        <nav className="flex flex-col gap-0.5 px-2">
          {DMS.map((dm) => (
            <button
              key={dm.id}
              onClick={() => setActiveId(dm.id)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors ${
                activeId === dm.id
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-white">
                {dm.initials}
              </div>
              {dm.name}
            </button>
          ))}
        </nav>
      </aside>

      {/* Message area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-zinc-800 px-6 py-3">
          <p className="text-sm font-semibold text-white">{channelLabel}</p>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
                {initials(msg.author.name ?? "")}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-white">{msg.author.name ?? ""}</span>
                  <span className="text-xs text-zinc-500">{formatTime(msg.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-sm text-zinc-300">{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3 rounded-lg bg-zinc-800 px-4 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Skriv en melding til ${channelLabel}…`}
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isPending}
              className="text-zinc-500 transition-colors hover:text-indigo-400 disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
