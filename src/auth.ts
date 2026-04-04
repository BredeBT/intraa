import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface User {
    isSuperAdmin?: boolean;
    username?:     string | null;
  }
  interface Session {
    user: DefaultSession["user"] & {
      id:          string;
      isSuperAdmin: boolean;
      username:    string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    isSuperAdmin?: boolean;
    username?:     string | null;
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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: String(credentials.email) },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(String(credentials.password), user.password);
        if (!valid) return null;

        return {
          id:           user.id,
          email:        user.email,
          name:         user.name ?? "",
          image:        user.image ?? user.avatarUrl ?? null,
          isSuperAdmin: user.isSuperAdmin,
          username:     user.username ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.isSuperAdmin = user.isSuperAdmin ?? false;
        token.username     = user.username ?? null;
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
});
