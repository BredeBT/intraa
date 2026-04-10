import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const caller = await db.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!caller?.isSuperAdmin) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  if (!email || email.length < 3) return NextResponse.json({ users: [] });

  const users = await db.user.findMany({
    where:  { email: { contains: email } },
    select: { id: true, name: true, email: true },
    take:   5,
  });

  return NextResponse.json({ users });
}
