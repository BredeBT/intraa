import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/feed", "/chat", "/tickets", "/filer", "/medlemmer",
  "/admin", "/community", "/kalender", "/oppgaver",
  "/profil", "/notifikasjoner", "/soek",
  "/innstillinger", "/hjelp", "/bytt-org", "/superadmin",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isLoginPage = pathname === "/login";

  if (isProtected && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoginPage && req.auth) {
    return NextResponse.redirect(new URL("/feed", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/auth).*)"],
};
