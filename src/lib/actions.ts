"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, assertSameOrganization } from "@/lib/security/rbac";
import { enqueueJob } from "@/lib/queue/queues";
import { decideApproval } from "@/lib/approvals/approval-service";

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
  await decideApproval(user, approvalId, decision);
  revalidatePath("/approvals");
}
