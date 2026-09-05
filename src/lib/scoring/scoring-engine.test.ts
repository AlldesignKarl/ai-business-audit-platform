import { describe, it, expect } from "vitest";
import { computeCategoryScores, computeOverallScore, classifyImpactAndPriority, computeOpportunityScore } from "@/lib/scoring/scoring-engine";
import type { RuleFinding } from "@/lib/audit/types";

describe("scoring-engine", () => {
  it("empieza en 100 por categoría sin hallazgos", () => {
    const scores = computeCategoryScores([]);
    expect(scores.website).toBe(100);
    expect(scores.technical).toBe(100);
  });

  it("descuenta según severidad dentro de su categoría", () => {
    const findings: RuleFinding[] = [
      { category: "WEBSITE", severity: "CRITICAL", code: "X", title: "t", description: "d" },
      { category: "WEBSITE", severity: "LOW", code: "Y", title: "t", description: "d" },
    ];
    const scores = computeCategoryScores(findings);
    expect(scores.website).toBe(100 - 20 - 3);
    expect(scores.technical).toBe(100);
  });

  it("nunca baja de 0", () => {
    const findings: RuleFinding[] = Array.from({ length: 10 }, () => ({
      category: "TECHNICAL",
      severity: "CRITICAL",
      code: "X",
      title: "t",
      description: "d",
    }));
    const scores = computeCategoryScores(findings);
    expect(scores.technical).toBe(0);
  });

  it("permite sobrescribir reputation con el score específico", () => {
    const scores = computeCategoryScores([], 42);
    expect(scores.reputation).toBe(42);
  });

  it("calcula el overall score como media ponderada", () => {
    const scores = { website: 100, localSeo: 100, reputation: 100, social: 100, conversion: 100, technical: 100 };
    expect(computeOverallScore(scores)).toBe(100);
  });

  it("clasifica impacto y prioridad según umbrales", () => {
    expect(classifyImpactAndPriority(30)).toEqual({ potentialImpact: "HIGH", priority: "URGENT" });
    expect(classifyImpactAndPriority(50)).toEqual({ potentialImpact: "HIGH", priority: "HIGH" });
    expect(classifyImpactAndPriority(70)).toEqual({ potentialImpact: "MEDIUM", priority: "MEDIUM" });
    expect(classifyImpactAndPriority(95)).toEqual({ potentialImpact: "LOW", priority: "LOW" });
  });

  it("el opportunity score sube con reseñas reales y overall score bajo", () => {
    const highOpportunity = computeOpportunityScore(30, 20);
    const lowOpportunity = computeOpportunityScore(90, 0);
    expect(highOpportunity).toBeGreaterThan(lowOpportunity);
  });
});
