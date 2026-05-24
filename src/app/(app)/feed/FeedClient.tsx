"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Heart, MessageCircle, Trash2, SendHorizontal, ImageIcon, X, Sparkles, Crown, Users as UsersIcon, Image as ImgIcon, Paperclip } from "lucide-react";
import { FanpassBadge } from "@/components/FanpassBadge";
import { createPost, deletePost } from "@/server/actions/posts";
import RichTextEditor, { type RichTextEditorRef } from "@/components/RichTextEditorLazy";
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

interface OnlineUser {
  id:        string;
  name:      string | null;
  username:  string;
  avatarUrl: string | null;
}

interface Props {
  initialPosts:       PostWithAuthor[];
  orgId:              string;
  userName:           string;
  userId:             string;
  isSuperAdmin:       boolean;
  logoUrl:            string | null;
  orgName:            string;
  orgType:            string;
  orgSlug:            string | null;
  orgCreatedAt:       string;
  memberCount:        number;
  welcomeMessage?:    string | null;
  bannerBg:           string | null;
}

interface FeedStats {
  onlineUsers:        OnlineUser[];
  onlineCount:        number;
  weekPostCount:      number;
  weekFanpassCount:   number;
  activeStoriesCount: number;
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

// ─── Collapsible post body (Facebook-style "Vis mer") ────────────────────────

const COLLAPSED_MAX_PX = 240; // ~10 linjer med vår leading

function CollapsiblePostBody({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Mål innholdshøyden uten å være capped — sammenlign mot threshold
    const measure = () => setNeedsToggle(el.scrollHeight > COLLAPSED_MAX_PX + 8);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [html]);

  return (
    <div className="px-4 pb-3 text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
      <div
        ref={ref}
        className="relative overflow-hidden transition-[max-height] duration-200"
        style={{ maxHeight: expanded || !needsToggle ? "none" : `${COLLAPSED_MAX_PX}px` }}
      >
        <SafeHtml content={html} />
        {needsToggle && !expanded && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            style={{ background: "linear-gradient(to bottom, transparent, var(--bg-secondary))" }}
          />
        )}
      </div>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ color: "#A855F7" }}
        >
          {expanded ? "Vis mindre" : "… Vis mer"}
        </button>
      )}
    </div>
  );
}

// ─── Sidebar stat row ─────────────────────────────────────────────────────────

function SidebarStat({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </span>
      <span className="text-sm font-bold text-white tabular-nums">{value}</span>
      <span className="text-xs text-white/50">{label}</span>
    </li>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedClient({
  initialPosts, orgId, userName, userId, isSuperAdmin,
  logoUrl, orgName, orgSlug, orgCreatedAt,
  memberCount, welcomeMessage, bannerBg, orgType,
}: Props) {
  void orgType; // legacy prop

  // Stats (online, ukestall, stories) hentes etter first paint — ikke kritisk
  // for å vise feeden. Tomt initialt så pulse-bar/sidebar bare har 0/[] mens
  // de fylles inn.
  const [stats, setStats] = useState<FeedStats>({
    onlineUsers:        [],
    onlineCount:        0,
    weekPostCount:      0,
    weekFanpassCount:   0,
    activeStoriesCount: 0,
  });
  useEffect(() => {
    let alive = true;
    fetch(`/api/feed/stats?orgId=${orgId}`)
      .then((r) => r.ok ? r.json() as Promise<FeedStats> : Promise.reject())
      .then((data) => { if (alive) setStats(data); })
      .catch(() => {});
    return () => { alive = false; };
  }, [orgId]);
  const { onlineCount, onlineUsers, weekFanpassCount, activeStoriesCount, weekPostCount } = stats;
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
  const editorRef       = useRef<RichTextEditorRef>(null);
  const imageInputRef   = useRef<HTMLInputElement>(null);

  const openKey   = Array.from(openComments).sort().join(",");
  const ALLOWED_PASTE = ["image/png", "image/jpeg", "image/gif", "image/webp"];


  function showPasteToast(msg: string) {
    setPasteToast(msg);
    if (pasteToastTimer.current) clearTimeout(pasteToastTimer.current);
    pasteToastTimer.current = setTimeout(() => setPasteToast(null), 3500);
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => { if (open) editorRef.current?.focus(); }, [open]);

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

  function handleClose() {
    setOpen(false);
    setContent("");
    editorRef.current?.clear();
    clearImage();
  }

  async function handleSubmit() {
    const html        = editorRef.current?.getHTML() ?? "";
    const isEmptyText = editorRef.current?.isEmpty() ?? true;
    if ((isEmptyText && !imageFile) || isPosting) return;
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

    setContent("");
    editorRef.current?.clear();
    clearImage();
    setOpen(false);
    try {
      await createPost(orgId, isEmptyText ? "" : html, imageUrl);
      const res = await fetch(`/api/posts?orgId=${orgId}`);
      if (res.ok) setPosts(await res.json() as PostWithAuthor[]);
    } catch { /* silent */ } finally { setIsPosting(false); }
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

  // Pulse-bar items (only show when truthy/non-zero)
  const pulseItems = [
    onlineCount > 0 && {
      key:   "online",
      icon:  <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>,
      label: onlineCount === 1 ? "1 online nå" : `${onlineCount} online nå`,
      color: "#5EEAD4",
    },
    activeStoriesCount > 0 && {
      key:   "stories",
      icon:  <Sparkles className="h-3.5 w-3.5" />,
      label: `${activeStoriesCount} ${activeStoriesCount === 1 ? "ny story" : "nye stories"}`,
      color: "#A855F7",
    },
    weekFanpassCount > 0 && {
      key:   "fanpass",
      icon:  <Crown className="h-3.5 w-3.5" />,
      label: `${weekFanpassCount} ${weekFanpassCount === 1 ? "ny Fanpass" : "nye Fanpass"} denne uka`,
      color: "#FBBF24",
    },
  ].filter(Boolean) as { key: string; href?: string; icon: React.ReactNode; label: string; color: string; pulse?: boolean }[];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10" style={{ background: "var(--bg-primary)" }}>

      {/* ── Compressed banner with avatar overlap ── */}
      <div className="relative -mx-4 mb-14">
        <div
          className="h-32 md:h-36 relative overflow-hidden"
          style={{
            background: bannerBg ?? "linear-gradient(135deg, #5EEAD4 0%, #A855F7 50%, #60A5FA 100%)",
          }}
        >
          {/* Subtle gradient overlay to ensure text legibility regardless of banner */}
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(5,8,22,0.6) 100%)" }} />
        </div>

        {/* Avatar — overlaps banner */}
        <div className="absolute left-4 md:left-6 -bottom-10 flex items-end gap-3">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 overflow-hidden shadow-2xl"
            style={{
              background: logoUrl ? "transparent" : "linear-gradient(135deg, #A855F7, #60A5FA)",
              border:     "3px solid var(--bg-primary)",
            }}
          >
            {logoUrl
              ? /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-white">{orgName[0]?.toUpperCase()}</span>
            }
          </div>
        </div>

        {/* Right side: org meta */}
        <div className="absolute right-4 md:right-6 bottom-3 text-right">
          <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-md">{orgName}</h1>
          <p className="text-[11px] md:text-xs text-white/80 mt-0.5">
            {memberCount.toLocaleString("no-NO")} medlemmer · Siden {formatSince(orgCreatedAt)}
          </p>
        </div>
      </div>

      {/* ── Pulse bar — full bredde over grid-en så puls føles som "platform-status" ── */}
      {pulseItems.length > 0 && (
        <div className="mt-2 mb-4 flex flex-wrap items-center gap-2">
          {pulseItems.map((item) => {
            const inner = (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: `${item.color}15`,
                  color:      item.color,
                  border:     `1px solid ${item.color}30`,
                }}
              >
                <span style={{ color: item.color }}>{item.icon}</span>
                {item.label}
              </span>
            );
            return item.href
              ? <a key={item.key} href={item.href} className="hover:scale-[1.03] transition-transform">{inner}</a>
              : <span key={item.key}>{inner}</span>;
          })}
        </div>
      )}

      {/* ── Two-column layout: feed + sidebar on lg+ ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

        {/* ── MAIN COLUMN ──────────────────────────────────────────────── */}
        <div className="min-w-0">

          {/* Velkomstmelding */}
          {welcomeMessage && (
            <div className="mb-4 rounded-2xl border px-4 py-3"
                 style={{ background: "rgba(168,85,247,0.08)", borderColor: "rgba(168,85,247,0.25)" }}>
              <p className="text-sm text-white/80">{welcomeMessage}</p>
            </div>
          )}

          {/* ── Compose box — compact by default, expanded on focus ── */}
          <div className="rounded-2xl border border-white/[0.08] mb-5 transition-all"
               style={{ background: "var(--bg-secondary)" }}>
            {pasteToast && (
              <div className="m-3 mb-0 flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2 text-xs text-white/60"
                   style={{ background: "var(--bg-glass)" }}>
                <span>📋 {pasteToast}</span>
                <button onClick={() => setPasteToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
              </div>
            )}

            {!open ? (
              /* Collapsed: single-line tap target */
              <button
                onClick={() => setOpen(true)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <UserAvatar name={userName} />
                <span className="flex-1 text-sm text-white/40">Del noe med {orgName}…</span>
                <span
                  onClick={(e) => { e.stopPropagation(); setOpen(true); imageInputRef.current?.click(); }}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5"
                  title="Legg til bilde"
                >
                  <ImageIcon className="h-4 w-4" />
                </span>
              </button>
            ) : (
              /* Expanded: full composer */
              <div className="flex gap-3 items-start p-4">
                <UserAvatar name={userName} />
                <div className="flex flex-1 flex-col gap-3 min-w-0">
                  <RichTextEditor
                    ref={editorRef}
                    placeholder={`Del noe med ${orgName}…`}
                    onEnter={() => void handleSubmit()}
                    enterMakesNewline
                    showFormatByDefault
                    minHeight={200}
                    onChange={(text) => setContent(text)}
                  />
                  {imagePreview && (
                    <div className="relative w-fit">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="Forhåndsvisning" className="max-h-64 rounded-xl object-cover" />
                      <button
                        onClick={clearImage}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-lg"
                        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-strong)" }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="nav-link flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors"
                        style={{ color: "var(--text-secondary)" }}
                        title="Legg til bilde"
                      >
                        <Paperclip className="h-4 w-4" />
                        <span className="hidden sm:inline">Bilde</span>
                      </button>
                      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      <span className="hidden md:inline">⌘↵ for å sende</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="nav-link rounded-lg px-3 py-2 text-sm font-medium"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Avbryt
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={(!content.trim() && !imageFile) || isPosting}
                        className="flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
                        style={{ background: "linear-gradient(135deg, #5EEAD4, #A855F7)", color: "#fff" }}
                      >
                        <Send className="h-3.5 w-3.5" />
                        {isUploading ? "Laster opp…" : isPosting ? "Sender…" : "Publiser"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

      {/* ── Post list ── */}
      {posts.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
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
                style={{ background: "var(--bg-secondary)" }}
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
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{relativeTime(post.createdAt)}</p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => setConfirmDeleteId(post.id)}
                      className="p-1.5 rounded-lg transition-colors opacity-30 hover:opacity-70 hover:text-red-400"
                      style={{ color: "var(--text-secondary)" }}
                      title="Slett innlegg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Content */}
                {post.content && (
                  <CollapsiblePostBody html={post.content} />
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
                    style={{ color: post.likedByMe ? undefined : "var(--text-tertiary)" }}
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
                    style={{ color: isCommentsOpen ? undefined : "var(--text-tertiary)" }}
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
                        <div className="flex-1 rounded-xl px-3 py-2" style={{ background: "var(--bg-glass)" }}>
                          <div className="mb-0.5 flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-white">{comment.author.name}</span>
                            {comment.author.hasFanpass && <FanpassBadge size={10} />}
                            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{relativeTime(comment.createdAt)}</span>
                          </div>
                          <div className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
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
                      <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2" style={{ background: "var(--border-subtle)", border: "1px solid var(--border-subtle)" }}>
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
        </div>
        {/* ── /MAIN COLUMN ─────────────────────────────────────────────── */}

        {/* ── SIDEBAR (desktop lg+ only) ───────────────────────────────── */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-4">

          {/* Online now */}
          <div className="rounded-2xl border border-white/[0.08] p-4" style={{ background: "var(--bg-secondary)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Online nå
              </p>
              <span className="text-[10px] text-emerald-400">{onlineCount}</span>
            </div>
            {onlineUsers.length === 0 ? (
              <p className="text-xs text-white/30">Ingen på plattformen nå.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {onlineUsers.slice(0, 6).map((u) => (
                  <a
                    key={u.id}
                    href={`/u/${u.username}`}
                    className="flex items-center gap-2.5 group"
                  >
                    <div className="relative shrink-0">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
                        style={{
                          background: u.avatarUrl ? `url(${u.avatarUrl}) center/cover` : "linear-gradient(135deg, #5EEAD4, #A855F7)",
                        }}
                      >
                        {!u.avatarUrl && initials(u.name ?? u.username)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2" style={{ borderColor: "var(--bg-secondary)" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate group-hover:text-emerald-300 transition-colors">{u.name ?? u.username}</p>
                      <p className="text-[10px] text-white/40 truncate">@{u.username}</p>
                    </div>
                  </a>
                ))}
                {onlineUsers.length > 6 && (
                  <p className="text-[10px] text-white/40 mt-1">+ {onlineUsers.length - 6} til</p>
                )}
              </div>
            )}
          </div>

          {/* Hva skjer denne uka */}
          <div className="rounded-2xl border border-white/[0.08] p-4" style={{ background: "var(--bg-secondary)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-3">
              Denne uka
            </p>
            <ul className="space-y-2.5 text-xs">
              <SidebarStat icon={<ImgIcon className="h-3.5 w-3.5" />} value={weekPostCount} label="nye innlegg" color="#A855F7" />
              <SidebarStat icon={<Sparkles className="h-3.5 w-3.5" />} value={activeStoriesCount} label="aktive stories" color="#60A5FA" />
              <SidebarStat icon={<Crown    className="h-3.5 w-3.5" />} value={weekFanpassCount} label="nye Fanpass" color="#FBBF24" />
            </ul>
          </div>

          {/* Members shortcut */}
          {orgSlug && (
            <a
              href={`/community/medlemmer`}
              className="rounded-2xl border border-white/[0.08] p-4 transition-colors hover:border-white/20 group"
              style={{ background: "var(--bg-secondary)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: "rgba(94,234,212,0.15)", color: "#5EEAD4" }}
                >
                  <UsersIcon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-white">Alle medlemmer</p>
                  <p className="text-[10px] text-white/40">{memberCount.toLocaleString("no-NO")} totalt</p>
                </div>
                <span className="text-white/30 group-hover:translate-x-0.5 group-hover:text-white transition-all">→</span>
              </div>
            </a>
          )}
        </aside>
      </div>
      {/* ── /TWO-COLUMN LAYOUT ───────────────────────────────────────── */}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] p-6 shadow-2xl" style={{ background: "var(--bg-secondary)" }}>
            <h3 className="mb-2 text-base font-semibold text-white">Slett innlegg</h3>
            <p className="mb-5 text-sm" style={{ color: "var(--text-tertiary)" }}>
              Er du sikker? Handlingen kan ikke angres.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
                style={{ background: "var(--border-subtle)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
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
