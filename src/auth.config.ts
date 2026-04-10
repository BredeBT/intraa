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
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.isSuperAdmin = (user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false;
        token.username     = (user as { username?: string | null }).username ?? null;
      }
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
      if (token.name)    session.user.name  = token.name;
      if (token.picture) session.user.image = token.picture as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
