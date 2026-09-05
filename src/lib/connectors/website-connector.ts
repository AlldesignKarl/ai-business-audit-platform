import { db } from "@/lib/db";
import { scanWebsite, type WebsiteScanResult } from "@/lib/audit/website-scan";
import { BaseConnector } from "@/lib/connectors/base-connector";
import type { Connector } from "@/lib/connectors/types";

interface WebsiteChangeProposal {
  summary: string;
  beforeHtml?: string;
  afterHtml: string;
}

/**
 * Conector de la propia web del negocio. `getData` escanea la web (sin
 * necesidad de credenciales). `updateData` NUNCA publica directamente: crea
 * una entrada en el Approval Center con el before/after — publicar de verdad
 * requeriría credenciales del CMS del cliente (WordPress, Shopify...), que
 * se conectarían aquí mismo cuando estén disponibles.
 */
export class WebsiteConnector extends BaseConnector implements Connector<WebsiteScanResult, WebsiteChangeProposal> {
  readonly type = "WEBSITE";

  async connect(): Promise<{ authorizationUrl: string | null }> {
    return { authorizationUrl: null };
  }

  async authenticate() {
    await this.saveCredentials("n/a");
    return { accessToken: "n/a" };
  }

  async getData(params?: { url: string }): Promise<WebsiteScanResult> {
    await this.assertPermission("analyze");
    if (!params?.url) throw new Error("WebsiteConnector.getData requiere { url }");
    const result = await scanWebsite(params.url);
    await this.logAction("website.scan", "SUCCESS");
    return result;
  }

  async updateData(payload: WebsiteChangeProposal): Promise<{ success: boolean; details?: unknown }> {
    await this.assertPermission("modify");
    const record = await this.loadRecord();
    const approval = await db.approval.create({
      data: {
        organizationId: record.organizationId,
        businessId: record.businessId,
        type: "website_change",
        title: payload.summary,
        description: "Propuesta de cambio en la web generada por el AI Agent. Requiere aprobación humana antes de publicarse.",
        payload: { before: payload.beforeHtml ?? null, after: payload.afterHtml } as object,
        requestedBy: "AI_AGENT",
        status: "PENDING",
      },
    });
    await this.logAction("website.change_proposed", "SUCCESS", { after: { approvalId: approval.id } });
    return { success: true, details: { approvalId: approval.id, status: "PENDING_APPROVAL" } };
  }
}
