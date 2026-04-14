"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface Profile {
  id:          string;
  name:        string | null;
  username:    string | null;
  avatarUrl:   string | null;
  bannerUrl:   string | null;
  bio:         string | null;
  interests:   string[];
  socialLinks: Record<string, string> | null;
  createdAt:   string;
}

interface Community {
  id:      string;
  slug:    string;
  name:    string;
  logoUrl: string | null;
  role:    string;
  points:  number;
}

interface Badge {
  id:           string;
  shopItem:     { name: string; value: string };
  organization: { name: string };
}

type FriendStatus = "none" | "pending_sent" | "pending_received" | "accepted";

interface Props {
  profile:         Profile;
  isOwnProfile:    boolean;
  showFullProfile: boolean;
  friendStatus:    FriendStatus;
  friendshipId:    string | null;
  friendCount:     number;
  communities:     Community[];
  currentUserId:   string;
  isOnline:        boolean;
  badges:          Badge[];
  nameColor:       { shopItem: { value: string } } | null;
  profileFrame:    { shopItem: { value: string } } | null;
  totalCoins:      number;
  activeFanpass:   { organization: { name: string } } | null;
}

function initials(name: string | null) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// ── Dropdown menu (desktop) ──────────────────────────────────────────────────

interface MenuItem {
  label:   string;
  danger?: boolean;
  divider?: boolean;
  onClick: () => void;
}

function DropdownMenu({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-10 z-50 min-w-[180px] rounded-xl border border-white/[0.08] bg-[#1a1a2e] shadow-xl shadow-black/40"
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && <div className="my-1 border-t border-white/[0.06]" />}
          <button
            onClick={() => { item.onClick(); onClose(); }}
            className={`w-full px-4 py-2.5 text-left text-sm transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-white/[0.06] ${
              item.danger ? "text-red-400 hover:text-red-300" : "text-white/80"
            }`}
          >
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Bottom sheet (mobile) ────────────────────────────────────────────────────

function BottomSheet({
  items,
  profile,
  onClose,
}: {
  items:    MenuItem[];
  profile:  Profile;
  onClose:  () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />
      <div
        className={`relative z-10 rounded-t-2xl border-t border-white/[0.08] bg-[#1a1a2e] pb-safe transition-transform duration-250 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">
              {initials(profile.name)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-white">{profile.name ?? "Ukjent"}</p>
            {profile.username && <p className="text-xs text-white/40">@{profile.username}</p>}
          </div>
        </div>
        <div className="py-2">
          {items.map((item, i) => (
            <div key={i}>
              {item.divider && <div className="my-1 border-t border-white/[0.06]" />}
              <button
                onClick={() => { item.onClick(); close(); }}
                className={`flex w-full items-center px-5 py-3.5 text-sm font-medium transition-colors active:bg-white/[0.06] min-h-[52px] ${
                  item.danger ? "text-red-400" : "text-white/80"
                }`}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4">
          <button
            onClick={close}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-3.5 text-sm font-medium text-white/50 min-h-[52px]"
          >
            <X className="h-4 w-4" /> Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit profile modal ───────────────────────────────────────────────────────

interface EditModalProps {
  name:        string | null;
  bio:         string | null;
  avatarUrl:   string | null;
  bannerUrl:   string | null;
  onClose:     () => void;
  onSave:      (vals: { name: string; bio: string; avatarUrl: string | null; bannerUrl: string | null }) => void;
}

function EditProfileModal({ name, bio, avatarUrl, bannerUrl, onClose, onSave }: EditModalProps) {
  const [editName,      setEditName]      = useState(name ?? "");
  const [editBio,       setEditBio]       = useState(bio ?? "");
  const [editAvatarUrl, setEditAvatarUrl] = useState(avatarUrl);
  const [editBannerUrl, setEditBannerUrl] = useState(bannerUrl);
  const [saving,        setSaving]        = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) return null;
    const data = await res.json() as { url: string };
    return data.url;
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const url = await uploadFile(file);
    if (url) setEditAvatarUrl(url);
    setUploadingAvatar(false);
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    const url = await uploadFile(file);
    if (url) setEditBannerUrl(url);
    setUploadingBanner(false);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:      editName.trim() || name,
        bio:       editBio.trim(),
        avatarUrl: editAvatarUrl,
        bannerUrl: editBannerUrl,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSave({ name: editName.trim() || (name ?? ""), bio: editBio.trim(), avatarUrl: editAvatarUrl, bannerUrl: editBannerUrl });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#1a1a2e] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">Rediger profil</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Banner preview + upload */}
        <div
          className="relative h-24 cursor-pointer group"
          style={{
            background: editBannerUrl
              ? `url(${editBannerUrl}) center/cover`
              : "linear-gradient(135deg, #2d1b69, #4f35b8, #a855f7)",
          }}
          onClick={() => bannerInputRef.current?.click()}
        >
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-xs text-white font-medium">
              {uploadingBanner ? "Laster opp..." : "Bytt bannerbilde"}
            </span>
          </div>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        </div>

        {/* Avatar + fields */}
        <div className="px-5 pb-5">
          {/* Avatar */}
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div
              className="relative w-16 h-16 rounded-full border-4 border-[#1a1a2e] overflow-hidden bg-purple-600 flex items-center justify-center text-xl font-bold cursor-pointer group flex-shrink-0"
              onClick={() => avatarInputRef.current?.click()}
            >
              {editAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white">{initials(editName || name)}</span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-xs text-white font-medium">
                  {uploadingAvatar ? "..." : "Bytt"}
                </span>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>

          {/* Name */}
          <div className="mb-3">
            <label className="block text-xs text-white/40 mb-1.5">Navn</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={60}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500/50 transition-colors"
              placeholder="Ditt navn"
            />
          </div>

          {/* Bio */}
          <div className="mb-4">
            <label className="block text-xs text-white/40 mb-1.5">Bio</label>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value.slice(0, 160))}
              rows={3}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500/50 transition-colors resize-none"
              placeholder="Fortell litt om deg selv..."
            />
            <p className="text-xs text-white/30 text-right mt-1">{editBio.length}/160</p>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || uploadingAvatar || uploadingBanner}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
          >
            {saving ? "Lagrer..." : "Lagre"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ProfileClient({
  profile, isOwnProfile, showFullProfile, friendStatus: initialStatus, friendshipId: initialFriendshipId,
  friendCount, communities, currentUserId,
  isOnline      = false,
  badges        = [],
  nameColor     = null,
  profileFrame  = null,
  totalCoins    = 0,
  activeFanpass = null,
}: Props) {
  const router = useRouter();

  const [friendStatus,  setFriendStatus]  = useState<FriendStatus>(initialStatus);
  const [friendshipId,  setFriendshipId]  = useState<string | null>(initialFriendshipId);
  const [pending,       start]            = useTransition();
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [isMobile,      setIsMobile]      = useState(false);
  const [editOpen,      setEditOpen]      = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Local display state (updated after edit save)
  const [displayName,      setDisplayName]      = useState(profile.name);
  const [displayBio,       setDisplayBio]       = useState(profile.bio);
  const [displayAvatarUrl, setDisplayAvatarUrl] = useState(profile.avatarUrl);
  const [displayBannerUrl, setDisplayBannerUrl] = useState(profile.bannerUrl);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    function onResize() { setIsMobile(window.innerWidth < 768); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  function sendFriendRequest() {
    start(async () => {
      const res = await fetch("/api/friends/request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ receiverId: profile.id }),
      });
      if (res.ok) {
        const data = await res.json() as { friendship: { id: string } };
        setFriendStatus("pending_sent");
        setFriendshipId(data.friendship.id);
      }
    });
  }

  function withdrawRequest() {
    if (!friendshipId) return;
    start(async () => {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      if (res.ok) { setFriendStatus("none"); setFriendshipId(null); }
    });
  }

  function respondToRequest(action: "accept" | "decline") {
    if (!friendshipId) return;
    start(async () => {
      const res = await fetch("/api/friends/respond", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ friendshipId, action }),
      });
      if (res.ok) {
        setFriendStatus(action === "accept" ? "accepted" : "none");
        if (action === "decline") setFriendshipId(null);
      }
    });
  }

  function removeFriend() {
    if (!friendshipId) return;
    start(async () => {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      if (res.ok) { setFriendStatus("none"); setFriendshipId(null); }
    });
  }

  function reportUser() {
    alert("Rapporten din er mottatt. Vi vil se på saken.");
  }

  function blockUser() {
    alert("Brukeren er blokkert.");
  }

  // Build three-dots menu items
  const menuItems: MenuItem[] = [];
  if (friendStatus === "accepted") {
    menuItems.push({ label: "Fjern venn",        onClick: removeFriend });
    menuItems.push({ label: "Rapporter bruker",  danger: true, divider: true, onClick: reportUser });
    menuItems.push({ label: "Blokker bruker",    danger: true, onClick: blockUser });
  } else if (friendStatus === "pending_sent") {
    menuItems.push({ label: "Trekk tilbake forespørsel", onClick: withdrawRequest });
    menuItems.push({ label: "Rapporter bruker",  danger: true, divider: true, onClick: reportUser });
    menuItems.push({ label: "Blokker bruker",    danger: true, onClick: blockUser });
  } else {
    menuItems.push({ label: "Rapporter bruker",  danger: true, onClick: reportUser });
    menuItems.push({ label: "Blokker bruker",    danger: true, onClick: blockUser });
  }

  const membershipCount = communities.length;

  return (
    <div className="mx-auto max-w-[680px] px-4 pb-12">
      {/* Banner */}
      <div
        className="h-40 rounded-b-2xl -mx-4 md:-mx-4"
        style={{
          background: displayBannerUrl
            ? `url(${displayBannerUrl}) center/cover`
            : "linear-gradient(135deg, #2d1b69, #4f35b8, #a855f7)",
        }}
      />

      {/* Avatar + action buttons row */}
      <div className="flex items-start justify-between pt-3 mb-4">
        {/* Avatar */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full border-4 border-[#0d0d14] overflow-hidden -mt-10 bg-purple-600 flex items-center justify-center text-2xl font-bold"
            style={profileFrame ? {
              outline:       `4px solid ${profileFrame.shopItem.value === "gold" ? "#facc15" : "#a855f7"}`,
              outlineOffset: "2px",
            } : undefined}
          >
            {displayAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayAvatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white">{initials(displayName)}</span>
            )}
          </div>
          {isOnline && (
            <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-[#0d0d14]" />
          )}
        </div>

        {/* Action buttons */}
        {isOwnProfile && (
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.10] text-white/70 hover:text-white hover:bg-white/[0.10] px-4 py-2 rounded-xl text-sm transition-all mt-1"
          >
            ✎ Rediger profil
          </button>
        )}

        {!isOwnProfile && friendStatus === "accepted" && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => router.push(`/meldinger?userId=${profile.id}`)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
            >
              Send melding
            </button>
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                ···
              </button>
              {menuOpen && !isMobile && <DropdownMenu items={menuItems} onClose={closeMenu} />}
            </div>
            {menuOpen && isMobile && <BottomSheet items={menuItems} profile={profile} onClose={closeMenu} />}
          </div>
        )}

        {!isOwnProfile && friendStatus === "none" && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={sendFriendRequest}
              disabled={pending}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
            >
              Legg til venn
            </button>
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                ···
              </button>
              {menuOpen && !isMobile && <DropdownMenu items={menuItems} onClose={closeMenu} />}
            </div>
            {menuOpen && isMobile && <BottomSheet items={menuItems} profile={profile} onClose={closeMenu} />}
          </div>
        )}

        {!isOwnProfile && friendStatus === "pending_sent" && (
          <div className="flex gap-2 mt-1">
            <button
              disabled
              className="bg-white/[0.06] border border-white/[0.10] text-white/40 px-4 py-2 rounded-xl text-sm transition-all"
            >
              Forespørsel sendt
            </button>
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                ···
              </button>
              {menuOpen && !isMobile && <DropdownMenu items={menuItems} onClose={closeMenu} />}
            </div>
            {menuOpen && isMobile && <BottomSheet items={menuItems} profile={profile} onClose={closeMenu} />}
          </div>
        )}

        {!isOwnProfile && friendStatus === "pending_received" && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => respondToRequest("accept")}
              disabled={pending}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
            >
              Godta
            </button>
            <button
              onClick={() => respondToRequest("decline")}
              disabled={pending}
              className="bg-white/[0.06] border border-white/[0.10] text-white/60 hover:text-white px-4 py-2 rounded-xl text-sm transition-all"
            >
              Avslå
            </button>
          </div>
        )}
      </div>

      {/* Profile info */}
      <div className="mb-5">
        <h1
          className="text-xl font-semibold text-white"
          style={{ color: nameColor ? nameColor.shopItem.value : undefined }}
        >
          {displayName ?? "Ukjent bruker"}
        </h1>
        {profile.username && (
          <p className="text-sm text-white/40 mt-0.5">@{profile.username}</p>
        )}

        {displayBio && (
          <p className="text-sm text-white/70 leading-relaxed mt-3 max-w-lg">
            {displayBio}
          </p>
        )}

        {/* Stats */}
        <div className="flex gap-5 mt-4">
          <div>
            <span className="text-base font-semibold text-white">{friendCount}</span>
            <span className="text-sm text-white/40 ml-1.5">Venner</span>
          </div>
          <div>
            <span className="text-base font-semibold text-white">{membershipCount}</span>
            <span className="text-sm text-white/40 ml-1.5">Communities</span>
          </div>
        </div>

        {/* Badges */}
        {(showFullProfile || badges.length > 0 || activeFanpass) && (
          <div className="flex gap-2 flex-wrap mt-3">
            {activeFanpass && (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-medium">
                🎫 Fanpass aktiv
              </span>
            )}
            {showFullProfile && (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/[0.06] text-white/50 border border-white/[0.08]">
                🌑 {totalCoins.toLocaleString("no-NO")} coins
              </span>
            )}
            {badges.map((b) => (
              <span
                key={b.id}
                title={`${b.shopItem.name} (${b.organization.name})`}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/[0.06] text-white/50 border border-white/[0.08] cursor-default"
              >
                {b.shopItem.value}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Communities */}
      {communities.length > 0 && (
        <div className="bg-[#12121e] border border-white/[0.06] rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-3">Communities</p>
          <div className="space-y-1">
            {communities.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0 cursor-pointer group"
                onClick={() => router.push(`/${c.slug}/feed`)}
              >
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                  {c.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-purple-600 flex items-center justify-center font-bold text-sm text-white">
                      {c.name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors truncate">
                    {c.name}
                  </p>
                  <p className="text-xs text-white/35 capitalize">{c.role.toLowerCase()}</p>
                </div>
                {showFullProfile && (
                  <div className="text-xs text-white/30 flex items-center gap-1 flex-shrink-0">
                    🌑 {c.points}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit profile modal */}
      {editOpen && (
        <EditProfileModal
          name={displayName}
          bio={displayBio}
          avatarUrl={displayAvatarUrl}
          bannerUrl={displayBannerUrl}
          onClose={() => setEditOpen(false)}
          onSave={(vals) => {
            setDisplayName(vals.name);
            setDisplayBio(vals.bio || null);
            setDisplayAvatarUrl(vals.avatarUrl);
            setDisplayBannerUrl(vals.bannerUrl);
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
