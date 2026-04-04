# Intraa.net — Claude Code context

## Prosjekt
Multi-tenant SaaS: bedriftsintranet + creator community.

## Tech stack
- Next.js 14 App Router, TypeScript strict, Tailwind CSS
- Prisma + PostgreSQL (Supabase), Redis, Cloudflare R2
- NextAuth.js (legges til Fase 4 — ikke nå)
- Deploy: Vercel

## Mappestruktur
src/app/          → Next.js ruter
src/features/     → En mappe per feature (feed, chat, tickets, files, members)
src/lib/          → Delte utilities
src/server/       → Server-only kode (Prisma client etc.)
prisma/           → schema.prisma

## Regler
1. Aldri legg til auth uten at jeg ber om det
2. Én feature om gangen
3. TypeScript strict — ingen any
4. Server Components by default
5. Server Actions for alle data-mutasjoner
6. Spør hvis scope er uklart

## Nåværende fase
Fase 2 — Core UI med mock-data, ingen database ennå
