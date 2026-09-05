import { db } from "@/lib/db";
import { renderTemplate } from "@/lib/email/template-engine";
import { processEmailSend } from "@/lib/email/send-service";
import { BaseConnector } from "@/lib/connectors/base-connector";
import type { Connector } from "@/lib/connectors/types";

interface EmailSendPayload {
  contactId?: string;
  subject: string;
  bodyTemplate: string;
  variables: Record<string, string>;
}

/**
 * Expone el envío de emails como conector con permisos granulares: `send`
 * para campañas salientes, `respond` para que el AI Agent conteste emails
 * entrantes de forma automática (solo si el propietario lo autoriza).
 */
export class EmailConnector extends BaseConnector implements Connector<unknown, EmailSendPayload> {
  readonly type = "EMAIL";

  async connect() {
    return { authorizationUrl: null };
  }

  async authenticate() {
    return { accessToken: "internal" };
  }

  async getData(): Promise<unknown> {
    await this.assertPermission("analyze");
    const record = await this.loadRecord();
    if (!record.businessId) throw new Error("EmailConnector requiere un negocio asociado");
    return db.email.findMany({ where: { businessId: record.businessId }, include: { events: true }, orderBy: { createdAt: "desc" } });
  }

  async updateData(payload: EmailSendPayload): Promise<{ success: boolean; details?: unknown }> {
    const permissions = await this.getPermissions();
    if (!permissions.send && !permissions.respond) {
      throw new Error("Este conector no tiene permiso 'send' ni 'respond' concedido");
    }
    const record = await this.loadRecord();
    if (!record.businessId) throw new Error("EmailConnector requiere un negocio asociado");

    const email = await db.email.create({
      data: {
        businessId: record.businessId,
        contactId: payload.contactId,
        subject: payload.subject,
        bodyHtml: renderTemplate(payload.bodyTemplate, payload.variables),
        status: "QUEUED",
      },
    });
    const result = await processEmailSend(email.id);
    await this.logAction("email.send", result.sent ? "SUCCESS" : "FAILURE", { after: { emailId: email.id } });
    return { success: result.sent, details: result };
  }
}
