import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

// Paths that are always public (no auth required)
const PUBLIC_PATHS = ["/", "/login", "/registrer", "/glemt-passord"];
const PUBLIC_PREFIXES = ["/inviter", "/api/auth", "/c/"];

const { auth } = NextAuth(authConfig);

const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isPublic && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname === "/login" && req.auth) {
    return NextResponse.redirect(new URL("/feed", req.url));
  }

  return NextResponse.next();
});

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
