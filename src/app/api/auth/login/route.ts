import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json() as { email?: string; password?: string };

  if (body.email === "anders@intraa.net" && body.password === "passord123") {
    const response = NextResponse.json({ success: true });
    response.cookies.set("intraa-session", "mock", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      // secure: true — enable in production
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  }

  return NextResponse.json({ error: "Feil e-post eller passord" }, { status: 401 });
}
