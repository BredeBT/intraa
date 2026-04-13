import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { validateUsername } from "@/lib/bannedUsernames";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      name?:     string;
      username?: string;
      email?:    string;
      password?: string;
    };

    const { name, username, email, password } = body;

    if (!name?.trim() || !username || !email?.trim() || !password) {
      return NextResponse.json({ error: "Mangler påkrevde felt" }, { status: 400 });
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

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        email:           emailLower,
        name:            name.trim(),
        username,
        password:        passwordHash,
        termsAcceptedAt: new Date(),
      },
    });

    // Fire-and-forget welcome email — never block registration on email failure
    sendWelcomeEmail(emailLower, name.trim(), user.id).catch((err) =>
      console.error("[Email] Kunne ikke sende velkomst-epost:", err)
    );

    return NextResponse.json({ success: true, email: emailLower });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Noe gikk galt. Prøv igjen." }, { status: 500 });
  }
}
