import type { Job } from "bullmq";
import { db } from "@/lib/db";
import { withJobRun } from "@/lib/queue/handler-utils";
import { recordActivity } from "@/lib/activity";
import { triggerAutomations } from "@/lib/automation/automation-engine";
import type { ProcessReplyJob } from "@/lib/queue/job-types";

/** Procesa una respuesta entrante de email (vía webhook del proveedor) y actualiza el estado del negocio en el CRM. */
export async function handleProcessReply(job: Job<ProcessReplyJob>) {
  return withJobRun(job, job.data.organizationId, async (reportProgress) => {
    await reportProgress(20);

    let businessId = job.data.businessId;
    if (!businessId) {
      const business = await db.business.findFirst({
        where: { organizationId: job.data.organizationId, email: job.data.fromAddress },
      });
      businessId = business?.id;
    }

    if (job.data.emailId) {
      await db.emailEvent.create({
        data: { emailId: job.data.emailId, type: "REPLIED", metadata: { subject: job.data.subject } as object },
      });
    }

    if (businessId) {
      await db.business.update({ where: { id: businessId }, data: { status: "REPLIED" } });
      await recordActivity({
        organizationId: job.data.organizationId,
        businessId,
        actorType: "SYSTEM",
        action: "email.reply_received",
        after: { subject: job.data.subject },
      });
      await triggerAutomations({ organizationId: job.data.organizationId, event: "email.replied", payload: { businessId } });
    }

    await reportProgress(100);
    return { businessId, matched: Boolean(businessId) };
  });
}
