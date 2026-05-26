import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { audit } from "@/lib/audit";

/**
 * POST /api/superadmin/me/switch-role { userType }
 *
 * Superadmin-only snarvei for å bytte sin egen rolle for testing:
 *  • Setter userType (FAN | CREATOR | SPONSOR)
 *  • Hvis SPONSOR: oppretter en SponsorProfile hvis den mangler
 *
 * Bruker må logge ut/inn for at session-JWT'en oppdateres. Returnerer
 * en href som klient kan navigere til etter logout/login.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, isSuperAdmin: true, name: true, username: true },
  });
  if (!user?.isSuperAdmin) return NextResponse.json({ error: "Bare superadmin" }, { status: 403 });

  const { userType } = (await req.json()) as { userType?: string };
  if (!userType || !["FAN", "CREATOR", "SPONSOR"].includes(userType)) {
    return NextResponse.json({ error: "Ugyldig userType" }, { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data:  { userType: userType as "FAN" | "CREATOR" | "SPONSOR" },
  });

  let nextHref = "/home";

  if (userType === "SPONSOR") {
    // Sørg for at vi har en SponsorProfile — opprett en default hvis den mangler.
    // Slug må være unikt, så vi baser det på brukerens username + suffix hvis kollisjon.
    const existing = await db.sponsorProfile.findUnique({ where: { userId: user.id } });
    if (!existing) {
      const baseSlug = (user.username || "test-brand").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
      let slug = baseSlug;
      let tries = 0;
      while (await db.sponsorProfile.findUnique({ where: { slug } })) {
        tries++;
        slug = `${baseSlug}-${tries}`;
        if (tries > 20) break;
      }
      await db.sponsorProfile.create({
        data: {
          userId:      user.id,
          brandName:   user.name ?? "Test Brand",
          slug,
          description: "Test-sponsor opprettet via superadmin.",
        },
      });
    }
    nextHref = "/brand/dashboard";
  }

  void audit({
    actorId: user.id,
    action:  "superadmin.test_role_switch",
    metadata: { newRole: userType },
  });

  return NextResponse.json({ ok: true, nextHref, userType });
}
