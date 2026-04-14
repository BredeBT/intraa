import { Resend } from "resend";

// Lazy singleton — avoids "Missing API key" crash during `next build`
// when env vars are not available at module-evaluation time.
let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY ?? "placeholder");
  }
  return _resend;
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@intraa.net";
