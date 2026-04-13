import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/server/db";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "E-post er påkrevd" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where:  { email },
      select: { id: true, name: true, email: true, emailConsent: true },
    });

    // Always return success to prevent user enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token   = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.user.update({
      where: { id: user.id },
      data:  { passwordResetToken: token, passwordResetExpires: expires },
    });

    await sendPasswordResetEmail(user.email, user.name ?? "bruker", token);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Auth] forgot-password error:", err);
    return NextResponse.json({ error: "Noe gikk galt. Prøv igjen." }, { status: 500 });
  }
}
