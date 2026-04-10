import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const { token } = await params;

  const invitation = await db.invitation.findUnique({ where: { token } });

  if (!invitation) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
  }

  await db.invitation.update({
    where: { token },
    data:  { status: "DECLINED" },
  });

  return NextResponse.json({ ok: true });
}
