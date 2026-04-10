import { NextResponse } from "next/server";
import { toggleReaction } from "@/server/actions/messages";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { emoji } = await request.json() as { emoji: string };
    await toggleReaction(id, emoji);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
