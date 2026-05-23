import { verifySync } from "otplib";

const TOTP_OPTS = { step: 30, digits: 6, window: 1 } as const;

/**
 * Verifiser en TOTP-kode mot et lagret secret. Brukt av login-flowen.
 */
export function verifyTotpCode(code: string, secret: string): boolean {
  if (!code || !secret) return false;
  const cleanCode = code.replace(/\s/g, "");
  try {
    const result = verifySync({ token: cleanCode, secret, ...TOTP_OPTS });
    return result.valid;
  } catch {
    return false;
  }
}
