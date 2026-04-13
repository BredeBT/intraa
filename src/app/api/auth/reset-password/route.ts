import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { token?: string; password?: string };
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ error: "Mangler token eller passord" }, { status: 400 });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: "Passordet må være minst 8 tegn med minst én stor bokstav, ett tall og ett spesialtegn" },
        { status: 400 }
      );
    }

    const user = await db.user.findFirst({
      where: {
        passwordResetToken:   token,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Ugyldig eller utløpt lenke" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);

    await db.user.update({
      where: { id: user.id },
      data:  {
        password:            hashed,
        passwordResetToken:   null,
        passwordResetExpires: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Auth] reset-password error:", err);
    return NextResponse.json({ error: "Noe gikk galt. Prøv igjen." }, { status: 500 });
  }
}
