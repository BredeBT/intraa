import { NextResponse } from "next/server";
import { getPinnedMessages, pinMessage } from "@/server/actions/messages";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pins = await getPinnedMessages(id);
    return NextResponse.json(pins);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params;
    const { messageId, isPinned } = await request.json() as { messageId: string; isPinned: boolean };
    void channelId;
    await pinMessage(messageId, isPinned);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
