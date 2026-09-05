import type { Job } from "bullmq";
import { db } from "@/lib/db";
import { runBusinessAudit } from "@/lib/audit/engine";
import { withJobRun } from "@/lib/queue/handler-utils";
import type { AnalyzeBusinessJob } from "@/lib/queue/job-types";

export async function handleAnalyzeBusiness(job: Job<AnalyzeBusinessJob>) {
  const business = await db.business.findUniqueOrThrow({ where: { id: job.data.businessId } });
  return withJobRun(job, business.organizationId, async (reportProgress) => {
    await reportProgress(10);
    const result = await runBusinessAudit(job.data.businessId);
    await reportProgress(100);
    return result;
  });
}
