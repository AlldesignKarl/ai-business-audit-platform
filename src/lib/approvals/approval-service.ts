import fs from "node:fs/promises";
import type { Approval } from "@prisma/client";
import { db } from "@/lib/db";
import { recordActivity } from "@/lib/activity";
import type { SessionUser } from "@/lib/auth";
import { assertSameOrganization } from "@/lib/security/rbac";
import { createConnectorInstance } from "@/lib/connectors/registry";
import type { GmailConnector } from "@/lib/connectors/gmail-connector";

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

  if (decision === "APPROVED") {
    await executeApprovedAction(updated);
  }

  return updated;
}

/**
 * Ejecuta el efecto real de una aprobación ya marcada como APPROVED. Es el
 * único lugar de la plataforma donde una acción sensible pasa de "propuesta"
 * a "ejecutada" — nunca ocurre automáticamente en otro punto del código. Un
 * fallo aquí NUNCA se propaga como excepción (la decisión ya quedó guardada);
 * se registra en el Activity Log para que quede visible en el dashboard.
 */
async function executeApprovedAction(approval: Approval): Promise<void> {
  switch (approval.type) {
    case "send_report_email":
      await executeSendReportEmail(approval);
      return;
    default:
      // Otros tipos (website_change, review_response, automation_action...)
      // todavía no tienen ejecución automática: requieren integraciones
      // (CMS del cliente, etc.) no disponibles en esta fase.
      return;
  }
}

interface SendReportEmailPayload {
  businessId: string;
  reportId: string;
  to: string;
}

async function executeSendReportEmail(approval: Approval): Promise<void> {
  const payload = approval.payload as unknown as SendReportEmailPayload | null;
  if (!payload?.reportId || !payload?.to) {
    await recordActivity({
      organizationId: approval.organizationId,
      businessId: approval.businessId ?? undefined,
      actorType: "SYSTEM",
      action: "report.email_failed",
      result: "FAILURE",
      after: { reason: "El payload de la aprobación no incluye reportId/to" },
    });
    return;
  }

  try {
    const report = await db.report.findUniqueOrThrow({ where: { id: payload.reportId }, include: { business: true } });
    const connector = await db.connector.findFirst({
      where: { organizationId: approval.organizationId, type: "GMAIL", status: "CONNECTED" },
    });
    if (!connector) {
      throw new Error("No hay ninguna cuenta de Gmail conectada. Conéctala en Ajustes → Conectores antes de enviar informes.");
    }

    const instance = createConnectorInstance("GMAIL", connector.id) as GmailConnector;

    let attachment: { filename: string; contentBase64: string; mimeType: string } | undefined;
    if (report.storageDriver === "local" && report.filePath) {
      const buffer = await fs.readFile(report.filePath);
      const safeName = report.business.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      attachment = { filename: `informe-${safeName}-v${report.version}.pdf`, contentBase64: buffer.toString("base64"), mimeType: "application/pdf" };
    }

    const subject = `Informe de auditoría digital — ${report.business.name}`;
    const html = `<p>Hola,</p><p>Adjuntamos el informe de auditoría digital de <strong>${report.business.name}</strong> (versión ${report.version}).</p><p>Un saludo.</p>`;

    await instance.updateData({ to: payload.to, subject, html, attachment });

    await recordActivity({
      organizationId: approval.organizationId,
      businessId: approval.businessId ?? undefined,
      actorType: "SYSTEM",
      action: "report.emailed",
      result: "SUCCESS",
      after: { to: payload.to, reportId: payload.reportId },
    });
  } catch (error) {
    await recordActivity({
      organizationId: approval.organizationId,
      businessId: approval.businessId ?? undefined,
      actorType: "SYSTEM",
      action: "report.email_failed",
      result: "FAILURE",
      after: { error: error instanceof Error ? error.message : String(error) },
    });
  }
}
