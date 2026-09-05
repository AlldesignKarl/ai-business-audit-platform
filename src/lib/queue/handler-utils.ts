import type { Job } from "bullmq";
import { db } from "@/lib/db";

/**
 * Envuelve un handler de worker para dejar constancia en `JobRun` (arranque,
 * progreso, fin, error) — es la base de la página System Health y de los
 * indicadores "Analyzing 247/1000" en el dashboard.
 */
export async function withJobRun<T>(
  job: Job,
  organizationId: string | undefined,
  fn: (reportProgress: (progress: number) => Promise<void>) => Promise<T>
): Promise<T> {
  const jobRun = await db.jobRun.create({
    data: {
      organizationId,
      queue: job.queueName,
      jobId: job.id ?? "unknown",
      type: job.name,
      status: "RUNNING",
    },
  });

  const reportProgress = async (progress: number) => {
    await job.updateProgress(progress);
    await db.jobRun.update({ where: { id: jobRun.id }, data: { progress } });
  };

  try {
    const result = await fn(reportProgress);
    await db.jobRun.update({ where: { id: jobRun.id }, data: { status: "COMPLETED", progress: 100, finishedAt: new Date() } });
    return result;
  } catch (error) {
    await db.jobRun.update({
      where: { id: jobRun.id },
      data: { status: "FAILED", error: error instanceof Error ? error.message : String(error), finishedAt: new Date() },
    });
    throw error;
  }
}
