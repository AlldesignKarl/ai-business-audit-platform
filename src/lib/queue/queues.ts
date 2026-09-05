import { Queue, type JobsOptions } from "bullmq";
import { getRedis } from "@/lib/queue/redis";
import type { QueueName, JobPayloadMap } from "@/lib/queue/job-types";
import { QUEUE_NAMES } from "@/lib/queue/job-types";

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 60 * 60 * 24 * 7, count: 1000 },
  removeOnFail: { age: 60 * 60 * 24 * 30 },
};

const queues = new Map<QueueName, Queue>();

function getQueue(name: QueueName): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: getRedis() });
    queues.set(name, queue);
  }
  return queue;
}

// Instancia perezosa para cada cola declarada — evita crear conexiones si no se usan.
for (const name of QUEUE_NAMES) void name;

/**
 * Encola un trabajo con deduplicación opcional vía `dedupKey` (usa el mismo
 * jobId para evitar procesar el mismo negocio/recurso dos veces mientras el
 * job anterior siga en cola o en ejecución).
 */
export async function enqueueJob<T extends QueueName>(
  name: T,
  data: JobPayloadMap[T],
  options?: { dedupKey?: string; delayMs?: number }
) {
  const queue = getQueue(name);
  return queue.add(name, data, {
    ...DEFAULT_JOB_OPTIONS,
    jobId: options?.dedupKey,
    delay: options?.delayMs,
  });
}

export async function enqueueBulk<T extends QueueName>(name: T, items: { data: JobPayloadMap[T]; dedupKey?: string }[]) {
  const queue = getQueue(name);
  return queue.addBulk(
    items.map((item) => ({
      name,
      data: item.data,
      opts: { ...DEFAULT_JOB_OPTIONS, jobId: item.dedupKey },
    }))
  );
}

export async function getQueueCounts(name: QueueName) {
  const queue = getQueue(name);
  return queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
}

export { getQueue };
