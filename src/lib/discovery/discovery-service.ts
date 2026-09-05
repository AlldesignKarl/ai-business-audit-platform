import { db } from "@/lib/db";
import { GooglePlacesProvider } from "@/lib/discovery/providers/google-places-provider";
import { DisabledProvider } from "@/lib/discovery/providers/disabled-provider";
import type { BusinessSourceProvider, DiscoveredBusiness } from "@/lib/discovery/types";
import { enqueueJob } from "@/lib/queue/queues";
import { recordActivity } from "@/lib/activity";
import type { DiscoverBusinessesJob } from "@/lib/queue/job-types";

function resolveProvider(): BusinessSourceProvider {
  const google = new GooglePlacesProvider();
  if (google.isConfigured) return google;
  return new DisabledProvider();
}

/** Heurística rápida de oportunidad usable SIN auditoría completa (solo con datos de la fuente). */
function quickOpportunityHeuristic(b: DiscoveredBusiness): number {
  let score = 50;
  if (!b.website) score += 20;
  if (b.reviewCount !== undefined && b.reviewCount < 10) score += 10;
  if (b.rating !== undefined && b.rating < 4.0) score += 15;
  if (b.reviewCount !== undefined && b.reviewCount >= 5) score += 5; // negocio con actividad real demostrable
  return Math.max(0, Math.min(100, score));
}

export interface DiscoveryRunResult {
  providerUsed: string;
  providerConfigured: boolean;
  found: number;
  created: number;
  deduplicated: number;
  queuedForAnalysis: number;
}

/**
 * Orquesta una búsqueda masiva: llama al proveedor configurado, deduplica
 * contra negocios ya existentes (por googlePlaceId), persiste y encola el
 * análisis de cada negocio nuevo. Si no hay proveedor configurado, no
 * fabrica resultados — devuelve found=0 con el motivo.
 */
export async function runDiscovery(job: DiscoverBusinessesJob): Promise<DiscoveryRunResult> {
  const provider = resolveProvider();

  if (!provider.isConfigured) {
    await recordActivity({
      organizationId: job.organizationId,
      actorType: "SYSTEM",
      action: "discovery.skipped_no_provider",
      result: "FAILURE",
    });
    return { providerUsed: provider.name, providerConfigured: false, found: 0, created: 0, deduplicated: 0, queuedForAnalysis: 0 };
  }

  const discovered = await provider.search({
    country: job.country,
    city: job.city,
    province: job.province,
    postalCode: job.postalCode,
    zone: job.zone,
    category: job.category,
    sector: job.sector,
    language: job.language,
    maxResults: job.maxResults,
  });

  const filtered =
    job.opportunityCriteria === "high_opportunity_only"
      ? discovered.filter((b) => quickOpportunityHeuristic(b) >= 65)
      : discovered;

  let created = 0;
  let deduplicated = 0;
  const createdIds: string[] = [];

  for (const item of filtered) {
    const existing = item.googlePlaceId
      ? await db.business.findUnique({ where: { organizationId_googlePlaceId: { organizationId: job.organizationId, googlePlaceId: item.googlePlaceId } } })
      : null;

    if (existing) {
      deduplicated++;
      await db.businessSource.create({
        data: { businessId: existing.id, provider: item.provider, externalId: item.externalId, rawPayload: item.rawPayload as object },
      });
      continue;
    }

    const business = await db.business.create({
      data: {
        organizationId: job.organizationId,
        name: item.name,
        category: item.category,
        country: item.country,
        city: item.city,
        postalCode: item.postalCode,
        address: item.address,
        lat: item.lat,
        lng: item.lng,
        website: item.website,
        phone: item.phone,
        rating: item.rating,
        reviewCount: item.reviewCount,
        googlePlaceId: item.googlePlaceId,
        status: "NEW",
        sources: { create: { provider: item.provider, externalId: item.externalId, rawPayload: item.rawPayload as object } },
      },
    });
    created++;
    createdIds.push(business.id);
  }

  for (const businessId of createdIds) {
    await enqueueJob("analyze_business", { businessId }, { dedupKey: `analyze:${businessId}` });
  }

  await recordActivity({
    organizationId: job.organizationId,
    actorType: "USER",
    actorId: job.requestedBy,
    action: "discovery.completed",
    after: { found: discovered.length, created, deduplicated, category: job.category, city: job.city },
  });

  return {
    providerUsed: provider.name,
    providerConfigured: true,
    found: discovered.length,
    created,
    deduplicated,
    queuedForAnalysis: createdIds.length,
  };
}
