import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Edge-safe config — NO Prisma, NO bcrypt, NO Node.js-only modules.
// Used by middleware to validate JWT tokens in the Edge runtime.
// The full auth.ts adds Prisma adapter and authorize logic on top of this.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [
    // Credentials provider must be listed here (even without authorize)
    // so that NextAuth recognises the provider in the Edge runtime.
    Credentials({}),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.isSuperAdmin = (user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false;
        token.username     = (user as { username?: string | null }).username ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id           = token.sub ?? "";
      session.user.isSuperAdmin = (token.isSuperAdmin as boolean | undefined) ?? false;
      session.user.username     = (token.username as string | null | undefined) ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
