import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/feed", "/chat", "/tickets", "/filer", "/medlemmer",
  "/admin", "/community", "/kalender", "/oppgaver",
  "/profil", "/notifikasjoner", "/soek",
  "/innstillinger", "/hjelp", "/bytt-org",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("intraa-session");

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isLoginPage = pathname === "/login";

  if (isProtected && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isLoginPage && session) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/).*)"],
};
