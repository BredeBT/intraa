"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

type Channel = { id: number; name: string; type: "channel" | "dm"; initials?: string };

const channels: Channel[] = [
  { id: 1, name: "general", type: "channel" },
  { id: 2, name: "random", type: "channel" },
  { id: 3, name: "it", type: "channel" },
];

const dms: Channel[] = [
  { id: 4, name: "Maria Haugen", type: "dm", initials: "MH" },
  { id: 5, name: "Thomas Kvam", type: "dm", initials: "TK" },
];

type Message = { id: number; name: string; initials: string; text: string; time: string };

const initialMessages: Message[] = [
  { id: 1, name: "Anders Sørensen", initials: "AS", text: "God morgen alle! Noen som vet om standup er flyttet i dag?", time: "08:12" },
  { id: 2, name: "Maria Haugen", initials: "MH", text: "Nei, den er som vanlig kl. 09:00 så vidt jeg vet.", time: "08:15" },
  { id: 3, name: "Thomas Kvam", initials: "TK", text: "Bekrefter — ingen endringer. Vi sees!", time: "08:17" },
  { id: 4, name: "Anders Sørensen", initials: "AS", text: "Perfekt, takk! 👍", time: "08:18" },
  { id: 5, name: "Maria Haugen", initials: "MH", text: "Husk at det er kodefrys fra torsdag denne uken.", time: "08:45" },
];

function now() {
  return new Date().toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const [activeId, setActiveId] = useState(1);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = [...channels, ...dms].find((c) => c.id === activeId)!;
  const channelLabel = active.type === "channel" ? `#${active.name}` : active.name;

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), name: "Anders Sørensen", initials: "AS", text, time: now() },
    ]);
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
          {channels.map((ch) => (
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
          {dms.map((dm) => (
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
                {msg.initials}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-white">{msg.name}</span>
                  <span className="text-xs text-zinc-500">{msg.time}</span>
                </div>
                <p className="mt-0.5 text-sm text-zinc-300">{msg.text}</p>
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
              onClick={sendMessage}
              disabled={!input.trim()}
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
