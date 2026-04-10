import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { getUserOrg } from "@/server/getUserOrg";

/** GET /api/user/profile — fetch full profile including org username */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const [user, ctx] = await Promise.all([
    db.user.findUnique({
      where:  { id: session.user.id },
      select: { id: true, name: true, email: true, avatarUrl: true, bio: true, website: true, socialLinks: true, status: true },
    }),
    getUserOrg(),
  ]);

  if (!user) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  let membership: { username: string | null; role: string } | null = null;
  if (ctx) {
    membership = await db.membership.findUnique({
      where:  { userId_organizationId: { userId: session.user.id, organizationId: ctx.organizationId } },
      select: { username: true, role: true },
    });
  }

  return NextResponse.json({
    ...user,
    orgUsername: membership?.username ?? null,
    orgType:     ctx?.orgType ?? null,
    orgRole:     membership?.role ?? null,
  });
}

/** PATCH /api/user/profile — update user profile fields */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const body = (await request.json()) as {
    name?:        string;
    bio?:         string;
    website?:     string;
    socialLinks?: Record<string, string>;
    status?:      string;
    avatarUrl?:   string;
    bannerUrl?:   string;
    interests?:   string[];
    isPublic?:    boolean;
    orgUsername?: string;
  };

  const { name, bio, website, socialLinks, status, avatarUrl, bannerUrl, interests, isPublic, orgUsername } = body;

  // Validate status
  const VALID_STATUSES = ["online", "away", "dnd", "invisible"];
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Ugyldig status" }, { status: 400 });
  }

  // Validate website URL
  if (website && website.trim()) {
    try {
      const url = website.startsWith("http") ? website : `https://${website}`;
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Ugyldig nettside-URL" }, { status: 400 });
    }
  }

  console.log("[user/profile] Lagrer:", { userId: session.user.id, name, bio: bio?.substring(0, 30), website, status });
  try {
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(name        !== undefined && { name: name.trim() }),
        ...(bio         !== undefined && { bio: bio.trim() || null }),
        ...(website     !== undefined && { website: website.trim() || null }),
        ...(socialLinks !== undefined && { socialLinks }),
        ...(status      !== undefined && { status }),
        ...(avatarUrl   !== undefined && { avatarUrl }),
        ...(bannerUrl   !== undefined && { bannerUrl }),
        ...(interests   !== undefined && { interests }),
        ...(isPublic    !== undefined && { isPublic }),
      },
      select: { name: true, avatarUrl: true },
    });
    console.log("[user/profile] Lagret OK:", { name: updatedUser.name });

    // Update org-specific username if provided
    if (orgUsername !== undefined) {
      const ctx = await getUserOrg();
      if (ctx) {
        if (orgUsername.trim() && !/^[a-zA-Z0-9_]{1,30}$/.test(orgUsername.trim())) {
          return NextResponse.json({ error: "Ugyldig brukernavn — kun bokstaver, tall og _" }, { status: 400 });
        }
        const newUsername = orgUsername.trim() || null;
        // Check uniqueness
        if (newUsername) {
          const taken = await db.membership.findFirst({
            where: { organizationId: ctx.organizationId, username: newUsername, NOT: { userId: session.user.id } },
          });
          if (taken) return NextResponse.json({ error: "Brukernavnet er allerede tatt" }, { status: 400 });
        }
        await db.membership.update({
          where: { userId_organizationId: { userId: session.user.id, organizationId: ctx.organizationId } },
          data:  { username: newUsername },
        });
      }
    }

    return NextResponse.json({
      success: true,
      user: { name: updatedUser.name, avatarUrl: updatedUser.avatarUrl },
    });
  } catch (error) {
    console.error("[user/profile] PATCH:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
