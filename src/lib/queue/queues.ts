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

/** Contadores de una cola. `available: false` indica que Redis no respondió
 *  a tiempo — nunca lanza, para que System Health pueda seguir renderizando
 *  el resto de la página aunque la cola esté caída. */
export async function getQueueCounts(name: QueueName): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  available: boolean;
}> {
  const queue = getQueue(name);
  try {
    const counts = await withTimeout(
      queue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
      3000
    );
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      available: true,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[queues] No se pudo leer el estado de la cola "${name}":`, error);
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, available: false };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Redis timeout tras ${ms}ms`)), ms)),
  ]);
}

export { getQueue };
