import type { Job } from "bullmq";
import { db } from "@/lib/db";
import { generateBusinessReport } from "@/lib/reports/report-generator";
import { withJobRun } from "@/lib/queue/handler-utils";
import type { GenerateReportJob } from "@/lib/queue/job-types";

export async function handleGenerateReport(job: Job<GenerateReportJob>) {
  const business = await db.business.findUniqueOrThrow({ where: { id: job.data.businessId } });
  return withJobRun(job, business.organizationId, async (reportProgress) => {
    await reportProgress(15);
    const result = await generateBusinessReport(job.data.businessId, job.data.requestedBy);
    await reportProgress(100);
    return result;
  });
}
