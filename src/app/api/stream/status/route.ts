import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export interface StreamStatus {
  isLive:       boolean;
  title:        string;
  viewerCount:  number;
  thumbnailUrl: string | null;
  platform:     "twitch" | "youtube" | null;
}

// ─── In-memory cache (per-org, 30 s) ─────────────────────────────────────────

const cache = new Map<string, { data: StreamStatus; expiresAt: number }>();

function getCached(orgId: string): StreamStatus | null {
  const entry = cache.get(orgId);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  cache.delete(orgId);
  return null;
}

function setCached(orgId: string, data: StreamStatus) {
  cache.set(orgId, { data, expiresAt: Date.now() + 30_000 });
}

// ─── Twitch ───────────────────────────────────────────────────────────────────

let twitchToken: { token: string; expiresAt: number } | null = null;

async function getTwitchToken(): Promise<string | null> {
  if (twitchToken && twitchToken.expiresAt > Date.now()) return twitchToken.token;

  const clientId     = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn("[stream/status] TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET missing in .env.local");
    return null;
  }

  const body = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    grant_type:    "client_credentials",
  });
  const res = await fetch("https://id.twitch.tv/oauth2/token", { method: "POST", body });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; message?: string };
  if (!res.ok || !data.access_token) {
    console.error("[stream/status] Twitch token error:", data);
    return null;
  }

  twitchToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000 };
  return twitchToken.token;
}

async function checkTwitch(channel: string): Promise<StreamStatus> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const token    = await getTwitchToken();
  if (!clientId || !token) return { isLive: false, title: "", viewerCount: 0, thumbnailUrl: null, platform: "twitch" };

  const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`, {
    headers: { "Client-ID": clientId, "Authorization": `Bearer ${token}` },
  });
  const data = (await res.json()) as { data?: { title: string; viewer_count: number; thumbnail_url: string }[]; message?: string };
  if (!res.ok || !data.data) {
    console.error("[stream/status] Twitch streams error:", data);
    return { isLive: false, title: "", viewerCount: 0, thumbnailUrl: null, platform: "twitch" };
  }

  console.log(`[stream/status] Twitch channel="${channel}" isLive=${data.data.length > 0}`);
  const stream = data.data[0];
  if (!stream) return { isLive: false, title: "", viewerCount: 0, thumbnailUrl: null, platform: "twitch" };

  return {
    isLive:       true,
    title:        stream.title,
    viewerCount:  stream.viewer_count,
    thumbnailUrl: stream.thumbnail_url.replace("{width}", "640").replace("{height}", "360"),
    platform:     "twitch",
  };
}

// ─── YouTube ──────────────────────────────────────────────────────────────────

async function checkYouTube(channelId: string): Promise<StreamStatus> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { isLive: false, title: "", viewerCount: 0, thumbnailUrl: null, platform: "youtube" };

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}&eventType=live&type=video&key=${apiKey}`;
  const res  = await fetch(url);
  if (!res.ok) return { isLive: false, title: "", viewerCount: 0, thumbnailUrl: null, platform: "youtube" };

  const data = (await res.json()) as {
    items: { id: { videoId: string }; snippet: { title: string; thumbnails: { high: { url: string } } } }[]
  };
  const item = data.items[0];
  if (!item) return { isLive: false, title: "", viewerCount: 0, thumbnailUrl: null, platform: "youtube" };

  return {
    isLive:      true,
    title:       item.snippet.title,
    viewerCount: 0, // requires liveBroadcast.list which needs OAuth
    thumbnailUrl: item.snippet.thumbnails.high.url,
    platform:    "youtube",
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

  const cached = getCached(orgId);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  }

  const settings = await db.streamSettings.findUnique({ where: { organizationId: orgId } });
  if (!settings) {
    const result: StreamStatus = { isLive: false, title: "", viewerCount: 0, thumbnailUrl: null, platform: null };
    return NextResponse.json(result);
  }

  let status: StreamStatus;
  try {
    if (settings.preferredPlatform === "youtube" && settings.youtubeChannel) {
      status = await checkYouTube(settings.youtubeChannel);
    } else if (settings.twitchChannel) {
      status = await checkTwitch(settings.twitchChannel);
    } else {
      status = { isLive: false, title: "", viewerCount: 0, thumbnailUrl: null, platform: null };
    }
  } catch {
    status = { isLive: false, title: "", viewerCount: 0, thumbnailUrl: null, platform: null };
  }

  // Reconcile StreamSession records with actual live status
  try {
    if (status.isLive) {
      // Ensure exactly one open session exists
      const existing = await db.streamSession.findFirst({
        where: { organizationId: orgId, endedAt: null },
      });
      if (!existing) {
        await db.streamSession.create({ data: { organizationId: orgId } });
      }
    } else {
      // Always close stale sessions when stream is confirmed offline
      await db.streamSession.updateMany({
        where: { organizationId: orgId, endedAt: null },
        data:  { endedAt: new Date() },
      });
    }
  } catch { /* non-critical — don't fail the response */ }

  setCached(orgId, status);
  return NextResponse.json(status, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
