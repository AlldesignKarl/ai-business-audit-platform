import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { getRedis } from "@/lib/queue/redis";
import { QUEUE_NAMES } from "@/lib/queue/job-types";
import { handleDiscoverBusinesses } from "@/lib/queue/handlers/discover-businesses";
import { handleCrawlWebsite } from "@/lib/queue/handlers/crawl-website";
import { handleAnalyzeBusiness } from "@/lib/queue/handlers/analyze-business";
import { handleGenerateReport } from "@/lib/queue/handlers/generate-report";
import { handleSendEmail } from "@/lib/queue/handlers/send-email";
import { handleProcessReply } from "@/lib/queue/handlers/process-reply";
import { handleAnalyzeReviews } from "@/lib/queue/handlers/analyze-reviews";
import { handleSyncConnector } from "@/lib/queue/handlers/sync-connector";
import { handleRunAiAgent } from "@/lib/queue/handlers/run-ai-agent";

const CONCURRENCY: Record<(typeof QUEUE_NAMES)[number], number> = {
  discover_businesses: 2,
  crawl_website: 8,
  analyze_business: 5,
  generate_report: 2,
  send_email: 5,
  process_reply: 5,
  analyze_reviews: 5,
  sync_connector: 5,
  run_ai_agent: 3,
};

const HANDLERS: Record<(typeof QUEUE_NAMES)[number], (job: Job) => Promise<unknown>> = {
  discover_businesses: handleDiscoverBusinesses,
  crawl_website: handleCrawlWebsite,
  analyze_business: handleAnalyzeBusiness,
  generate_report: handleGenerateReport,
  send_email: handleSendEmail,
  process_reply: handleProcessReply,
  analyze_reviews: handleAnalyzeReviews,
  sync_connector: handleSyncConnector,
  run_ai_agent: handleRunAiAgent,
};

/**
 * Proceso de workers en background. Ejecutar por separado del servidor web
 * (`npm run worker`) — nunca dentro de un proceso serverless de request/response.
 */
function startWorkers() {
  const connection = getRedis();
  const workers = QUEUE_NAMES.map((name) => {
    const worker = new Worker(name, HANDLERS[name], { connection, concurrency: CONCURRENCY[name] });
    worker.on("failed", (job, err) => {
      // eslint-disable-next-line no-console
      console.error(`[worker:${name}] job ${job?.id} failed:`, err.message);
    });
    worker.on("completed", (job) => {
      // eslint-disable-next-line no-console
      console.log(`[worker:${name}] job ${job.id} completed`);
    });
    return worker;
  });

  // eslint-disable-next-line no-console
  console.log(`AI Business Audit Platform — workers activos: ${QUEUE_NAMES.join(", ")}`);

  const shutdown = async () => {
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startWorkers();
