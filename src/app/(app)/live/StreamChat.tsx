"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

interface ChatMessage {
  id:        string;
  content:   string;
  createdAt: string;
  author:    { id: string; name: string | null; avatarUrl: string | null };
}

interface Props {
  orgId:    string;
  userId:   string;
  disabled?: boolean;
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function StreamChat({ orgId, userId, disabled }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const knownIds  = useRef<Set<string>>(new Set());

  async function fetchMessages() {
    try {
      const res  = await fetch(`/api/stream/chat?orgId=${orgId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { messages: ChatMessage[] };
      const fresh = data.messages.filter((m) => !knownIds.current.has(m.id));
      if (fresh.length > 0) {
        fresh.forEach((m) => knownIds.current.add(m.id));
        setMessages((prev) => [...prev, ...fresh]);
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    // Initial load — get all messages
    fetch(`/api/stream/chat?orgId=${orgId}`)
      .then((r) => r.json())
      .then((data: { messages: ChatMessage[] }) => {
        data.messages.forEach((m) => knownIds.current.add(m.id));
        setMessages(data.messages);
      })
      .catch(() => null);

    const interval = setInterval(fetchMessages, 8_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending || disabled) return;
    setSending(true);

    // Optimistic
    const optimistic: ChatMessage = {
      id:        `opt-${Date.now()}`,
      content:   text,
      createdAt: new Date().toISOString(),
      author:    { id: userId, name: "Deg", avatarUrl: null },
    };
    setMessages((prev) => [...prev, optimistic]);
    knownIds.current.add(optimistic.id);
    setInput("");

    try {
      const res  = await fetch("/api/stream/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, content: text }),
      });
      const data = (await res.json()) as { message: ChatMessage };
      // Replace optimistic with real
      knownIds.current.add(data.message.id);
      setMessages((prev) =>
        prev.map((m) => m.id === optimistic.id ? data.message : m)
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      knownIds.current.delete(optimistic.id);
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-zinc-600">Ingen meldinger ennå – si hei! 👋</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-800/50 text-[9px] font-semibold text-violet-200">
              {initials(msg.author.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-[11px] font-semibold ${msg.author.id === userId ? "text-violet-300" : "text-white"}`}>
                  {msg.author.id === userId ? "Deg" : (msg.author.name ?? "Anonym")}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {new Date(msg.createdAt).toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-zinc-300">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-violet-900/40 px-3 py-2">
        {disabled ? (
          <p className="py-2 text-center text-xs text-zinc-600">Chatten er lukket</p>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-violet-800/60 bg-violet-950/40 px-3 py-2 focus-within:border-violet-500">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Si noe til chatten…"
              className="flex-1 bg-transparent text-xs text-white placeholder-violet-700 outline-none"
            />
            <button onClick={() => void handleSend()} disabled={!input.trim() || sending}
              className="shrink-0 text-violet-500 transition-colors hover:text-violet-300 disabled:opacity-30">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
