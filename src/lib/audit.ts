import "server-only";
import { headers } from "next/headers";
import { db } from "@/server/db";

/**
 * Audit-log helper for admin/superadmin-handlinger.
 *
 * Fire-and-forget med logging av feil — vi vil ALDRI knekke en
 * hoved-handling fordi audit-loggen feilet.
 *
 * Action-konvensjon: "<entity>.<verb>" — f.eks. "post.hide", "member.ban".
 * Hold listen kort og konsistent slik at vi kan filtrere senere.
 */
export interface AuditEntry {
  actorId:         string;
  organizationId?: string | null;
  action:          string;
  targetType?:     string;
  targetId?:       string;
  metadata?:       Record<string, unknown>;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    let ipAddress: string | null = null;
    try {
      const h   = await headers();
      const xff = h.get("x-forwarded-for");
      ipAddress = xff ? xff.split(",")[0]!.trim() : h.get("x-real-ip");
    } catch { /* utenfor request-kontekst */ }

    await db.auditLog.create({
      data: {
        actorId:        entry.actorId,
        organizationId: entry.organizationId ?? null,
        action:         entry.action,
        targetType:     entry.targetType,
        targetId:       entry.targetId,
        metadata:       entry.metadata ? (entry.metadata as object) : undefined,
        ipAddress:      ipAddress ?? undefined,
      },
    });
  } catch (err) {
    // Aldri kast — bare logg
    console.warn("[audit] failed to write log:", entry.action, err);
  }
}

/** Felles actions-strenger så stavefeil oppdages av TypeScript. */
export const AuditActions = {
  // Post / comment moderation
  POST_HIDE:           "post.hide",
  POST_UNHIDE:         "post.unhide",
  POST_DELETE:         "post.delete",
  COMMENT_HIDE:        "comment.hide",
  COMMENT_UNHIDE:      "comment.unhide",
  COMMENT_DELETE:      "comment.delete",

  // Membership / requests
  MEMBER_BAN:          "member.ban",
  MEMBER_UNBAN:        "member.unban",
  MEMBER_ROLE_CHANGE:  "member.role_change",
  JOIN_REQUEST_APPROVE:"join_request.approve",
  JOIN_REQUEST_REJECT: "join_request.reject",

  // Organization settings
  ORG_UPDATE:          "org.update",
  ORG_JOIN_TYPE:       "org.join_type",

  // Superadmin
  USER_IMPERSONATE:    "superadmin.impersonate",
  USER_SUSPEND:        "superadmin.user.suspend",
  ORG_SUSPEND:         "superadmin.org.suspend",
  FANPASS_GRANT:       "superadmin.fanpass.grant",
} as const;
