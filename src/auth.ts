import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { db } from "@/server/db";
import { verifyTotpCode } from "@/lib/totp";
import { readGeoFromHeaders, recordLoginEvent } from "@/lib/loginEvents";
import { rateLimitByBucket } from "@/lib/rateLimit";
import { authConfig } from "./auth.config";

// Spesifikke feilkoder slik at login-UI kan vise riktig melding
class TotpRequiredError extends CredentialsSignin { code = "totp_required"; }
class TotpInvalidError  extends CredentialsSignin { code = "totp_invalid";  }
class RateLimitedError  extends CredentialsSignin { code = "rate_limited";  }

declare module "next-auth" {
  interface User {
    isSuperAdmin?: boolean;
    username?:     string | null;
    userType?:     "FAN" | "CREATOR" | "SPONSOR";
  }
  interface Session {
    user: DefaultSession["user"] & {
      id:          string;
      isSuperAdmin: boolean;
      username:    string | null;
      userType:    "FAN" | "CREATOR" | "SPONSOR";
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    isSuperAdmin?: boolean;
    username?:     string | null;
    userType?:     "FAN" | "CREATOR" | "SPONSOR";
  }
}

const nextAuthResult = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      credentials: {
        email:    { label: "E-post",  type: "email" },
        password: { label: "Passord", type: "password" },
        totp:     { label: "2FA-kode", type: "text" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const emailRaw = String(credentials.email).toLowerCase();

        // Rate-limit FØR bcrypt-compare. Brute-force / credential-stuffing
        // forsvar: to bøtter — én per IP (mot bred angrep), én per e-post
        // (mot målrettet angrep der angriper roterer IP). bcrypt cost 12
        // tar ~250ms per gjetting; uten throttle kan en angriper kjøre så
        // raskt CPUen tillater.
        //
        // - IP-bøtte: 30/5 min — romslig nok til legitime brukere som
        //   skriver feil passord noen ganger, stramt nok til å gjøre
        //   brute-force upraktisk
        // - E-post-bøtte: 10/15 min — stopper målrettet angrep mot én
        //   konto selv om IP roterer
        const ipHdr = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim()
                   ?? request?.headers?.get("x-real-ip")
                   ?? "unknown";
        const ipResult    = await rateLimitByBucket(`login-ip:${ipHdr}`,       30, 5  * 60_000);
        const emailResult = await rateLimitByBucket(`login-email:${emailRaw}`, 10, 15 * 60_000);
        if (!ipResult.ok || !emailResult.ok) {
          throw new RateLimitedError();
        }

        const user = await db.user.findUnique({
          where: { email: emailRaw },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(String(credentials.password), user.password);
        if (!valid) return null;

        // 2FA-sjekk: hvis brukeren har TOTP aktivert, krever vi en gyldig kode
        if (user.totpEnabled && user.totpSecret) {
          const code = credentials.totp ? String(credentials.totp).trim() : "";
          if (!code) throw new TotpRequiredError();
          const validTotp = verifyTotpCode(code, user.totpSecret);
          if (!validTotp) throw new TotpInvalidError();
        }

        // Logg innloggingen og sjekk om landet er endret siden sist.
        // Fire-and-forget — recordLoginEvent fanger alle feil internt slik
        // at en DB-feil ikke knekker login. Vi venter på den likevel siden
        // den er rask og vi vil at notifikasjonen skal være på plass før
        // brukeren lander på /home.
        if (request?.headers) {
          const geo = readGeoFromHeaders(request.headers);
          await recordLoginEvent(user.id, geo);
        }

        return {
          id:           user.id,
          email:        user.email,
          name:         user.name ?? "",
          image:        user.image ?? user.avatarUrl ?? null,
          isSuperAdmin: user.isSuperAdmin,
          username:     user.username ?? null,
          userType:     user.userType,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ baseUrl }) {
      return `${baseUrl}/home`;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.isSuperAdmin = user.isSuperAdmin ?? false;
        token.username     = user.username ?? null;
        token.userType     = user.userType  ?? "FAN";
      }
      // Handle client-side update() calls — persist name/image into token
      if (trigger === "update" && session) {
        const s = session as { name?: string; image?: string };
        if (s.name  !== undefined) token.name    = s.name;
        if (s.image !== undefined) token.picture = s.image;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id           = token.sub ?? "";
      session.user.isSuperAdmin = (token.isSuperAdmin as boolean | undefined) ?? false;
      session.user.username     = (token.username as string | null | undefined) ?? null;
      session.user.userType     = (token.userType as "FAN" | "CREATOR" | "SPONSOR" | undefined) ?? "FAN";
      // Propagate name/image from token (kept up-to-date via update())
      if (token.name)    session.user.name  = token.name;
      if (token.picture) session.user.image = token.picture as string;
      return session;
    },
  },
});

export const { handlers, signIn, signOut } = nextAuthResult;

// auth() decoder JWT + spør Prisma-adapter per kall. Wrappes i React cache()
// slik at flere `await auth()`-kall innenfor SAMME request returnerer
// samme Promise istedenfor å re-dekrypte og re-spørre DB. Stor effekt på
// page-renders der både page, layout, server-actions og helpers gjør
// `await auth()` uavhengig av hverandre.
export const auth = cache(nextAuthResult.auth);
