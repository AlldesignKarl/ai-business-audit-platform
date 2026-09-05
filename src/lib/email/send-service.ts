import { db } from "@/lib/db";
import { resolveEmailProvider } from "@/lib/email/email-router";
import { isSuppressed, assertCanSendMore } from "@/lib/email/compliance";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe-token";
import { recordActivity } from "@/lib/activity";
import { getEnv } from "@/lib/env";

/**
 * Envía (o registra como QUEUED si no hay proveedor real) un `Email` ya
 * creado en BD. Aplica suppression list y límites diarios ANTES de tocar el
 * proveedor — nunca hace spam indiscriminado.
 */
export async function processEmailSend(emailId: string): Promise<{ sent: boolean; simulated: boolean }> {
  const email = await db.email.findUniqueOrThrow({
    where: { id: emailId },
    include: { business: true, campaign: true, contact: true },
  });

  const recipient = email.contact?.email ?? email.business.email;
  if (!recipient) {
    await db.email.update({ where: { id: emailId }, data: { status: "FAILED" } });
    throw new Error("El email no tiene destinatario (ni contacto ni email del negocio)");
  }

  if (await isSuppressed(email.business.organizationId, recipient)) {
    await db.email.update({ where: { id: emailId }, data: { status: "SUPPRESSED" } });
    await db.emailEvent.create({ data: { emailId, type: "UNSUBSCRIBED", metadata: { reason: "en suppression list" } as object } });
    return { sent: false, simulated: false };
  }

  await assertCanSendMore(email.business.organizationId, email.campaign?.dailyLimit);

  const provider = resolveEmailProvider();
  const unsubscribeUrl = buildUnsubscribeUrl({ organizationId: email.business.organizationId, email: recipient });

  const result = await provider.send({
    to: recipient,
    from: getEnv().SMTP_FROM ?? "no-reply@example.com",
    subject: email.subject,
    html: email.bodyHtml,
    unsubscribeUrl,
  });

  await db.email.update({
    where: { id: emailId },
    data: {
      status: result.success ? "SENT" : result.simulated ? "QUEUED" : "FAILED",
      sentAt: result.success ? new Date() : undefined,
      providerId: result.providerId,
    },
  });

  if (result.success) {
    await db.emailEvent.create({ data: { emailId, type: "SENT", metadata: { provider: provider.name } as object } });
  }

  await recordActivity({
    organizationId: email.business.organizationId,
    businessId: email.businessId,
    actorType: "SYSTEM",
    action: result.simulated ? "email.queued_no_provider" : result.success ? "email.sent" : "email.failed",
    result: result.success ? "SUCCESS" : "FAILURE",
    after: { subject: email.subject, provider: provider.name },
  });

  return { sent: result.success, simulated: result.simulated };
}
