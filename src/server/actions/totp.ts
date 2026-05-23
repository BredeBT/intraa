"use server";

import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/server/db";

const TOTP_OPTS = { step: 30, digits: 6, window: 1 } as const;

const APP_NAME = "Intraa";

/**
 * Generer (eller hent) et midlertidig TOTP-secret for innlogget bruker.
 * Lagrer det på user-rowen, men markerer ikke 2FA som aktivert ennå.
 * Returnerer secret + QR-kode-data-URL slik at UI kan vise begge.
 */
export async function setupTotp(): Promise<
  | { success: true; secret: string; qrDataUrl: string; otpauthUrl: string }
  | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Ikke innlogget" };

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { email: true, totpEnabled: true, totpSecret: true },
  });
  if (!user) return { success: false, error: "Bruker ikke funnet" };
  if (user.totpEnabled) return { success: false, error: "2FA er allerede aktivert" };

  // Bruk eksisterende ufullstendige secret hvis brukeren har startet setup men
  // ikke fullført — slik at man ikke ender opp med flere QR-koder i Authenticator.
  const secret = user.totpSecret ?? generateSecret();

  if (!user.totpSecret) {
    await db.user.update({ where: { id: session.user.id }, data: { totpSecret: secret } });
  }

  const otpauthUrl = generateURI({
    label:   user.email,
    issuer:  APP_NAME,
    secret,
    digits:  TOTP_OPTS.digits,
    period:  TOTP_OPTS.step,
  });
  const qrDataUrl  = await QRCode.toDataURL(otpauthUrl, { width: 280, margin: 1 });

  return { success: true, secret, qrDataUrl, otpauthUrl };
}

/**
 * Bekreft TOTP-koden brukeren skannet og slå på 2FA.
 */
export async function enableTotp(code: string): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Ikke innlogget" };

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { totpSecret: true, totpEnabled: true },
  });
  if (!user) return { success: false, error: "Bruker ikke funnet" };
  if (user.totpEnabled) return { success: false, error: "2FA er allerede aktivert" };
  if (!user.totpSecret) return { success: false, error: "Kjør setupTotp først" };

  const cleanCode = code.replace(/\s/g, "");
  const result = verifySync({ token: cleanCode, secret: user.totpSecret, ...TOTP_OPTS });
  if (!result.valid) return { success: false, error: "Feil kode. Prøv igjen." };

  await db.user.update({
    where: { id: session.user.id },
    data:  { totpEnabled: true, totpEnabledAt: new Date() },
  });

  return { success: true };
}

/**
 * Slå av 2FA. Krever passord-bekreftelse fordi det er en sikkerhetssensitiv
 * handling — beskyttelse hvis noen har stjålet en åpen session.
 */
export async function disableTotp(password: string): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Ikke innlogget" };

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { password: true, totpEnabled: true },
  });
  if (!user?.password) return { success: false, error: "Bruker ikke funnet" };
  if (!user.totpEnabled) return { success: false, error: "2FA er ikke aktivert" };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return { success: false, error: "Feil passord" };

  await db.user.update({
    where: { id: session.user.id },
    data:  { totpEnabled: false, totpSecret: null, totpEnabledAt: null },
  });

  return { success: true };
}

