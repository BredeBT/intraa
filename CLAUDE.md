# Intraa.net — Claude Code context

## Prosjekt
Norsk creator-community-plattform: multi-tenant SaaS. Communities, fanpass, live-streaming, spill, sponsor-marketplace.

## Tech stack
- Next.js 16 App Router, TypeScript strict, Tailwind v4
- Prisma 7 + PostgreSQL (Supabase, EU/Frankfurt)
- NextAuth v5 (pinnet — se Decisions under)
- Cloudflare R2 + Supabase Storage (filer)
- Resend (e-post)
- Upstash Redis (rate-limiting; faller tilbake til in-memory hvis env mangler)
- Capacitor (planlagt native app via WebView-wrapper)
- Deploy: Vercel

## Mappestruktur
src/app/          → Next.js ruter (App Router)
src/server/       → Server-only kode (Prisma, server actions)
src/lib/          → Delte utilities (audit, rateLimit, safeUrl, webpush, ...)
src/components/   → Delte React-komponenter
src/hooks/        → Klient-hooks
prisma/           → schema.prisma

## Regler
1. TypeScript strict — ingen `any`
2. Server Components by default
3. Server Actions for mutasjoner (eller route handlers under /api)
4. Push direkte til main med mindre annet er bedt
5. Spør hvis scope er uklart

## Decisions (viktige tekniske valg)

**NextAuth pinnet til 5.0.0-beta.30**
- v5 er fortsatt i beta (forskjellig API enn v4 stable)
- Migrering til v4 ville koste ~50-100 file-endringer for marginal gevinst
- Vi pinner derfor eksakt versjon (uten `^`) så vi ikke får uventede beta-bumps
- Monitor https://github.com/nextauthjs/next-auth/releases for stable v5

**Rate-limiting via Upstash Redis**
- `lib/rateLimit.ts` faller tilbake til in-memory hvis UPSTASH_*-env mangler
- Sett `UPSTASH_REDIS_REST_URL` og `UPSTASH_REDIS_REST_TOKEN` i Vercel for distribuert telling
- Uten Upstash er rate-limit per Vercel-instans (kan omgås av angriper)

**Audit log**
- `lib/audit.ts` brukes for alle admin-actions (hide/delete posts/comments, ban/unban, join-request approve/reject, org-settings)
- Skrives fire-and-forget — knekker aldri hoved-handlingen hvis DB feiler
- Vises i /admin/aktivitet for OWNER/ADMIN

**XSS / CSP**
- Alle user-input URLer går gjennom `lib/safeUrl.ts` (kun http/https/mailto)
- CSP-header satt i next.config.ts (frame-ancestors 'none', object-src 'none', osv)
- 'unsafe-inline' tillatt på script-src pga inline theme-bootstrap — TODO: nonce-basert
