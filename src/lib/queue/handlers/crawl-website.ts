import type { Job } from "bullmq";
import { db } from "@/lib/db";
import { scanWebsite } from "@/lib/audit/website-scan";
import { withJobRun } from "@/lib/queue/handler-utils";
import type { CrawlWebsiteJob } from "@/lib/queue/job-types";

/**
 * Cachea el resultado del escaneo de la web como BusinessSource, evitando
 * repetir peticiones al mismo dominio en ventanas cortas de tiempo (dedup).
 */
export async function handleCrawlWebsite(job: Job<CrawlWebsiteJob>) {
  const business = await db.business.findUniqueOrThrow({ where: { id: job.data.businessId } });
  return withJobRun(job, business.organizationId, async (reportProgress) => {
    if (!business.website) return { skipped: true, reason: "sin website" };

    const recentSource = await db.businessSource.findFirst({
      where: { businessId: business.id, provider: "website_scan", fetchedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 6) } },
      orderBy: { fetchedAt: "desc" },
    });
    if (recentSource) return { cached: true, sourceId: recentSource.id };

    await reportProgress(20);
    const scan = await scanWebsite(business.website);
    await reportProgress(80);

    const source = await db.businessSource.create({
      data: { businessId: business.id, provider: "website_scan", rawPayload: scan as object },
    });
    await reportProgress(100);
    return { sourceId: source.id };
  });
}
