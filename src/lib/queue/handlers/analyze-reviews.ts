import type { Job } from "bullmq";
import { db } from "@/lib/db";
import { withJobRun } from "@/lib/queue/handler-utils";
import { runAiTask } from "@/lib/ai/orchestrator";
import type { AnalyzeReviewsJob } from "@/lib/queue/job-types";

interface RawReview {
  rating: number;
  text: string;
  respondedByOwner?: boolean;
}

/**
 * Clasifica sentimiento y detecta problemas recurrentes en reseñas ya
 * obtenidas vía un conector autorizado (guardadas como BusinessSource con
 * provider `reviews`). Si no hay reseñas disponibles (sin conector
 * conectado), no inventa nada: informa que no hay datos.
 */
export async function handleAnalyzeReviews(job: Job<AnalyzeReviewsJob>) {
  const business = await db.business.findUniqueOrThrow({ where: { id: job.data.businessId } });
  return withJobRun(job, business.organizationId, async (reportProgress) => {
    await reportProgress(10);
    const source = await db.businessSource.findFirst({
      where: { businessId: business.id, provider: "reviews" },
      orderBy: { fetchedAt: "desc" },
    });

    if (!source) {
      return { analyzed: false, reason: "Sin reseñas disponibles (conecta Google Business Profile para habilitar este análisis)" };
    }

    const reviews = (source.rawPayload as { reviews?: RawReview[] })?.reviews ?? [];
    const unanswered = reviews.filter((r) => !r.respondedByOwner);
    const negative = reviews.filter((r) => r.rating <= 3);

    await reportProgress(60);

    let summary = `${reviews.length} reseñas analizadas. ${unanswered.length} sin respuesta. ${negative.length} con valoración baja (<=3).`;
    if (negative.length > 0) {
      summary = await runAiTask({
        organizationId: business.organizationId,
        businessId: business.id,
        type: "review_response",
        complexity: "simple",
        context: {
          businessName: business.name,
          rating: negative[0]?.rating,
          reviewText: negative[0]?.text,
        },
      });
    }

    await reportProgress(100);
    return { analyzed: true, total: reviews.length, unanswered: unanswered.length, negative: negative.length, summary };
  });
}
