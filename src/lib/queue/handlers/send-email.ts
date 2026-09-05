import type { Job } from "bullmq";
import { db } from "@/lib/db";
import { processEmailSend } from "@/lib/email/send-service";
import { withJobRun } from "@/lib/queue/handler-utils";
import type { SendEmailJob } from "@/lib/queue/job-types";

export async function handleSendEmail(job: Job<SendEmailJob>) {
  const email = await db.email.findUniqueOrThrow({ where: { id: job.data.emailId }, include: { business: true } });
  return withJobRun(job, email.business.organizationId, async (reportProgress) => {
    await reportProgress(20);
    const result = await processEmailSend(job.data.emailId);
    await reportProgress(100);
    return result;
  });
}
