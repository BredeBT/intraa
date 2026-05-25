import type { NextConfig } from "next";

/**
 * Security headers — strenge defaults med pragmatiske unntak.
 *
 * CSP-merknad: vi tillater 'unsafe-inline' på script-src fordi vi har en
 * hardkodet inline theme-bootstrap-script i app/layout.tsx for å unngå FOUC.
 * Den ideelle løsningen er å sette en nonce via middleware og bytte til
 * 'nonce-XXX' i CSP — TODO når vi har tid. Inntil da: scriptet er
 * hardkodet uten user-input, så reell XSS-risiko er lav.
 *
 * Andre direktiver er stramme:
 *  - frame-ancestors 'none' — clickjacking-vern
 *  - object-src 'none' — ingen Flash/applets
 *  - base-uri 'self' — hindre base-tag-injection
 *  - form-action 'self' — formularer kan kun POSTe til vårt domene
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://www.twitch.tv https://www.youtube.com https://player.twitch.tv",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy",   value: CSP_DIRECTIVES },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(self), microphone=(self), geolocation=()" },
  { key: "X-DNS-Prefetch-Control",    value: "on" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
