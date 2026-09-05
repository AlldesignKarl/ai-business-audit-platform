import { db } from "@/lib/db";
import { scanWebsite } from "@/lib/audit/website-scan";
import { evaluateWebsiteRules } from "@/lib/audit/rules/website-rules";
import { evaluateLocalSeoRules } from "@/lib/audit/rules/local-seo-rules";
import { evaluateReputationRules, computeReputationScore } from "@/lib/audit/rules/reputation-rules";
import { evaluateSocialRules } from "@/lib/audit/rules/social-rules";
import { computeCategoryScores, computeOverallScore, classifyImpactAndPriority, computeOpportunityScore } from "@/lib/scoring/scoring-engine";
import { generateOpportunity } from "@/lib/scoring/opportunity-generator";
import { recordActivity } from "@/lib/activity";
import type { RuleFinding } from "@/lib/audit/types";

/**
 * Ejecuta una auditoría completa de un negocio: web (si tiene), SEO local,
 * reputación y redes sociales. Es 100% determinista (reglas explícitas) y no
 * requiere IA para funcionar — la IA es una capa opcional de enriquecimiento
 * narrativo por encima de estos hallazgos verificables.
 */
export async function runBusinessAudit(businessId: string): Promise<{ auditId: string }> {
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });

  const audit = await db.audit.create({
    data: { businessId, status: "RUNNING", startedAt: new Date(), triggeredBy: "SYSTEM" },
  });

  try {
    const findings: RuleFinding[] = [];

    if (business.website) {
      const scan = await scanWebsite(business.website);
      findings.push(...evaluateWebsiteRules(scan));
      if (scan.socialLinks) findings.push(...evaluateSocialRules({ socialLinks: scan.socialLinks }, business.category));
    } else {
      findings.push({
        category: "WEBSITE",
        severity: "CRITICAL",
        code: "WEBSITE_MISSING",
        title: "El negocio no tiene página web",
        description:
          "Sin una web propia, el negocio depende por completo de terceros (mapas, redes, directorios) para ser encontrado, y pierde la oportunidad de controlar la primera impresión y comunicar su propuesta de valor de forma completa.",
        recommendation: "Crear una web básica con información de contacto, servicios y llamada a la acción clara.",
      });
      findings.push(...evaluateSocialRules({ socialLinks: {} }, business.category));
    }

    findings.push(...evaluateLocalSeoRules(business));
    findings.push(...evaluateReputationRules({ rating: business.rating, reviewCount: business.reviewCount }));

    const reputationScore = computeReputationScore({ rating: business.rating, reviewCount: business.reviewCount });
    const categoryScores = computeCategoryScores(findings, reputationScore);
    const overallScore = computeOverallScore(categoryScores);
    const { potentialImpact, priority } = classifyImpactAndPriority(overallScore);
    const opportunityScore = computeOpportunityScore(overallScore, business.reviewCount);

    await db.$transaction(async (tx) => {
      for (const finding of findings) {
        const createdFinding = await tx.auditFinding.create({
          data: {
            auditId: audit.id,
            category: finding.category,
            severity: finding.severity,
            code: finding.code,
            title: finding.title,
            description: finding.description,
            evidence: finding.evidence,
            recommendation: finding.recommendation,
          },
        });

        const generated = generateOpportunity(finding);
        await tx.opportunity.create({
          data: {
            businessId,
            findingId: createdFinding.id,
            title: generated.title,
            problem: generated.problem,
            opportunity: generated.opportunity,
            impact: generated.impact,
            solution: generated.solution,
            serviceType: generated.serviceType,
            priority: generated.priority,
          },
        });
      }

      await tx.audit.update({
        where: { id: audit.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          categoryScores: categoryScores as object,
          overallScore,
          potentialImpact,
          priority,
        },
      });

      await tx.business.update({
        where: { id: businessId },
        data: {
          overallScore,
          opportunityScore,
          status: business.status === "NEW" ? "ANALYZED" : business.status,
        },
      });
    });

    await recordActivity({
      organizationId: business.organizationId,
      businessId,
      actorType: "SYSTEM",
      action: "audit.completed",
      after: { overallScore, opportunityScore, findingsCount: findings.length },
    });

    return { auditId: audit.id };
  } catch (error) {
    await db.audit.update({
      where: { id: audit.id },
      data: { status: "FAILED", error: error instanceof Error ? error.message : String(error), completedAt: new Date() },
    });
    throw error;
  }
}
