import type { Job } from "bullmq";
import { runDiscovery } from "@/lib/discovery/discovery-service";
import { withJobRun } from "@/lib/queue/handler-utils";
import type { DiscoverBusinessesJob } from "@/lib/queue/job-types";

export async function handleDiscoverBusinesses(job: Job<DiscoverBusinessesJob>) {
  return withJobRun(job, job.data.organizationId, async (reportProgress) => {
    await reportProgress(5);
    const result = await runDiscovery(job.data);
    await reportProgress(100);
    return result;
  });
}
