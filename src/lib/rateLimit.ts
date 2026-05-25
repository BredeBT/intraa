import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Distribuert rate-limiter via Upstash Redis.
 *
 * Fall-back: hvis UPSTASH_REDIS_REST_URL/TOKEN ikke er satt (typisk i dev),
 * bruker vi en in-memory teller per Vercel-instans. Det er IKKE sikkert i
 * produksjon — flere serverless-instanser deler ikke state og angripere
 * kan omgå limits ved å spamme på tvers. Sett env-varene i prod.
 *
 * Bruk:
 *   const limited = await rateLimit(req, { key: "check-email", max: 10, windowMs: 60_000 });
 *   if (limited) return limited;  // 429-respons
 */

// ─── Upstash-instans (deles på tvers av kall) ────────────────────────────────

const redisUrl   = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis: Redis | null = redisUrl && redisToken
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

// Vi cacher Ratelimit-instanser per (max, windowMs)-kombo så vi ikke
// reinstantierer dem på hvert kall.
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(max: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const cacheKey = `${max}:${windowMs}`;
  let limiter = limiterCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter:  Ratelimit.slidingWindow(max, `${windowMs} ms`),
      analytics: false,
      prefix:    "intraa:rl",
    });
    limiterCache.set(cacheKey, limiter);
  }
  return limiter;
}

// ─── In-memory fallback (kun dev) ────────────────────────────────────────────

const memBuckets = new Map<string, { count: number; resetAt: number }>();

function memLimit(bucketKey: string, max: number, windowMs: number): { ok: boolean; resetAt: number } {
  const now    = Date.now();
  const bucket = memBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt < now) {
    memBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { ok: true, resetAt: now + windowMs };
  }
  if (bucket.count >= max) return { ok: false, resetAt: bucket.resetAt };
  bucket.count++;
  return { ok: true, resetAt: bucket.resetAt };
}

// Periodisk opprydding så vi ikke lekker minne på prod
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memBuckets) {
      if (bucket.resetAt < now) memBuckets.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}

// ─── Public API ──────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export interface RateLimitOptions {
  /** Identifikator for endepunktet (slik at limits ikke deles på tvers). */
  key:      string;
  /** Maks antall requests per vindu. */
  max:      number;
  /** Vindu-lengde i ms. */
  windowMs: number;
}

/**
 * Returnerer null hvis OK, eller en 429-NextResponse hvis grensen er nådd.
 * Async fordi Upstash-kallet er over nett — typisk <5 ms.
 */
export async function rateLimit(req: NextRequest, opts: RateLimitOptions): Promise<NextResponse | null> {
  const ip        = getClientIp(req);
  const bucketKey = `${opts.key}:${ip}`;

  const limiter = getLimiter(opts.max, opts.windowMs);
  if (limiter) {
    try {
      const result = await limiter.limit(bucketKey);
      if (!result.success) {
        const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
        return NextResponse.json(
          { error: "For mange forsøk. Prøv igjen om litt." },
          { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } },
        );
      }
      return null;
    } catch (err) {
      // Hvis Upstash er nede skal vi ikke knekke hele endepunktet —
      // logg og fall tilbake til in-memory så vi har EN form for limit.
      console.warn("[rateLimit] Upstash failed, falling back to memory:", err);
    }
  }

  const memResult = memLimit(bucketKey, opts.max, opts.windowMs);
  if (!memResult.ok) {
    const retryAfter = Math.ceil((memResult.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "For mange forsøk. Prøv igjen om litt." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } },
    );
  }
  return null;
}
