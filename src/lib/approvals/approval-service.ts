import { db } from "@/lib/db";
import { recordActivity } from "@/lib/activity";
import type { SessionUser } from "@/lib/auth";
import { assertSameOrganization } from "@/lib/security/rbac";

/**
 * Decide una aprobación pendiente (approve/reject/edit). Es el único punto
 * por el que una acción sensible de IA/automatización pasa a tener efecto —
 * toda la plataforma exige pasar por aquí para acciones marcadas como
 * `approvalRequired` o creadas directamente como Approval.
 */
export async function decideApproval(
  user: SessionUser,
  approvalId: string,
  decision: "APPROVED" | "REJECTED" | "EDITED",
  editedPayload?: unknown
) {
  const approval = await db.approval.findUniqueOrThrow({ where: { id: approvalId } });
  assertSameOrganization(user, approval.organizationId);

  if (approval.status !== "PENDING") {
    throw new Error("Esta aprobación ya ha sido resuelta");
  }

  const updated = await db.approval.update({
    where: { id: approvalId },
    data: {
      status: decision,
      decidedBy: user.id,
      decidedAt: new Date(),
      ...(editedPayload ? { payload: { ...(approval.payload as object), edited: editedPayload } as object } : {}),
    },
  });

  await recordActivity({
    organizationId: approval.organizationId,
    businessId: approval.businessId ?? undefined,
    actorType: "USER",
    actorId: user.id,
    action: `approval.${decision.toLowerCase()}`,
    before: { status: "PENDING" },
    after: { status: decision, approvalType: approval.type },
  });

  return updated;
}
