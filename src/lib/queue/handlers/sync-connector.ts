import type { Job } from "bullmq";
import { db } from "@/lib/db";
import { createConnectorInstance } from "@/lib/connectors/registry";
import { withJobRun } from "@/lib/queue/handler-utils";
import type { SyncConnectorJob } from "@/lib/queue/job-types";

export async function handleSyncConnector(job: Job<SyncConnectorJob>) {
  const record = await db.connector.findUniqueOrThrow({ where: { id: job.data.connectorId } });
  return withJobRun(job, record.organizationId, async (reportProgress) => {
    await reportProgress(20);
    try {
      const instance = createConnectorInstance(record.type, record.id);
      const data = await instance.getData();
      await db.connector.update({ where: { id: record.id }, data: { lastSyncAt: new Date(), lastError: null } });
      await reportProgress(100);
      return { success: true, data };
    } catch (error) {
      await db.connector.update({
        where: { id: record.id },
        data: { status: "ERROR", lastError: error instanceof Error ? error.message : String(error) },
      });
      throw error;
    }
  });
}
