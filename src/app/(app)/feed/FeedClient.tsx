"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Heart, MessageCircle, Trash2, SendHorizontal, ImageIcon, X } from "lucide-react";
import { createPost, deletePost } from "@/server/actions/posts";
import type { PostWithAuthor, CommentWithAuthor } from "@/lib/types";
import { AVATAR_PRESETS } from "@/lib/themePresets";
import SafeHtml from "@/components/SafeHtml";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function relativeTime(date: Date) {
  const diff  = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return "Nå nettopp";
  if (mins < 60) return `${mins} min siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}t siden`;
  return new Date(date).toLocaleDateString("no-NO", { day: "numeric", month: "short" });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialPosts:    PostWithAuthor[];
  orgId:           string;
  userName:        string;
  userId:          string;
  isSuperAdmin:    boolean;
  bannerUrl?:      string | null;
  logoUrl?:        string | null;
  avatarPreset?:   string | null;
  orgName:         string;
  orgType:         "COMPANY" | "COMMUNITY";
  orgColor:        string;
  memberCount:     number;
  welcomeMessage?: string | null;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const cls = size === "sm"
    ? "h-7 w-7 text-[10px]"
    : "h-9 w-9 text-sm";
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white ${cls}`}>
      {initials(name)}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedClient({
  initialPosts, orgId, userName, userId, isSuperAdmin,
  bannerUrl, logoUrl, avatarPreset, orgName, orgType, orgColor, memberCount, welcomeMessage,
}: Props) {
  const [posts,            setPosts]            = useState<PostWithAuthor[]>(initialPosts);
  const [open,             setOpen]             = useState(false);
  const [content,          setContent]          = useState("");
  const [isPosting,        setIsPosting]        = useState(false);
  const [confirmDeleteId,  setConfirmDeleteId]  = useState<string | null>(null);
  const [openComments,     setOpenComments]     = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs,    setCommentInputs]    = useState<Record<string, string>>({});
  const [imageFile,        setImageFile]        = useState<File | null>(null);
  const [imagePreview,     setImagePreview]     = useState<string | null>(null);
  const [isUploading,      setIsUploading]      = useState(false);
  const [pasteToast,       setPasteToast]       = useState<string | null>(null);

  const pasteToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const imageInputRef   = useRef<HTMLInputElement>(null);

  const userInitials = initials(userName || "?");
  const openKey      = Array.from(openComments).sort().join(",");
  const ALLOWED_PASTE = ["image/png", "image/jpeg", "image/gif", "image/webp"];

  const orgTypeLabel = orgType === "COMPANY" ? "Bedrift" : "Community";

  function showPasteToast(msg: string) {
    setPasteToast(msg);
    if (pasteToastTimer.current) clearTimeout(pasteToastTimer.current);
    pasteToastTimer.current = setTimeout(() => setPasteToast(null), 3500);
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => { if (open) textareaRef.current?.focus(); }, [open]);

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          if (!ALLOWED_PASTE.includes(item.type)) {
            showPasteToast("Kun PNG, JPEG, GIF og WebP støttes");
            return;
          }
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;
          setOpen(true);
          if (imagePreview) URL.revokeObjectURL(imagePreview);
          setImageFile(file);
          setImagePreview(URL.createObjectURL(file));
          showPasteToast("Bilde klar – trykk ⌘↵ eller Del");
          return;
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagePreview]);

  useEffect(() => {
    if (isPosting) return;
    let cancelled = false;
    const INTERVAL = 15000;
    let id: ReturnType<typeof setInterval>;
    const run = async () => {
      try {
        const res = await fetch(`/api/posts?orgId=${orgId}`);
        if (cancelled || !res.ok) return;
        const fresh = await res.json() as PostWithAuthor[];
        if (!cancelled) setPosts(fresh);
      } catch { /* silent */ }
    };
    id = setInterval(run, INTERVAL);
    const onVisibility = () => {
      if (document.hidden) clearInterval(id);
      else id = setInterval(run, INTERVAL);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { cancelled = true; clearInterval(id); document.removeEventListener("visibilitychange", onVisibility); };
  }, [orgId, isPosting]);

  useEffect(() => {
    if (!openKey) return;
    const ids = openKey.split(",").filter(Boolean);
    const interval = setInterval(async () => {
      for (const postId of ids) {
        try {
          const res = await fetch(`/api/comments?postId=${postId}`);
          if (!res.ok) continue;
          const comments = await res.json() as CommentWithAuthor[];
          setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments } : p));
        } catch { /* silent */ }
      }
    }, 20000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }

  function handleClose() { setOpen(false); setContent(""); clearImage(); }

  async function handleSubmit() {
    const text = content.trim();
    if ((!text && !imageFile) || isPosting) return;
    setIsPosting(true);

    let imageUrl: string | undefined;
    if (imageFile) {
      setIsUploading(true);
      try {
        const form = new FormData();
        form.append("file", imageFile);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (res.ok) {
          imageUrl = ((await res.json()) as { url: string }).url;
        } else {
          setIsPosting(false);
          setIsUploading(false);
          return;
        }
      } catch {
        setIsPosting(false);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    setContent(""); clearImage(); setOpen(false);

    try {
      await createPost(orgId, text, imageUrl);
      const res = await fetch(`/api/posts?orgId=${orgId}`);
      if (res.ok) setPosts(await res.json() as PostWithAuthor[]);
    } catch { /* silent */ } finally { setIsPosting(false); }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void handleSubmit(); }
    if (e.key === "Escape") handleClose();
  }

  async function handleDelete(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setConfirmDeleteId(null);
    try { await deletePost(postId); } catch { /* silent */ }
  }

  function handleLike(postId: string, likedByMe: boolean) {
    setPosts((prev) => prev.map((p) => p.id === postId
      ? { ...p, likedByMe: !likedByMe, likeCount: likedByMe ? p.likeCount - 1 : p.likeCount + 1 } : p));
    fetch("/api/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId }) })
      .catch(() => setPosts((prev) => prev.map((p) => p.id === postId
        ? { ...p, likedByMe, likeCount: likedByMe ? p.likeCount + 1 : p.likeCount - 1 } : p)));
  }

  function toggleComments(postId: string) {
    const isOpen = openComments.has(postId);
    setOpenComments((prev) => { const n = new Set(prev); isOpen ? n.delete(postId) : n.add(postId); return n; });
    if (!isOpen) {
      fetch(`/api/comments?postId=${postId}`)
        .then((r) => r.json())
        .then((c: CommentWithAuthor[]) => setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments: c } : p)))
        .catch(() => null);
    }
  }

  function toggleExpand(postId: string) {
    setExpandedComments((prev) => { const n = new Set(prev); n.has(postId) ? n.delete(postId) : n.add(postId); return n; });
  }

  async function handleAddComment(postId: string) {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    const optimistic: CommentWithAuthor = {
      id: `opt-${Date.now()}`, content: text, createdAt: new Date(), postId, authorId: userId,
      author: { id: userId, name: userName, email: "", avatarUrl: null, createdAt: new Date() },
    };
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments: [...p.comments, optimistic] } : p));
    try {
      const res  = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId, content: text }) });
      const saved = await res.json() as CommentWithAuthor;
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments: p.comments.map((c) => c.id === optimistic.id ? saved : c) } : p));
    } catch {
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== optimistic.id) } : p));
    }
  }

  function handleCommentKey(e: React.KeyboardEvent, postId: string) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleAddComment(postId); }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950">

      {/* ── 1. ORG HEADER ── */}
      <div className="relative z-10 mx-auto max-w-2xl px-4">
        <div className="flex items-end gap-4 pt-4 mb-6">
          {/* Org logo / avatar */}
          <div className="shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={orgName}
                className="h-16 w-16 rounded-xl border-4 border-zinc-950 object-cover shadow-xl"
              />
            ) : avatarPreset ? (
              (() => {
                const ap = AVATAR_PRESETS.find((p) => p.id === avatarPreset);
                return (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-xl border-4 border-zinc-950 text-3xl shadow-xl"
                    style={{ background: ap?.bg }}
                  >
                    {ap?.emoji ?? initials(orgName)}
                  </div>
                );
              })()
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-xl border-4 border-zinc-950 text-xl font-bold text-white shadow-xl"
                style={{ backgroundColor: orgColor }}
              >
                {initials(orgName)}
              </div>
            )}
          </div>

          {/* Org info */}
          <div className="pb-1 min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-white">{orgName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-xs text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full">
                {orgTypeLabel}
              </span>
              <span className="text-xs text-zinc-400">{memberCount} {memberCount === 1 ? "medlem" : "medlemmer"}</span>
            </div>
          </div>
        </div>

        {/* Velkomstmelding */}
        {welcomeMessage && (
          <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
            <p className="text-sm text-zinc-300">{welcomeMessage}</p>
          </div>
        )}

        {/* ── 2. COMPOSE BOX ── */}
        <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          {/* Paste toast */}
          {pasteToast && (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2 text-xs text-zinc-400">
              <span>📋 {pasteToast}</span>
              <button onClick={() => setPasteToast(null)} className="ml-2 opacity-60 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="flex items-start gap-3">
            <UserAvatar name={userName} />

            {!open ? (
              /* Collapsed — clickable placeholder row */
              <div className="flex flex-1 items-center gap-2">
                <button
                  onClick={() => setOpen(true)}
                  className="flex-1 rounded-lg bg-zinc-800 px-4 py-2.5 text-left text-sm text-zinc-400 transition-colors hover:opacity-80"
                >
                  Del noe med {orgName || "teamet"}…
                </button>
                <button
                  onClick={() => { setOpen(true); imageInputRef.current?.click(); }}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2.5 text-xs text-zinc-400 transition-colors hover:opacity-80"
                  title="Legg til bilde"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* Expanded */
              <div className="flex flex-1 flex-col gap-3">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKey}
                  rows={3}
                  placeholder={`Del noe med ${orgName || "teamet"}…`}
                  className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-400 outline-none transition-colors focus:border-indigo-500"
                />

                {imagePreview && (
                  <div className="relative w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Forhåndsvisning" className="max-h-48 rounded-xl object-cover" />
                    <button
                      onClick={clearImage}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white hover:opacity-80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-400 transition-colors hover:opacity-80"
                      title="Legg til bilde"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    <span className="text-xs text-zinc-400 opacity-60">⌘↵ for å sende</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleClose}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:opacity-80">
                      Avbryt
                    </button>
                    <button type="button" onClick={() => void handleSubmit()}
                      disabled={(!content.trim() && !imageFile) || isPosting}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-80 disabled:opacity-50">
                      <Send className="h-3.5 w-3.5" />
                      {isUploading ? "Laster opp…" : isPosting ? "Sender…" : "Del"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. POST LIST ── */}
        {posts.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-600">
            Ingen innlegg ennå — vær den første til å poste!
          </p>
        ) : (
          <div className="space-y-4 pb-10">
            {posts.map((post) => {
              const canDelete      = post.authorId === userId || isSuperAdmin;
              const isCommentsOpen = openComments.has(post.id);
              const isExpanded     = expandedComments.has(post.id);
              const displayed      = isExpanded ? post.comments : post.comments.slice(0, 3);

              return (
                <article key={post.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  {/* Post header */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-white">
                      {initials(post.author.name ?? "")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{post.author.name ?? ""}</p>
                      <p className="text-xs text-zinc-400">{relativeTime(post.createdAt)}</p>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => setConfirmDeleteId(post.id)}
                        className="rounded-md p-1.5 text-zinc-400 opacity-40 transition-colors hover:opacity-100 hover:text-rose-400"
                        title="Slett innlegg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Post content */}
                  {post.content && (
                    <div className="mt-3 text-sm leading-relaxed text-white">
                      <SafeHtml content={post.content} />
                    </div>
                  )}

                  {/* Post image */}
                  {post.imageUrl && (
                    <div className="mt-3 flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.imageUrl}
                        alt=""
                        className="max-h-96 max-w-full rounded-xl object-contain"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-5 border-t border-zinc-800 pt-3">
                    <button
                      onClick={() => handleLike(post.id, post.likedByMe)}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                        post.likedByMe ? "text-rose-400" : "text-zinc-400 hover:text-rose-400"
                      }`}
                    >
                      <Heart className="h-4 w-4" fill={post.likedByMe ? "currentColor" : "none"} />
                      {post.likeCount > 0 && <span>{post.likeCount}</span>}
                      <span>{post.likedByMe ? "Likt" : "Lik"}</span>
                    </button>
                    <button
                      onClick={() => toggleComments(post.id)}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                        isCommentsOpen ? "text-indigo-400" : "text-zinc-400 hover:text-indigo-400"
                      }`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {post.comments.length > 0 && <span>{post.comments.length}</span>}
                      <span>Kommentarer</span>
                    </button>
                  </div>

                  {/* Comments */}
                  {isCommentsOpen && (
                    <div className="mt-3 space-y-2.5 border-t border-zinc-800 pt-3">
                      {displayed.map((comment) => (
                        <div key={comment.id} className="flex items-start gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-semibold text-white">
                            {initials(comment.author.name ?? "")}
                          </div>
                          <div className="flex-1 rounded-lg bg-zinc-800 px-3 py-2">
                            <div className="mb-0.5 flex items-baseline gap-2">
                              <span className="text-xs font-semibold text-white">{comment.author.name}</span>
                              <span className="text-[10px] text-zinc-400">{relativeTime(comment.createdAt)}</span>
                            </div>
                            <div className="text-xs leading-relaxed text-white"><SafeHtml content={comment.content} /></div>
                          </div>
                        </div>
                      ))}

                      {post.comments.length > 3 && (
                        <button
                          onClick={() => toggleExpand(post.id)}
                          className="text-xs font-medium text-indigo-400 hover:opacity-80"
                        >
                          {isExpanded ? "Vis færre" : `Vis alle ${post.comments.length} kommentarer`}
                        </button>
                      )}

                      {/* Comment input */}
                      <div className="flex items-center gap-2 pt-1">
                        <UserAvatar name={userName} size="sm" />
                        <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2">
                          <input
                            type="text"
                            value={commentInputs[post.id] ?? ""}
                            onChange={(e) => setCommentInputs((p) => ({ ...p, [post.id]: e.target.value }))}
                            onKeyDown={(e) => handleCommentKey(e, post.id)}
                            placeholder="Skriv en kommentar…"
                            className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-400 outline-none"
                          />
                          <button
                            onClick={() => void handleAddComment(post.id)}
                            disabled={!commentInputs[post.id]?.trim()}
                            className="shrink-0 text-zinc-400 transition-colors hover:text-indigo-400 disabled:opacity-30"
                          >
                            <SendHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-semibold text-white">Slett innlegg</h3>
            <p className="mb-5 text-sm text-zinc-400">
              Er du sikker? Handlingen kan ikke angres.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:opacity-80">
                Avbryt
              </button>
              <button onClick={() => void handleDelete(confirmDeleteId)}
                className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500">
                Slett
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
