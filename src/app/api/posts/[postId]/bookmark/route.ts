import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

/** POST /api/posts/[postId]/bookmark — lagre innlegget */
export async function POST(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const { postId } = await params;

  // Verifiser at posten finnes og at brukeren er medlem av orgen den tilhører
  const post = await db.post.findUnique({
    where:  { id: postId },
    select: { orgId: true },
  });
  if (!post) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });

  const member = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: post.orgId } },
  });
  if (!member) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });

  await db.bookmark.upsert({
    where:  { postId_userId: { postId, userId: session.user.id } },
    create: { postId, userId: session.user.id },
    update: {},
  });

  return NextResponse.json({ ok: true, bookmarked: true });
}

/** DELETE /api/posts/[postId]/bookmark — fjern bookmark */
export async function DELETE(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const { postId } = await params;

  await db.bookmark.deleteMany({
    where: { postId, userId: session.user.id },
  });

  return NextResponse.json({ ok: true, bookmarked: false });
}
