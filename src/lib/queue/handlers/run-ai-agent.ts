import type { Job } from "bullmq";
import { db } from "@/lib/db";
import { runAiAgent } from "@/lib/ai-agent/agent-runner";
import { withJobRun } from "@/lib/queue/handler-utils";
import type { RunAiAgentJob } from "@/lib/queue/job-types";

export async function handleRunAiAgent(job: Job<RunAiAgentJob>) {
  const agent = await db.aiAgent.findUniqueOrThrow({ where: { id: job.data.agentId } });
  return withJobRun(job, agent.organizationId, async (reportProgress) => {
    await reportProgress(10);
    const result = await runAiAgent(job.data.agentId, job.data.reason);
    await reportProgress(100);
    return result;
  });
}
