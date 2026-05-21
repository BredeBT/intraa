import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { validateUsername } from "@/lib/bannedUsernames";
import { sendWelcomeEmail } from "@/lib/email";

function brandSlugify(s: string) {
  return s.trim().toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      name?:        string;
      username?:    string;
      email?:       string;
      password?:    string;
      userType?:    "FAN" | "CREATOR" | "SPONSOR";
      // SPONSOR-only fields
      brandName?:        string;
      brandWebsite?:     string;
      brandDescription?: string;
    };

    const { name, username, email, password, userType = "FAN",
            brandName, brandWebsite, brandDescription } = body;

    if (!name?.trim() || !username || !email?.trim() || !password) {
      return NextResponse.json({ error: "Mangler påkrevde felt" }, { status: 400 });
    }

    if (userType === "SPONSOR" && !brandName?.trim()) {
      return NextResponse.json({ error: "Brand-navn er påkrevd for sponsor-kontoer" }, { status: 400 });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json({ error: "Passordet oppfyller ikke kravene" }, { status: 400 });
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json({ error: usernameValidation.error }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();

    const [existingEmail, existingUsername] = await Promise.all([
      db.user.findUnique({ where: { email: emailLower }, select: { id: true } }),
      db.user.findUnique({ where: { username },          select: { id: true } }),
    ]);

    if (existingEmail)    return NextResponse.json({ error: "E-posten er allerede registrert" },   { status: 409 });
    if (existingUsername) return NextResponse.json({ error: "Brukernavnet er allerede tatt" },      { status: 409 });

    // If sponsor, generate a unique brand slug
    let sponsorSlug: string | null = null;
    if (userType === "SPONSOR" && brandName) {
      const baseSlug = brandSlugify(brandName) || "brand";
      sponsorSlug = baseSlug;
      let suffix = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const taken = await db.sponsorProfile.findUnique({ where: { slug: sponsorSlug }, select: { id: true } });
        if (!taken) break;
        suffix += 1;
        sponsorSlug = `${baseSlug}-${suffix}`;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        email:           emailLower,
        name:            name.trim(),
        username,
        password:        passwordHash,
        termsAcceptedAt: new Date(),
        userType,
        ...(userType === "SPONSOR" && sponsorSlug && brandName ? {
          sponsorProfile: {
            create: {
              brandName:   brandName.trim(),
              slug:        sponsorSlug,
              website:     brandWebsite?.trim() || null,
              description: brandDescription?.trim() || null,
            },
          },
        } : {}),
      },
    });

    // Fire-and-forget welcome email — never block registration on email failure
    sendWelcomeEmail(emailLower, name.trim(), user.id).catch((err) =>
      console.error("[Email] Kunne ikke sende velkomst-epost:", err)
    );

    return NextResponse.json({ success: true, email: emailLower, userType });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Noe gikk galt. Prøv igjen." }, { status: 500 });
  }
}
