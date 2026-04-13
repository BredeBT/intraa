import crypto from "crypto";
import { resend, EMAIL_FROM } from "./resend";
import { render }             from "@react-email/render";
import { WelcomeEmail }       from "@/emails/WelcomeEmail";
import { PasswordResetEmail } from "@/emails/PasswordResetEmail";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://intraa.net";

function unsubUrl(userId: string) {
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-secret";
  const token  = crypto.createHmac("sha256", secret).update(userId).digest("hex");
  return `${BASE_URL}/api/email/unsubscribe?id=${userId}&token=${token}`;
}

export async function sendWelcomeEmail(to: string, name: string, userId?: string) {
  const html = await render(WelcomeEmail({ name, unsubUrl: userId ? unsubUrl(userId) : `${BASE_URL}/avmeldt` }));
  await resend.emails.send({
    from:    EMAIL_FROM,
    to,
    subject: "Velkommen til Intraa!",
    html,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, resetToken: string) {
  const resetUrl = `${BASE_URL}/tilbakestill-passord?token=${resetToken}`;
  const html     = await render(PasswordResetEmail({ name, resetUrl }));
  await resend.emails.send({
    from:    EMAIL_FROM,
    to,
    subject: "Tilbakestill passordet ditt — Intraa",
    html,
  });
}

/** Send bulk marketing email in batches of 50 (Resend limit). */
export async function sendMarketingEmail(to: string[], subject: string, html: string) {
  for (let i = 0; i < to.length; i += 50) {
    await resend.emails.send({
      from:    EMAIL_FROM,
      to:      to.slice(i, i + 50),
      subject,
      html,
    });
  }
}
