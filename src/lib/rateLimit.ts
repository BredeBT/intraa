import { NextRequest, NextResponse } from "next/server";

/**
 * Enkel in-memory rate-limiter. Bra nok for å hindre trivielle brute-force
 * og enumeration-angrep. Per Vercel-instance så ikke perfekt — på sikt
 * burde dette flyttes til Redis/Upstash for konsistent global rate limit.
 *
 * Bruk:
 *   const limited = rateLimit(req, { key: "check-email", max: 10, windowMs: 60_000 });
 *   if (limited) return limited;  // 429-respons
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  // Vercel/proxier setter X-Forwarded-For; fall back til x-real-ip eller en
  // statisk streng (sammen-pulle alle ikke-identifiserte).
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
 */
export function rateLimit(req: NextRequest, opts: RateLimitOptions): NextResponse | null {
  const ip      = getClientIp(req);
  const bucketKey = `${opts.key}:${ip}`;
  const now     = Date.now();
  const bucket  = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  if (bucket.count >= opts.max) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "For mange forsøk. Prøv igjen om litt." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  bucket.count++;
  return null;
}

/** Periodisk opprydding så vi ikke lekker minne på prod. */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();
