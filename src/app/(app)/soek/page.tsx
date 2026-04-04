"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, FileText, MessageSquare, Ticket, Folder, Users } from "lucide-react";
import { searchAll, ALL_RESULTS, type SearchSection } from "@/lib/search";

const SECTION_ICONS: Record<string, React.ElementType> = {
  innlegg:   FileText,
  meldinger: MessageSquare,
  tickets:   Ticket,
  filer:     Folder,
  medlemmer: Users,
};

function ResultSection({ section }: { section: SearchSection }) {
  const Icon = SECTION_ICONS[section.key] ?? FileText;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-zinc-500" />
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{section.label}</p>
      </div>
      <div className="flex flex-col gap-1">
        {section.results.map((r) => (
          <Link
            key={r.id}
            href={r.href}
            className="rounded-lg px-4 py-3 transition-colors hover:bg-zinc-900"
          >
            <p className="text-sm font-medium text-white">{r.title}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{r.subtitle}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SoekPage() {
  const [query, setQuery] = useState("");
  const results = searchAll(query);
  const showEmpty = query.trim().length > 0 && results.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Søk</h1>

      {/* Search field */}
      <div className="mb-8 flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 focus-within:border-indigo-500 transition-colors">
        <Search className="h-5 w-5 shrink-0 text-zinc-400" />
        <input
          autoFocus
          type="text"
          placeholder="Søk etter innlegg, meldinger, tickets, filer, medlemmer…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-xs text-zinc-500 hover:text-zinc-300">
            Tøm
          </button>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="flex flex-col gap-6">
          {results.map((section) => (
            <ResultSection key={section.key} section={section} />
          ))}
        </div>
      )}

      {showEmpty && (
        <p className="text-center text-sm text-zinc-500">Ingen resultater for «{query}».</p>
      )}

      {/* Default: show all sections */}
      {!query.trim() && (
        <div className="flex flex-col gap-6">
          {ALL_RESULTS.map((section) => (
            <ResultSection key={section.key} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}
