import { db } from "@/lib/db";

export type ActorType = "USER" | "AI_AGENT" | "SYSTEM";

interface RecordActivityInput {
  organizationId: string;
  businessId?: string;
  actorType: ActorType;
  actorId?: string;
  action: string;
  before?: unknown;
  after?: unknown;
  connectorUsed?: string;
  result?: "SUCCESS" | "FAILURE";
}

/**
 * Registro central de "quién hizo qué, cuándo, antes/después". Toda acción de
 * negocio relevante (auditoría, email enviado, cambio publicado, automatización
 * ejecutada) debe pasar por aquí — es la fuente del Activity Log del dashboard.
 */
export async function recordActivity(input: RecordActivityInput) {
  return db.activity.create({
    data: {
      organizationId: input.organizationId,
      businessId: input.businessId,
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      before: input.before === undefined ? undefined : (input.before as object),
      after: input.after === undefined ? undefined : (input.after as object),
      connectorUsed: input.connectorUsed,
      result: input.result ?? "SUCCESS",
    },
  });
}

interface RecordAuditLogInput {
  organizationId?: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}

/** Registro de seguridad (login, cambios de permisos, credenciales, roles). */
export async function recordAuditLog(input: RecordAuditLogInput) {
  return db.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before === undefined ? undefined : (input.before as object),
      after: input.after === undefined ? undefined : (input.after as object),
      ip: input.ip,
      userAgent: input.userAgent,
    },
  });
}
