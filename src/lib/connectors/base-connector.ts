import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/security/encryption";
import { recordActivity } from "@/lib/activity";
import type { ConnectorPermissionAction, ConnectorPermissions } from "@/lib/connectors/types";
import { DEFAULT_CONNECTOR_PERMISSIONS } from "@/lib/connectors/types";

export class ConnectorPermissionError extends Error {
  constructor(action: ConnectorPermissionAction) {
    super(`Este conector no tiene el permiso '${action}' concedido por el propietario del negocio`);
  }
}

/**
 * Funcionalidad común a todos los conectores: carga/guardado de credenciales
 * cifradas, comprobación de permisos granulares, y registro en Activity Log
 * de cada acción ejecutada (quién, qué conector, resultado).
 */
export abstract class BaseConnector {
  constructor(protected readonly connectorId: string) {}

  protected async loadRecord() {
    return db.connector.findUniqueOrThrow({ where: { id: this.connectorId }, include: { credential: true } });
  }

  protected async getPermissions(): Promise<ConnectorPermissions> {
    const record = await this.loadRecord();
    return { ...DEFAULT_CONNECTOR_PERMISSIONS, ...(record.permissions as Partial<ConnectorPermissions>) };
  }

  protected async assertPermission(action: ConnectorPermissionAction) {
    const permissions = await this.getPermissions();
    if (!permissions[action]) throw new ConnectorPermissionError(action);
  }

  protected async saveCredentials(accessToken: string, refreshToken?: string, expiresAt?: Date, scope?: string) {
    const encryptedAccessToken = encryptSecret(accessToken);
    const encryptedRefreshToken = refreshToken ? encryptSecret(refreshToken) : undefined;

    await db.connectorCredential.upsert({
      where: { connectorId: this.connectorId },
      create: { connectorId: this.connectorId, encryptedAccessToken, encryptedRefreshToken, expiresAt, scope },
      update: { encryptedAccessToken, encryptedRefreshToken, expiresAt, scope },
    });
    await db.connector.update({ where: { id: this.connectorId }, data: { status: "CONNECTED", lastError: null } });
  }

  protected async getAccessToken(): Promise<string> {
    const record = await this.loadRecord();
    if (!record.credential?.encryptedAccessToken) {
      throw new Error(`Conector ${record.type} no está conectado (sin credenciales)`);
    }
    return decryptSecret(record.credential.encryptedAccessToken);
  }

  async disconnect(): Promise<void> {
    await db.connectorCredential.deleteMany({ where: { connectorId: this.connectorId } });
    await db.connector.update({ where: { id: this.connectorId }, data: { status: "DISCONNECTED" } });
  }

  protected async logAction(action: string, result: "SUCCESS" | "FAILURE", details?: { before?: unknown; after?: unknown }) {
    const record = await this.loadRecord();
    await recordActivity({
      organizationId: record.organizationId,
      businessId: record.businessId ?? undefined,
      actorType: "AI_AGENT",
      action,
      connectorUsed: record.type,
      result,
      before: details?.before,
      after: details?.after,
    });
  }
}
