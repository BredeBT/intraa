"use client";

import { Plus } from "lucide-react";

interface StoryItem {
  id:         string;
  imageUrl:   string;
  caption:    string | null;
  width:      number | null;
  height:     number | null;
  createdAt:  string;
  expiresAt:  string;
  viewedByMe: boolean;
  sponsor:    { slug: string; brandName: string; logoUrl: string | null } | null;
}

interface StoryGroup {
  author:  { id: string; name: string | null; avatarUrl: string | null };
  stories: StoryItem[];
}

interface Props {
  groups:    StoryGroup[];
  canPost:   boolean;
  onAdd:     () => void;
  onOpen:    (groupIdx: number) => void;
}

function initials(name: string | null | undefined) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function StoryStrip({ groups, canPost, onAdd, onOpen }: Props) {
  if (!canPost && groups.length === 0) return null;

  return (
    <div className="shrink-0 px-6 pb-4 pt-1 overflow-x-auto scrollbar-hide">
      <div className="flex gap-4 min-w-min">
        {canPost && (
          <button
            onClick={onAdd}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="relative">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-105"
                style={{
                  background: "var(--border-subtle)",
                  border:     "2px dashed var(--border-strong)",
                }}
              >
                <Plus className="h-5 w-5" style={{ color: "#A855F7" }} />
              </div>
            </div>
            <span className="text-[10px] font-medium text-white/70 max-w-[64px] truncate">Ny story</span>
          </button>
        )}

        {groups.map((g, idx) => {
          const previewUrl = g.stories[g.stories.length - 1]?.imageUrl;
          const unseen = g.stories.filter((s) => !s.viewedByMe).length;
          const allSeen = unseen === 0;
          return (
            <button
              key={g.author.id}
              onClick={() => onOpen(idx)}
              className="flex flex-col items-center gap-1.5 group"
              title={
                allSeen
                  ? `${g.stories.length} ${g.stories.length === 1 ? "story" : "stories"} (alle sett)`
                  : `${unseen} ny${unseen === 1 ? "" : "e"} story${unseen === 1 ? "" : "s"}`
              }
            >
              {/* Ring → aurora-gradient hvis usett, dempet grå hvis alle sett */}
              <div
                className="rounded-full transition-transform group-hover:scale-105"
                style={{
                  background: allSeen
                    ? "var(--border-default)"
                    : "linear-gradient(135deg, #5EEAD4 0%, #A855F7 50%, #60A5FA 100%)",
                  padding:    2,
                }}
              >
                <div
                  className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white"
                  style={{
                    background:  previewUrl ? `url(${previewUrl}) center/cover` : "linear-gradient(135deg, #5EEAD4, #A855F7)",
                    border:      "2px solid var(--bg-primary)",
                    opacity:     allSeen ? 0.7 : 1,
                  }}
                >
                  {!previewUrl && initials(g.author.name)}
                </div>
              </div>
              <span
                className="text-[10px] font-medium max-w-[64px] truncate"
                style={{ color: allSeen ? "var(--text-tertiary)" : "var(--text-primary)" }}
              >
                {g.author.name ?? "Ukjent"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
