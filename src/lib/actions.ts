"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ConnectorType } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { requireRole, assertSameOrganization } from "@/lib/security/rbac";
import { enqueueJob } from "@/lib/queue/queues";
import { decideApproval } from "@/lib/approvals/approval-service";
import { createConnectorInstance } from "@/lib/connectors/registry";
import { DEFAULT_CONNECTOR_PERMISSIONS, type ConnectorPermissions } from "@/lib/connectors/types";

/** Convierte cadenas vacías en `undefined` para que `.default()`/`.optional()` de Zod
 *  se apliquen igual si un campo de formulario se envía en blanco (p.ej. un
 *  <input type="number"> vacío llega como "", no como ausente). */
const emptyToUndefined = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);

const discoverySchema = z.object({
  country: z.string().min(1, "El país es obligatorio"),
  city: z.preprocess(emptyToUndefined, z.string().optional()),
  province: z.preprocess(emptyToUndefined, z.string().optional()),
  postalCode: z.preprocess(emptyToUndefined, z.string().optional()),
  zone: z.preprocess(emptyToUndefined, z.string().optional()),
  category: z.string().min(1, "La categoría es obligatoria"),
  sector: z.preprocess(emptyToUndefined, z.string().optional()),
  language: z.preprocess(emptyToUndefined, z.string().optional()),
  maxResults: z.preprocess(emptyToUndefined, z.coerce.number().min(1).max(500).default(20)),
  opportunityCriteria: z.preprocess(emptyToUndefined, z.enum(["any", "high_opportunity_only"]).default("any")),
});

export async function triggerDiscoveryAction(formData: FormData) {
  const user = await requireRole("SALES");
  const parsedResult = discoverySchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsedResult.success) {
    const message = parsedResult.error.issues.map((i) => i.message).join(" ");
    redirect(`/discovery?error=${encodeURIComponent(message)}`);
  }

  try {
    await enqueueJob("discover_businesses", {
      organizationId: user.organizationId,
      requestedBy: user.id,
      ...parsedResult.data,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[triggerDiscoveryAction] error al encolar la búsqueda:", error);
    redirect(`/discovery?error=${encodeURIComponent("No se pudo iniciar la búsqueda. Inténtalo de nuevo en unos minutos.")}`);
  }

  revalidatePath("/businesses");
  revalidatePath("/dashboard");
  redirect("/businesses?discoveryStarted=1");
}

export async function triggerAuditAction(businessId: string) {
  const user = await requireRole("ANALYST");
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  assertSameOrganization(user, business.organizationId);

  await enqueueJob("analyze_business", { businessId }, { dedupKey: `analyze:${businessId}:${Date.now()}` });
  revalidatePath(`/businesses/${businessId}`);
}

export async function triggerReportAction(businessId: string) {
  const user = await requireRole("ANALYST");
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  assertSameOrganization(user, business.organizationId);

  await enqueueJob("generate_report", { businessId, requestedBy: user.id });
  revalidatePath(`/businesses/${businessId}`);
}

export async function updateBusinessStatusAction(businessId: string, status: string) {
  const user = await requireRole("SALES");
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  assertSameOrganization(user, business.organizationId);

  await db.business.update({ where: { id: businessId }, data: { status: status as never } });
  revalidatePath(`/businesses/${businessId}`);
  revalidatePath("/businesses");
}

export async function createTaskAction(formData: FormData) {
  const user = await requireRole("SALES");
  const businessId = String(formData.get("businessId"));
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  assertSameOrganization(user, business.organizationId);

  await db.task.create({
    data: {
      organizationId: user.organizationId,
      businessId,
      title: String(formData.get("title")),
      description: String(formData.get("description") ?? ""),
      assignedTo: "USER",
    },
  });
  revalidatePath(`/businesses/${businessId}`);
}

export async function decideApprovalAction(approvalId: string, decision: "APPROVED" | "REJECTED") {
  const user = await requireRole("ADMIN");
  try {
    await decideApproval(user, approvalId, decision);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[decideApprovalAction] error:", error);
    redirect(`/approvals?error=${encodeURIComponent(error instanceof Error ? error.message : "No se pudo procesar la decisión.")}`);
  }
  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  redirect(`/approvals?decided=${decision}`);
}

const REPORT_EMAIL_TYPES: ConnectorType[] = [
  "GOOGLE",
  "GMAIL",
  "WEBSITE",
  "EMAIL",
  "WHATSAPP",
  "INSTAGRAM",
  "FACEBOOK",
  "CALENDAR",
  "ANALYTICS",
  "CRM",
];

/** Inicia el flujo OAuth de un conector: crea (o reutiliza) el `Connector` a
 *  nivel de organización y redirige al usuario a la pantalla de consentimiento
 *  del proveedor. Nunca guarda credenciales aquí — eso ocurre en el callback. */
export async function initiateConnectorConnectAction(formData: FormData) {
  const user = await requireRole("ADMIN");
  const type = String(formData.get("type")) as ConnectorType;
  if (!REPORT_EMAIL_TYPES.includes(type)) {
    redirect(`/settings?error=${encodeURIComponent("Tipo de conector desconocido")}`);
  }

  let connector = await db.connector.findFirst({ where: { organizationId: user.organizationId, type, businessId: null } });
  if (!connector) {
    connector = await db.connector.create({
      data: { organizationId: user.organizationId, type, status: "DISCONNECTED", permissions: DEFAULT_CONNECTOR_PERMISSIONS as object },
    });
  }

  const redirectUri = new URL(`/api/connectors/${type.toLowerCase()}/callback`, getEnv().APP_URL).toString();
  const instance = createConnectorInstance(type, connector.id);
  const { authorizationUrl } = await instance.connect(redirectUri);

  if (!authorizationUrl) {
    redirect(
      `/settings?error=${encodeURIComponent(`${type}: falta configurar las credenciales de la API en el servidor (variables de entorno).`)}`
    );
  }

  redirect(authorizationUrl);
}

/** Conecta un conector que no usa redirect OAuth (CRM/Web/Email internos —
 *  ya operan con las credenciales propias de la plataforma). */
export async function activateInternalConnectorAction(formData: FormData) {
  const user = await requireRole("ADMIN");
  const type = String(formData.get("type")) as ConnectorType;

  let connector = await db.connector.findFirst({ where: { organizationId: user.organizationId, type, businessId: null } });
  if (!connector) {
    connector = await db.connector.create({
      data: { organizationId: user.organizationId, type, status: "DISCONNECTED", permissions: DEFAULT_CONNECTOR_PERMISSIONS as object },
    });
  }
  const instance = createConnectorInstance(type, connector.id);
  await instance.authenticate({});
  revalidatePath("/settings");
}

/** Conecta WhatsApp Business Cloud pegando el access token generado en Meta
 *  Business Manager (no usa redirect OAuth estándar). */
export async function connectWhatsAppManualAction(formData: FormData) {
  const user = await requireRole("ADMIN");
  const accessToken = String(formData.get("accessToken") ?? "").trim();
  if (!accessToken) {
    redirect(`/settings?error=${encodeURIComponent("Introduce el access token de WhatsApp Business")}`);
  }

  let connector = await db.connector.findFirst({ where: { organizationId: user.organizationId, type: "WHATSAPP", businessId: null } });
  if (!connector) {
    connector = await db.connector.create({
      data: { organizationId: user.organizationId, type: "WHATSAPP", status: "DISCONNECTED", permissions: DEFAULT_CONNECTOR_PERMISSIONS as object },
    });
  }
  const instance = createConnectorInstance("WHATSAPP", connector.id);
  await instance.authenticate({ accessToken });
  revalidatePath("/settings");
}

export async function disconnectConnectorAction(connectorId: string) {
  const user = await requireRole("ADMIN");
  const connector = await db.connector.findUniqueOrThrow({ where: { id: connectorId } });
  assertSameOrganization(user, connector.organizationId);
  const instance = createConnectorInstance(connector.type, connector.id);
  await instance.disconnect();
  revalidatePath("/settings");
}

const PERMISSION_KEYS: (keyof ConnectorPermissions)[] = ["analyze", "modify", "respond", "send", "publish"];

/** Guarda los permisos granulares de un conector ya conectado. Aunque quien
 *  los concede sea el OWNER, quedan registrados como autorización explícita —
 *  el AI Agent y las automatizaciones nunca actúan sobre un permiso no marcado aquí. */
export async function updateConnectorPermissionsAction(formData: FormData) {
  const user = await requireRole("ADMIN");
  const connectorId = String(formData.get("connectorId"));
  const connector = await db.connector.findUniqueOrThrow({ where: { id: connectorId } });
  assertSameOrganization(user, connector.organizationId);

  const permissions: ConnectorPermissions = { ...DEFAULT_CONNECTOR_PERMISSIONS };
  for (const key of PERMISSION_KEYS) {
    permissions[key] = formData.get(`perm_${key}`) === "on";
  }

  await db.connector.update({ where: { id: connectorId }, data: { permissions: permissions as object } });
  revalidatePath("/settings");
}

const reportEmailSchema = z.object({
  businessId: z.string().min(1),
  reportId: z.string().min(1),
  to: z.string().email("Introduce un email válido"),
});

/** Solicita el envío de un informe por Gmail. NUNCA envía directamente: crea
 *  una entrada PENDING en el Approval Center. Incluso el OWNER debe aprobarla
 *  explícitamente desde allí antes de que el email salga. */
export async function requestSendReportEmailAction(formData: FormData) {
  const user = await requireRole("ANALYST");
  const businessId = String(formData.get("businessId"));
  const parsed = reportEmailSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    redirect(`/businesses/${businessId}?error=${encodeURIComponent(parsed.error.issues.map((i) => i.message).join(" "))}`);
  }

  const { reportId, to } = parsed.data;
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  assertSameOrganization(user, business.organizationId);
  const report = await db.report.findFirst({ where: { id: reportId, businessId } });
  if (!report) {
    redirect(`/businesses/${businessId}?error=${encodeURIComponent("El informe indicado no existe.")}`);
  }

  await db.approval.create({
    data: {
      organizationId: business.organizationId,
      businessId,
      type: "send_report_email",
      title: `Enviar informe v${report.version} de ${business.name} por Gmail`,
      description: `Se enviará a ${to} con el PDF del informe adjunto, usando la cuenta de Gmail conectada de la organización. Requiere aprobación explícita — también si eres OWNER.`,
      payload: { businessId, reportId, to } as object,
      requestedBy: "USER",
      status: "PENDING",
    },
  });

  revalidatePath("/approvals");
  revalidatePath(`/businesses/${businessId}`);
  redirect(`/businesses/${businessId}?reportEmailRequested=1`);
}
