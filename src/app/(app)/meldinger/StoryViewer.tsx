"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { FanpassBadge } from "@/components/FanpassBadge";

interface StoryItem {
  id:         string;
  imageUrl:   string;
  caption:    string | null;
  width:      number | null;
  height:     number | null;
  createdAt:  string;
  expiresAt:  string;
  viewedByMe: boolean;
}

interface StoryGroup {
  author:  { id: string; name: string | null; avatarUrl: string | null };
  stories: StoryItem[];
}

interface Props {
  groups:        StoryGroup[];
  startGroupIdx: number;
  currentUserId: string;
  canDelete:     (authorId: string) => boolean; // returns true if user can delete a story by this author
  onClose:       () => void;
  onDeleted:     (storyId: string) => void;
  onViewed?:     (storyId: string) => void;
}

const DURATION_MS = 5000;

function initials(name: string | null | undefined) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60_000))} min siden`;
  return `${h} ${h === 1 ? "time" : "timer"} siden`;
}

// Find the index of the first unseen story in a group, or 0 if all seen.
function firstUnseenIdx(group: StoryGroup | undefined): number {
  if (!group) return 0;
  const idx = group.stories.findIndex((s) => !s.viewedByMe);
  return idx >= 0 ? idx : 0;
}

export default function StoryViewer({ groups, startGroupIdx, currentUserId, canDelete, onClose, onDeleted, onViewed }: Props) {
  const [groupIdx, setGroupIdx] = useState(startGroupIdx);
  const [storyIdx, setStoryIdx] = useState(() => firstUnseenIdx(groups[startGroupIdx]));
  const [paused,   setPaused]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  const startTimeRef = useRef<number>(Date.now());
  const elapsedRef   = useRef<number>(0);
  const rafRef       = useRef<number>(0);
  const viewedRef    = useRef<Set<string>>(new Set());

  void currentUserId;

  // Mark current story as viewed (debounced via ref so we don't double-post)
  useEffect(() => {
    if (!story) return;
    if (viewedRef.current.has(story.id)) return;
    viewedRef.current.add(story.id);
    // Fire-and-forget view event
    void fetch(`/api/stories/${story.id}/view`, { method: "POST" }).catch(() => null);
    if (!story.viewedByMe) onViewed?.(story.id);
  }, [story, onViewed]);

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      const next = groups[groupIdx + 1];
      setGroupIdx((i) => i + 1);
      setStoryIdx(firstUnseenIdx(next));
    } else {
      onClose();
    }
  }, [group, groupIdx, groups, storyIdx, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      const prevGroup = groups[groupIdx - 1];
      if (prevGroup) {
        setGroupIdx((i) => i - 1);
        setStoryIdx(prevGroup.stories.length - 1);
      }
    }
  }, [storyIdx, groupIdx, groups]);

  // Progress / auto-advance
  useEffect(() => {
    startTimeRef.current = Date.now();
    elapsedRef.current = 0;
    setProgress(0);

    const tick = () => {
      if (paused) {
        startTimeRef.current = Date.now() - elapsedRef.current;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const e = Date.now() - startTimeRef.current;
      elapsedRef.current = e;
      const p = Math.min(1, e / DURATION_MS);
      setProgress(p);
      if (p >= 1) {
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [groupIdx, storyIdx, paused, goNext]);

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); goPrev(); }
      if (e.key === "Escape")     { onClose(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

  async function handleDelete() {
    if (!story) return;
    if (!confirm("Slett denne storyen?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/stories/${story.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted(story.id);
        // Try to advance, but if no more stories, close
        if (group && storyIdx >= group.stories.length - 1 && groupIdx >= groups.length - 1) {
          onClose();
        } else {
          goNext();
        }
      }
    } finally {
      setDeleting(false);
    }
  }

  if (!group || !story) return null;

  const userCanDelete = canDelete(group.author.id);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{
        background:           "rgba(5,8,22,0.96)",
        backdropFilter:       "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="relative h-full w-full max-w-[440px] sm:max-h-[820px] sm:aspect-[9/16] sm:my-auto overflow-hidden bg-black sm:rounded-3xl shadow-2xl">

        {/* Top: progress bars + author + close */}
        <div
          className="absolute top-0 left-0 right-0 z-20 px-3 pt-3 pb-2"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }}
        >
          {/* Progress segments */}
          <div className="flex gap-1 mb-3">
            {group.stories.map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.25)" }}>
                <div
                  className="h-full"
                  style={{
                    background: "#fff",
                    width:      `${i < storyIdx ? 100 : i === storyIdx ? progress * 100 : 0}%`,
                    transition: paused ? "none" : "width 50ms linear",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author + time + close */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, #5EEAD4, #A855F7)",
                color:      "#fff",
              }}
            >
              {group.author.avatarUrl
                ? <span /> // eslint-disable-line jsx-a11y/alt-text
                : initials(group.author.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white truncate">{group.author.name ?? "Ukjent"}</span>
                <FanpassBadge size={11} />
              </div>
              <p className="text-[10px] text-white/60">{timeAgo(story.createdAt)}</p>
            </div>
            {userCanDelete && (
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-50"
                style={{ color: "#fff" }}
                title="Slett story"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
              style={{ color: "#fff" }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={story.imageUrl}
          alt=""
          className="h-full w-full object-contain select-none"
          draggable={false}
        />

        {/* Tap zones — left = prev, right = next, hold = pause */}
        <button
          aria-label="Forrige"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          onClick={goPrev}
          className="absolute top-16 bottom-24 left-0 w-1/3 z-10"
          style={{ background: "transparent" }}
        />
        <button
          aria-label="Neste"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          onClick={goNext}
          className="absolute top-16 bottom-24 right-0 w-1/3 z-10"
          style={{ background: "transparent" }}
        />

        {/* Subtle desktop nav arrows */}
        <button
          onClick={goPrev}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full opacity-0 hover:opacity-100 transition-opacity z-10"
          style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={goNext}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full opacity-0 hover:opacity-100 transition-opacity z-10"
          style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Caption */}
        {story.caption && (
          <div
            className="absolute bottom-0 left-0 right-0 px-5 pt-12 pb-6 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
          >
            <p className="text-sm text-white leading-relaxed">{story.caption}</p>
          </div>
        )}
      </div>
    </div>
  );
}
