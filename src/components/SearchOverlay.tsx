"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X, FileText, MessageSquare, Ticket, Folder, Users } from "lucide-react";
import { searchAll, ALL_RESULTS, type SearchSection } from "@/lib/search";

const SECTION_ICONS: Record<string, React.ElementType> = {
  innlegg:   FileText,
  meldinger: MessageSquare,
  tickets:   Ticket,
  filer:     Folder,
  medlemmer: Users,
};

function ResultGroup({ section, onSelect }: { section: SearchSection; onSelect: () => void }) {
  const Icon = SECTION_ICONS[section.key] ?? FileText;
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 px-4">
        <Icon className="h-3.5 w-3.5 text-zinc-500" />
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{section.label}</p>
      </div>
      {section.results.slice(0, 3).map((r) => (
        <Link
          key={r.id}
          href={r.href}
          onClick={onSelect}
          className="flex flex-col px-4 py-2.5 transition-colors hover:bg-zinc-800"
        >
          <span className="text-sm text-white">{r.title}</span>
          <span className="text-xs text-zinc-500">{r.subtitle}</span>
        </Link>
      ))}
    </div>
  );
}

export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = query.trim() ? searchAll(query) : ALL_RESULTS.slice(0, 3);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Søk…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
          />
          <div className="flex items-center gap-2">
            {query && (
              <button onClick={() => setQuery("")} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 text-xs text-zinc-600">ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {query.trim() && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">Ingen resultater for «{query}».</p>
          )}
          <div className="flex flex-col gap-4 py-2">
            {results.map((section) => (
              <ResultGroup key={section.key} section={section} onSelect={onClose} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2">
          <Link
            href="/soek"
            onClick={onClose}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Åpne avansert søk →
          </Link>
          <span className="text-xs text-zinc-600">
            <kbd className="rounded border border-zinc-700 px-1 py-0.5">↑</kbd>
            <kbd className="ml-1 rounded border border-zinc-700 px-1 py-0.5">↓</kbd>
            {" "}navigere
          </span>
        </div>
      </div>
    </div>
  );
}
