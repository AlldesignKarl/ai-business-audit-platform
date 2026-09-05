import type { FindingCategory, RuleFinding } from "@/lib/audit/types";

export interface CategoryScores {
  website: number;
  localSeo: number;
  reputation: number;
  social: number;
  conversion: number;
  technical: number;
}

const SEVERITY_DEDUCTION: Record<RuleFinding["severity"], number> = {
  CRITICAL: 20,
  HIGH: 12,
  MEDIUM: 6,
  LOW: 3,
  OPPORTUNITY: 0,
};

const CATEGORY_KEY: Record<FindingCategory, keyof CategoryScores> = {
  WEBSITE: "website",
  LOCAL_SEO: "localSeo",
  REPUTATION: "reputation",
  SOCIAL: "social",
  CONVERSION: "conversion",
  TECHNICAL: "technical",
};

const CATEGORY_WEIGHT: Record<keyof CategoryScores, number> = {
  website: 0.2,
  localSeo: 0.2,
  reputation: 0.2,
  social: 0.1,
  conversion: 0.2,
  technical: 0.1,
};

/**
 * Motor de scoring determinista y transparente (nunca una caja negra):
 * cada categoría parte de 100 y se descuenta según la severidad de los
 * hallazgos que le pertenecen. El overall score es la media ponderada.
 */
export function computeCategoryScores(findings: RuleFinding[], reputationScoreOverride?: number): CategoryScores {
  const scores: CategoryScores = { website: 100, localSeo: 100, reputation: 100, social: 100, conversion: 100, technical: 100 };

  for (const finding of findings) {
    const key = CATEGORY_KEY[finding.category];
    scores[key] = Math.max(0, scores[key] - SEVERITY_DEDUCTION[finding.severity]);
  }

  if (reputationScoreOverride !== undefined) {
    scores.reputation = reputationScoreOverride;
  }

  return scores;
}

export function computeOverallScore(scores: CategoryScores): number {
  const weighted = (Object.keys(scores) as (keyof CategoryScores)[]).reduce(
    (sum, key) => sum + scores[key] * CATEGORY_WEIGHT[key],
    0
  );
  return Math.round(weighted);
}

export type PotentialImpact = "HIGH" | "MEDIUM" | "LOW";
export type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export function classifyImpactAndPriority(overallScore: number): { potentialImpact: PotentialImpact; priority: Priority } {
  if (overallScore <= 40) return { potentialImpact: "HIGH", priority: "URGENT" };
  if (overallScore <= 60) return { potentialImpact: "HIGH", priority: "HIGH" };
  if (overallScore <= 75) return { potentialImpact: "MEDIUM", priority: "MEDIUM" };
  return { potentialImpact: "LOW", priority: "LOW" };
}

/**
 * Opportunity Score de prospección (0-100): cuánta oportunidad comercial
 * representa este negocio para la agencia. No es lo mismo que el overall
 * score de salud digital — un negocio con muchos problemas pero actividad
 * real demostrable (reseñas) es un lead de mayor oportunidad que uno con
 * pocos problemas o que no parece un negocio activo.
 */
export function computeOpportunityScore(overallScore: number, reviewCount: number | null): number {
  let score = 100 - overallScore;
  if (reviewCount === null || reviewCount === 0) score -= 15;
  else if (reviewCount >= 5) score += 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}
