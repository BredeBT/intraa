import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { TAG_BY_SLUG } from "@/lib/creatorTags";

export const dynamic = "force-dynamic";

/**
 * GET /api/creators/search?q=&tags=streamer,gaming&limit=
 * Liste over creators, filtrerbar på tag(s) og navn-søk. Tilgang krever bare
 * pålogget bruker — sponsor-rollen er ikke påkrevd siden creator-profiler er
 * offentlige (samme som /u/[username]).
 *
 * Returnerer kun CREATOR-userType-brukere med isPublic = true.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const q       = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const tagsRaw = req.nextUrl.searchParams.get("tags") ?? "";
  const limit   = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") ?? "30", 10), 1), 100);

  // Valider tag-slugs mot kuratert liste — ignorer søppel
  const tags = tagsRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s in TAG_BY_SLUG);

  const creators = await db.user.findMany({
    where: {
      userType: "CREATOR",
      isPublic: true,
      ...(q ? {
        OR: [
          { name:     { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
      ...(tags.length > 0 ? {
        creatorTags: { hasSome: tags },
      } : {}),
    },
    select: {
      id:           true,
      name:         true,
      username:     true,
      avatarUrl:    true,
      bio:          true,
      creatorTags:  true,
      // Antall communities de driver (som eier)
      memberships: {
        where:  { role: "OWNER", organization: { type: "COMMUNITY" } },
        select: {
          organization: { select: { id: true, name: true, slug: true, _count: { select: { memberships: true } } } },
        },
      },
    },
    orderBy: [
      // Creators med flest tags først (mer komplette profiler)
      { createdAt: "desc" },
    ],
    take: limit,
  });

  return NextResponse.json({
    creators: creators.map((c) => ({
      id:        c.id,
      name:      c.name,
      username:  c.username,
      avatarUrl: c.avatarUrl,
      bio:       c.bio?.replace(/<[^>]+>/g, "").slice(0, 140) ?? null,
      tags:      c.creatorTags,
      communities: c.memberships.map((m) => ({
        id:           m.organization.id,
        name:         m.organization.name,
        slug:         m.organization.slug,
        memberCount:  m.organization._count.memberships,
      })),
    })),
  });
}
