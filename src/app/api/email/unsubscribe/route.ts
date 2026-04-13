import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/server/db";

/** Build a deterministic token from userId + secret so we don't need to store it. */
function buildUnsubToken(userId: string) {
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-secret";
  return crypto.createHmac("sha256", secret).update(userId).digest("hex");
}

/**
 * GET /api/email/unsubscribe?token=<hmac>&id=<userId>
 * Sets emailConsent = false and redirects to /avmeldt.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id    = searchParams.get("id");
  const token = searchParams.get("token");

  if (!id || !token) {
    return NextResponse.redirect(new URL("/avmeldt?error=1", request.url));
  }

  const expected = buildUnsubToken(id);
  if (token !== expected) {
    return NextResponse.redirect(new URL("/avmeldt?error=1", request.url));
  }

  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return NextResponse.redirect(new URL("/avmeldt?error=1", request.url));
  }

  await db.user.update({ where: { id }, data: { emailConsent: false } });

  return NextResponse.redirect(new URL("/avmeldt", request.url));
}
