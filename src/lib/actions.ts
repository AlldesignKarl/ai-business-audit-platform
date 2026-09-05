"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, assertSameOrganization } from "@/lib/security/rbac";
import { enqueueJob } from "@/lib/queue/queues";
import { decideApproval } from "@/lib/approvals/approval-service";

const discoverySchema = z.object({
  country: z.string().min(1),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  zone: z.string().optional(),
  category: z.string().min(1),
  sector: z.string().optional(),
  language: z.string().optional(),
  maxResults: z.coerce.number().min(1).max(500).default(20),
  opportunityCriteria: z.enum(["any", "high_opportunity_only"]).default("any"),
});

export async function triggerDiscoveryAction(formData: FormData) {
  const user = await requireRole("SALES");
  const parsed = discoverySchema.parse(Object.fromEntries(formData.entries()));

  await enqueueJob("discover_businesses", {
    organizationId: user.organizationId,
    requestedBy: user.id,
    ...parsed,
  });

  revalidatePath("/businesses");
  revalidatePath("/dashboard");
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
