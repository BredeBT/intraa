"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { UserPlus, UserCheck, MessageSquare, Pencil, Globe, ExternalLink, MoreVertical, X } from "lucide-react";

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
  badges:          Badge[];
  nameColor:       { shopItem: { value: string } } | null;
  profileFrame:    { shopItem: { value: string } } | null;
  totalCoins:      number;
  activeFanpass:   { organization: { name: string } } | null;
}

function initials(name: string | null) {
  return (name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  website: Globe,
  default: ExternalLink,
};

// ── Three-dots menu ──────────────────────────────────────────────────────────

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
      className="absolute right-0 top-8 z-50 min-w-[180px] rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/40"
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && <div className="my-1 border-t border-zinc-800" />}
          <button
            onClick={() => { item.onClick(); onClose(); }}
            className={`w-full px-4 py-2.5 text-left text-sm transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-zinc-800 ${
              item.danger ? "text-red-400 hover:text-red-300" : "text-zinc-200"
            }`}
          >
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}

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
    // trigger enter animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />

      {/* Sheet */}
      <div
        className={`relative z-10 rounded-t-2xl border-t border-zinc-800 bg-zinc-900 pb-safe transition-transform duration-250 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-zinc-700" />
        </div>

        {/* User context */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
              {initials(profile.name)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-white">{profile.name ?? "Ukjent"}</p>
            {profile.username && <p className="text-xs text-zinc-500">@{profile.username}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="py-2">
          {items.map((item, i) => (
            <div key={i}>
              {item.divider && <div className="my-1 border-t border-zinc-800" />}
              <button
                onClick={() => { item.onClick(); close(); }}
                className={`flex w-full items-center px-5 py-3.5 text-sm font-medium transition-colors active:bg-zinc-800 min-h-[52px] ${
                  item.danger ? "text-red-400" : "text-zinc-100"
                }`}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>

        {/* Cancel */}
        <div className="px-4 pb-4">
          <button
            onClick={close}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-3.5 text-sm font-medium text-zinc-300 min-h-[52px]"
          >
            <X className="h-4 w-4" /> Avbryt
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
  badges        = [],
  nameColor     = null,
  profileFrame  = null,
  totalCoins    = 0,
  activeFanpass = null,
}: Props) {
  const [friendStatus,  setFriendStatus]  = useState<FriendStatus>(initialStatus);
  const [friendshipId,  setFriendshipId]  = useState<string | null>(initialFriendshipId);
  const [pending,       start]            = useTransition();
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [isMobile,      setIsMobile]      = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    // TODO: implement report flow
    alert("Rapporten din er mottatt. Vi vil se på saken.");
  }

  // Build menu items based on friendship status
  const menuItems: MenuItem[] = [];

  if (friendStatus === "accepted") {
    menuItems.push({ label: "Send melding",  onClick: () => { window.location.href = `/meldinger?userId=${profile.id}`; } });
    menuItems.push({ label: "Fjern venn",    onClick: removeFriend });
    menuItems.push({ label: "Rapporter bruker", danger: true, divider: true, onClick: reportUser });
  } else if (friendStatus === "none") {
    menuItems.push({ label: "Send venneforespørsel", onClick: sendFriendRequest });
    menuItems.push({ label: "Rapporter bruker", danger: true, divider: true, onClick: reportUser });
  } else if (friendStatus === "pending_sent") {
    menuItems.push({ label: "Trekk tilbake forespørsel", onClick: withdrawRequest });
    menuItems.push({ label: "Rapporter bruker", danger: true, divider: true, onClick: reportUser });
  } else {
    // pending_received — keep accept/decline as explicit buttons, only show report in menu
    menuItems.push({ label: "Rapporter bruker", danger: true, onClick: reportUser });
  }

  const socialEntries = Object.entries(profile.socialLinks ?? {}).filter(([, v]) => v);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Banner */}
      <div
        className="relative h-40 w-full rounded-b-none"
        style={
          profile.bannerUrl
            ? { backgroundImage: `url(${profile.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)" }
        }
      >
        {/* Avatar */}
        <div className="absolute -bottom-10 left-6">
          <div
            className="rounded-full"
            style={profileFrame ? {
              outline:       `4px solid ${profileFrame.shopItem.value === "gold" ? "#facc15" : "#a855f7"}`,
              outlineOffset: "2px",
            } : undefined}
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-zinc-700 bg-violet-600 text-2xl font-bold text-white">
                {initials(profile.name)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header info */}
      <div className="mt-12 px-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1
              className="text-xl font-bold text-white"
              style={{ color: nameColor ? nameColor.shopItem.value : undefined }}
            >
              {profile.name ?? "Ukjent bruker"}
            </h1>
            {profile.username && (
              <p className="text-sm text-zinc-500">@{profile.username}</p>
            )}
            {badges.length > 0 && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {badges.map((b) => (
                  <span
                    key={b.id}
                    title={`${b.shopItem.name} (${b.organization.name})`}
                    className="text-lg cursor-default"
                  >
                    {b.shopItem.value}
                  </span>
                ))}
              </div>
            )}
            {showFullProfile && (
              <p className="text-sm text-zinc-400 mt-1">
                🪙 {totalCoins.toLocaleString("no-NO")} coins totalt
              </p>
            )}
            {showFullProfile && activeFanpass && (
              <span className="inline-block mt-1 text-xs bg-violet-600/20 text-violet-300 border border-violet-600/30 rounded-full px-2 py-0.5">
                🎫 Fanpass aktiv – {activeFanpass.organization.name}
              </span>
            )}
            {profile.bio && (
              <p className="mt-2 max-w-md text-sm text-zinc-300">{profile.bio}</p>
            )}
            <p className="mt-1 text-xs text-zinc-600">{friendCount} venner</p>
          </div>

          {/* Action area */}
          <div className="flex shrink-0 items-center gap-2">
            {isOwnProfile ? (
              <Link
                href="/innstillinger"
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" /> Rediger profil
              </Link>
            ) : (
              <>
                {/* Primary CTA */}
                {friendStatus === "accepted" && (
                  <Link
                    href={`/meldinger?userId=${profile.id}`}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:opacity-80"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Send melding
                  </Link>
                )}
                {friendStatus === "none" && (
                  <button
                    onClick={sendFriendRequest}
                    disabled={pending}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:opacity-80 disabled:opacity-50"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Legg til venn
                  </button>
                )}
                {friendStatus === "pending_sent" && (
                  <button
                    disabled
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 opacity-70"
                  >
                    <UserCheck className="h-3.5 w-3.5" /> Forespørsel sendt
                  </button>
                )}
                {friendStatus === "pending_received" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondToRequest("accept")}
                      disabled={pending}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-80 disabled:opacity-50"
                    >
                      Godta
                    </button>
                    <button
                      onClick={() => respondToRequest("decline")}
                      disabled={pending}
                      className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-50"
                    >
                      Avslå
                    </button>
                  </div>
                )}

                {/* Three-dots menu */}
                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                    aria-label="Flere valg"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {menuOpen && !isMobile && (
                    <DropdownMenu items={menuItems} onClose={closeMenu} />
                  )}
                </div>

                {menuOpen && isMobile && (
                  <BottomSheet items={menuItems} profile={profile} onClose={closeMenu} />
                )}
              </>
            )}
          </div>
        </div>

        {/* Interests */}
        {profile.interests.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {profile.interests.map((tag) => (
              <span key={tag} className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 px-6 pb-10">
        {/* Communities */}
        {communities.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Communities</h2>
            <div className="flex flex-col gap-2">
              {communities.map((c) => (
                <Link
                  key={c.id}
                  href={`/${c.slug}/feed`}
                  className="flex items-center gap-3 rounded-xl bg-zinc-900 p-3 transition-colors hover:bg-zinc-800"
                >
                  {c.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
                      {c.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{c.name}</p>
                    {showFullProfile && (
                      <p className="text-xs text-zinc-500">{c.role} · {c.points} coins</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Social links */}
        {socialEntries.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Lenker</h2>
            <div className="flex flex-col gap-2">
              {socialEntries.map(([platform, url]) => {
                const Icon = SOCIAL_ICONS[platform] ?? ExternalLink;
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm text-zinc-400 transition-colors hover:text-white"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{url}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
