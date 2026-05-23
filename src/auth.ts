import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { verifyTotpCode } from "@/lib/totp";
import { authConfig } from "./auth.config";

// Spesifikke feilkoder slik at login-UI kan vise riktig melding
class TotpRequiredError extends CredentialsSignin { code = "totp_required"; }
class TotpInvalidError  extends CredentialsSignin { code = "totp_invalid";  }

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

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      credentials: {
        email:    { label: "E-post",  type: "email" },
        password: { label: "Passord", type: "password" },
        totp:     { label: "2FA-kode", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: String(credentials.email) },
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
