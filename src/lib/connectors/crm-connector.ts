import { db } from "@/lib/db";
import { BaseConnector } from "@/lib/connectors/base-connector";
import type { Connector } from "@/lib/connectors/types";

/**
 * Conector hacia el propio CRM de la plataforma — permite que el AI Agent
 * lea/actualice el estado del negocio como una integración más, con el mismo
 * modelo de permisos que un conector externo (sirve además de plantilla para
 * futuros conectores hacia CRMs externos como HubSpot/Pipedrive).
 */
export class CrmConnector extends BaseConnector implements Connector<unknown, { status?: string; note?: string }> {
  readonly type = "CRM";

  async connect() {
    return { authorizationUrl: null };
  }

  async authenticate() {
    await this.saveCredentials("internal");
    return { accessToken: "internal" };
  }

  async getData(): Promise<unknown> {
    await this.assertPermission("analyze");
    const record = await this.loadRecord();
    if (!record.businessId) throw new Error("CrmConnector requiere un negocio asociado");
    return db.business.findUnique({
      where: { id: record.businessId },
      include: { opportunities: true, tasks: true, contacts: true },
    });
  }

  async updateData(payload: { status?: string; note?: string }): Promise<{ success: boolean }> {
    await this.assertPermission("modify");
    const record = await this.loadRecord();
    if (!record.businessId) throw new Error("CrmConnector requiere un negocio asociado");
    if (payload.status) {
      await db.business.update({ where: { id: record.businessId }, data: { status: payload.status as never } });
    }
    await this.logAction("crm.update_business", "SUCCESS", { after: payload });
    return { success: true };
  }
}
