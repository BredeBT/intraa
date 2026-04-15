"use client";
import { useState, useEffect, useRef } from "react";

interface GifResult {
  id:      string;
  title:   string;
  url:     string;
  preview: string;
}

interface Props {
  onSelect: (url: string) => void;
  onClose:  () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGifs(data: any[]): GifResult[] {
  return data.map((g) => ({
    id:      g.id as string,
    title:   g.title as string,
    url:     g.images.original.url as string,
    preview: g.images.fixed_height_small.url as string,
  }));
}

export function GifPicker({ onSelect, onClose }: Props) {
  const [query,   setQuery]   = useState("");
  const [gifs,    setGifs]    = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

  useEffect(() => { void fetchTrending(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function fetchTrending() {
    setLoading(true);
    try {
      const res  = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=24&rating=g`);
      const data = await res.json() as { data: unknown[] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setGifs(mapGifs(data.data as any[]));
    } catch { /* silent */ }
    setLoading(false);
  }

  async function fetchSearch(q: string) {
    if (!q.trim()) { void fetchTrending(); return; }
    setLoading(true);
    try {
      const res  = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=g`);
      const data = await res.json() as { data: unknown[] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setGifs(mapGifs(data.data as any[]));
    } catch { /* silent */ }
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => void fetchSearch(query), 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full mb-2 left-0 z-50 w-80 bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
    >
      <div className="p-3 border-b border-white/10">
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk etter GIFs..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#6c47ff]/50"
        />
      </div>
      <div className="h-64 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-white/20 border-t-[#6c47ff] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => { onSelect(gif.url); onClose(); }}
                className="relative aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity bg-white/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gif.preview} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        {!loading && gifs.length === 0 && (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">Ingen treff</div>
        )}
      </div>
      <div className="px-3 py-2 border-t border-white/10">
        <p className="text-[10px] text-white/20 text-right">Powered by GIPHY</p>
      </div>
    </div>
  );
}
