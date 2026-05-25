import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { audit, AuditActions } from "@/lib/audit";

const MOD_ROLES = ["OWNER", "ADMIN", "MODERATOR"] as const;

/**
 * Hent membership-rolle for innlogget bruker i orgen som eier denne kommentaren.
 * Returnerer null hvis ikke medlem eller kommentar ikke finnes.
 */
async function getModContext(userId: string, commentId: string) {
  const comment = await db.comment.findUnique({
    where:  { id: commentId },
    select: { id: true, authorId: true, post: { select: { orgId: true } } },
  });
  if (!comment) return null;

  const membership = await db.membership.findUnique({
    where:  { userId_organizationId: { userId, organizationId: comment.post.orgId } },
    select: { role: true },
  });

  return {
    comment,
    isAuthor: comment.authorId === userId,
    isMod:    !!membership && (MOD_ROLES as readonly string[]).includes(membership.role),
  };
}

/** DELETE /api/comments/[commentId] — hard delete. Forfatter eller mod+. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const { commentId } = await params;

  const ctx = await getModContext(session.user.id, commentId);
  if (!ctx) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  if (!ctx.isAuthor && !ctx.isMod) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
  }

  await db.comment.delete({ where: { id: commentId } });

  if (!ctx.isAuthor) {
    void audit({
      actorId:        session.user.id,
      organizationId: ctx.comment.post.orgId,
      action:         AuditActions.COMMENT_DELETE,
      targetType:     "comment",
      targetId:       commentId,
      metadata:       { originalAuthorId: ctx.comment.authorId },
    });
  }

  return NextResponse.json({ ok: true, deleted: true });
}

/**
 * PATCH /api/comments/[commentId] { action: "hide" | "unhide", reason? }
 * Soft-hide / unhide. Bare mods.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const { commentId } = await params;

  const { action, reason } = (await req.json()) as { action?: "hide" | "unhide"; reason?: string };
  if (action !== "hide" && action !== "unhide") {
    return NextResponse.json({ error: "Ugyldig action" }, { status: 400 });
  }

  const ctx = await getModContext(session.user.id, commentId);
  if (!ctx) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  if (!ctx.isMod) return NextResponse.json({ error: "Krever moderator-rolle" }, { status: 403 });

  if (action === "hide") {
    await db.comment.update({
      where: { id: commentId },
      data:  {
        hiddenAt:     new Date(),
        hiddenById:   session.user.id,
        hiddenReason: reason?.trim().slice(0, 200) ?? null,
      },
    });
    void audit({
      actorId:        session.user.id,
      organizationId: ctx.comment.post.orgId,
      action:         AuditActions.COMMENT_HIDE,
      targetType:     "comment",
      targetId:       commentId,
      metadata:       { originalAuthorId: ctx.comment.authorId, reason: reason?.trim() ?? null },
    });
    return NextResponse.json({ ok: true, hidden: true });
  }

  await db.comment.update({
    where: { id: commentId },
    data:  { hiddenAt: null, hiddenById: null, hiddenReason: null },
  });
  void audit({
    actorId:        session.user.id,
    organizationId: ctx.comment.post.orgId,
    action:         AuditActions.COMMENT_UNHIDE,
    targetType:     "comment",
    targetId:       commentId,
  });
  return NextResponse.json({ ok: true, hidden: false });
}
