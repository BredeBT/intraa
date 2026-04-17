"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Heart, MessageCircle, Trash2, SendHorizontal, ImageIcon, X } from "lucide-react";
import { FanpassBadge } from "@/components/FanpassBadge";
import { createPost, deletePost } from "@/server/actions/posts";
import type { PostWithAuthor, CommentWithAuthor } from "@/lib/types";
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
void fileToBase64; // retained for potential use

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

function formatSince(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("no-NO", { month: "short", year: "numeric" });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialPosts:    PostWithAuthor[];
  orgId:           string;
  userName:        string;
  userId:          string;
  isSuperAdmin:    boolean;
  logoUrl:         string | null;
  orgName:         string;
  orgType:         string;
  orgSlug:         string | null;
  orgCreatedAt:    string;
  memberCount:     number;
  onlineCount:     number;
  weekPostCount:   number;
  welcomeMessage?: string | null;
  bannerBg:        string | null;
  initialIsLive?:  boolean;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ name, size = 9 }: { name: string; size?: number }) {
  return (
    <div
      className={`h-${size} w-${size} flex shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-semibold text-white`}
    >
      {initials(name)}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedClient({
  initialPosts, orgId, userName, userId, isSuperAdmin,
  logoUrl, orgName, orgType, orgSlug, orgCreatedAt,
  memberCount, onlineCount, weekPostCount, welcomeMessage,
  bannerBg, initialIsLive,
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

  const openKey   = Array.from(openComments).sort().join(",");
  const ALLOWED_PASTE = ["image/png", "image/jpeg", "image/gif", "image/webp"];

  void initialIsLive; // live handled at layout level

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
    let id: ReturnType<typeof setInterval>;
    const run = async () => {
      try {
        const res = await fetch(`/api/posts?orgId=${orgId}`);
        if (cancelled || !res.ok) return;
        const fresh = await res.json() as PostWithAuthor[];
        if (!cancelled) setPosts(fresh);
      } catch { /* silent */ }
    };
    id = setInterval(run, 15000);
    const onVisibility = () => {
      if (document.hidden) clearInterval(id);
      else id = setInterval(run, 15000);
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
          setIsPosting(false); setIsUploading(false); return;
        }
      } catch {
        setIsPosting(false); setIsUploading(false); return;
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
    <div className="mx-auto max-w-[680px] px-4 pb-10" style={{ background: "#0d0d14" }}>

      {/* ── Banner ── */}
      <div
        className="h-36 md:h-40 -mx-4 relative overflow-hidden mb-0"
        style={{ background: bannerBg ?? "linear-gradient(135deg, #2d1b69, #4f35b8, #7c3aed)" }}
      />

      {/* ── Logo + info ── */}
      <div className="flex items-center gap-4 pt-4 pb-4">
        <div className="w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center font-bold text-xl shrink-0 overflow-hidden border-2 border-white/10">
          {logoUrl
            ? <img src={logoUrl} alt="" className="w-full h-full object-cover" />
            : <span className="text-white">{orgName[0]}</span>
          }
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">{orgName}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            <span>{orgType === "COMMUNITY" ? "Community" : "Bedrift"}</span>
            <span>·</span>
            <span>{memberCount.toLocaleString("no-NO")} medlemmer</span>
            {onlineCount > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  {onlineCount} online
                </span>
              </>
            )}
          </div>
        </div>
        {orgSlug && initialIsLive && (
          <a
            href={`/${orgSlug}/live`}
            className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white shrink-0"
            style={{ background: "rgba(220,38,38,0.85)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </a>
        )}
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        {[
          { value: weekPostCount,          label: "Innlegg",    color: "text-white" },
          { value: memberCount,            label: "Medlemmer",  color: "text-white" },
          { value: onlineCount,            label: "Online nå",  color: "text-green-400" },
          { value: formatSince(orgCreatedAt), label: "Aktiv siden", color: "text-white/60", small: true },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl py-3 text-center border border-white/[0.06]"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <p className={`font-semibold ${stat.small ? "text-xs text-white/60" : "text-lg"} ${stat.color}`}>
              {typeof stat.value === "number" ? stat.value.toLocaleString("no-NO") : stat.value}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Velkomstmelding */}
      {welcomeMessage && (
        <div className="mb-4 rounded-xl border border-purple-500/20 px-4 py-3" style={{ background: "rgba(108,71,255,0.08)" }}>
          <p className="text-sm text-white/70">{welcomeMessage}</p>
        </div>
      )}

      {/* ── Compose box ── */}
      <div className="rounded-2xl border border-white/[0.06] p-4 mb-4" style={{ background: "#12121e" }}>
        {pasteToast && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2 text-xs text-white/50" style={{ background: "rgba(255,255,255,0.05)" }}>
            <span>📋 {pasteToast}</span>
            <button onClick={() => setPasteToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
          </div>
        )}

        <div className="flex gap-3 items-center">
          <UserAvatar name={userName} />

          {!open ? (
            <div className="flex flex-1 items-center gap-2">
              <button
                onClick={() => setOpen(true)}
                className="flex-1 rounded-xl px-4 py-2.5 text-left text-sm transition-colors text-left"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}
              >
                Del noe med {orgName}...
              </button>
              <button
                onClick={() => { setOpen(true); imageInputRef.current?.click(); }}
                className="p-2.5 rounded-xl transition-colors"
                style={{ color: "rgba(255,255,255,0.4)" }}
                title="Legg til bilde"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-3">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKey}
                rows={3}
                placeholder={`Del noe med ${orgName}...`}
                className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              {imagePreview && (
                <div className="relative w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Forhåndsvisning" className="max-h-48 rounded-xl object-cover" />
                  <button onClick={clearImage} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: "#12121e" }}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors"
                    style={{ color: "rgba(255,255,255,0.4)" }} title="Legg til bilde">
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>⌘↵ for å sende</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleClose}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{ color: "rgba(255,255,255,0.4)" }}>
                    Avbryt
                  </button>
                  <button type="button" onClick={() => void handleSubmit()}
                    disabled={(!content.trim() && !imageFile) || isPosting}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50">
                    <Send className="h-3.5 w-3.5" />
                    {isUploading ? "Laster opp…" : isPosting ? "Sender…" : "Del"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom toolbar (collapsed state) */}
        {!open && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
            <button
              onClick={() => { setOpen(true); imageInputRef.current?.click(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
            >
              📷 Bilde
            </button>
            <button
              onClick={() => setOpen(true)}
              className="ml-auto bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Publiser
            </button>
          </div>
        )}
      </div>

      {/* ── Post list ── */}
      {posts.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
          Ingen innlegg ennå — vær den første til å poste!
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const canDelete      = post.authorId === userId || isSuperAdmin;
            const isCommentsOpen = openComments.has(post.id);
            const isExpanded     = expandedComments.has(post.id);
            const displayed      = isExpanded ? post.comments : post.comments.slice(0, 3);

            return (
              <article
                key={post.id}
                className="rounded-2xl border border-white/[0.06] overflow-hidden transition-colors hover:border-white/[0.10]"
                style={{ background: "#12121e" }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600/30 text-sm font-semibold text-purple-300">
                    {initials(post.author.name ?? "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-white">{post.author.name ?? ""}</p>
                      {post.author.hasFanpass && <FanpassBadge />}
                    </div>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{relativeTime(post.createdAt)}</p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => setConfirmDeleteId(post.id)}
                      className="p-1.5 rounded-lg transition-colors opacity-30 hover:opacity-70 hover:text-red-400"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                      title="Slett innlegg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Content */}
                {post.content && (
                  <div className="px-4 pb-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
                    <SafeHtml content={post.content} />
                  </div>
                )}

                {/* Image */}
                {post.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.imageUrl} alt="" className="w-full max-h-80 object-cover" />
                )}

                {/* Actions */}
                <div className="flex border-t border-white/[0.06]">
                  <button
                    onClick={() => handleLike(post.id, post.likedByMe)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-all ${
                      post.likedByMe ? "text-pink-400" : "hover:text-white"
                    }`}
                    style={{ color: post.likedByMe ? undefined : "rgba(255,255,255,0.35)" }}
                  >
                    <Heart className="h-4 w-4" fill={post.likedByMe ? "currentColor" : "none"} />
                    {post.likeCount > 0 && <span>{post.likeCount}</span>}
                    <span>{post.likedByMe ? "Likt" : "Lik"}</span>
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-all ${
                      isCommentsOpen ? "text-purple-400" : "hover:text-white"
                    }`}
                    style={{ color: isCommentsOpen ? undefined : "rgba(255,255,255,0.35)" }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {post.comments.length > 0 && <span>{post.comments.length}</span>}
                    <span>Kommenter</span>
                  </button>
                </div>

                {/* Comments */}
                {isCommentsOpen && (
                  <div className="px-4 pb-4 pt-3 space-y-2.5 border-t border-white/[0.06]">
                    {displayed.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600/20 text-[10px] font-semibold text-purple-300">
                          {initials(comment.author.name ?? "")}
                        </div>
                        <div className="flex-1 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div className="mb-0.5 flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-white">{comment.author.name}</span>
                            {comment.author.hasFanpass && <FanpassBadge size={10} />}
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{relativeTime(comment.createdAt)}</span>
                          </div>
                          <div className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                            <SafeHtml content={comment.content} />
                          </div>
                        </div>
                      </div>
                    ))}

                    {post.comments.length > 3 && (
                      <button onClick={() => toggleExpand(post.id)} className="text-xs font-medium text-purple-400 hover:text-purple-300">
                        {isExpanded ? "Vis færre" : `Vis alle ${post.comments.length} kommentarer`}
                      </button>
                    )}

                    {/* Comment input */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600 text-[10px] font-semibold text-white">
                        {initials(userName)}
                      </div>
                      <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <input
                          type="text"
                          value={commentInputs[post.id] ?? ""}
                          onChange={(e) => setCommentInputs((p) => ({ ...p, [post.id]: e.target.value }))}
                          onKeyDown={(e) => handleCommentKey(e, post.id)}
                          placeholder="Skriv en kommentar…"
                          className="flex-1 bg-transparent text-xs text-white placeholder:text-white/30 outline-none"
                        />
                        <button
                          onClick={() => void handleAddComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="shrink-0 transition-colors text-purple-400 hover:text-purple-300 disabled:opacity-30"
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

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] p-6 shadow-2xl" style={{ background: "#12121e" }}>
            <h3 className="mb-2 text-base font-semibold text-white">Slett innlegg</h3>
            <p className="mb-5 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              Er du sikker? Handlingen kan ikke angres.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                Avbryt
              </button>
              <button onClick={() => void handleDelete(confirmDeleteId)}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors">
                Slett
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
