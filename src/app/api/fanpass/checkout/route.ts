import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  // TODO: når Stripe er konfigurert:
  // const { createCheckoutSession } = await import("@/lib/stripe")
  // const url = await createCheckoutSession(session.user.id)
  // return NextResponse.json({ url })

  return NextResponse.json(
    { error: "Betaling ikke tilgjengelig ennå", waitlist: true },
    { status: 503 },
  );
}
