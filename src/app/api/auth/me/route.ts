import { NextRequest, NextResponse } from "next/server";
import { getMockUser } from "@/lib/mock-auth";

export async function GET(request: NextRequest) {
  const session = request.cookies.get("intraa-session");
  if (!session?.value) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }
  return NextResponse.json(getMockUser());
}
