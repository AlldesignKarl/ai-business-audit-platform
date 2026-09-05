import { describe, it, expect } from "vitest";
import { generateOpportunity } from "@/lib/scoring/opportunity-generator";
import type { RuleFinding } from "@/lib/audit/types";

describe("opportunity-generator", () => {
  it("mapea un código conocido a un tipo de servicio específico", () => {
    const finding: RuleFinding = {
      category: "TECHNICAL",
      severity: "CRITICAL",
      code: "WEBSITE_NO_HTTPS",
      title: "Sin HTTPS",
      description: "desc",
      recommendation: "Instalar SSL",
    };
    const opportunity = generateOpportunity(finding);
    expect(opportunity.serviceType).toBe("TECHNICAL_FIX");
    expect(opportunity.priority).toBe("URGENT");
  });

  it("nunca se queda sin oportunidad para un código desconocido", () => {
    const finding: RuleFinding = {
      category: "SOCIAL",
      severity: "LOW",
      code: "SOME_UNKNOWN_CODE",
      title: "t",
      description: "d",
      recommendation: "hacer algo",
    };
    const opportunity = generateOpportunity(finding);
    expect(opportunity.opportunity).toBe("hacer algo");
    expect(opportunity.serviceType).toBe("GENERAL_CONSULTING");
    expect(opportunity.priority).toBe("LOW");
  });

  it("nunca inventa impacto fuera de la categoría de la regla", () => {
    const finding: RuleFinding = { category: "REPUTATION", severity: "HIGH", code: "X", title: "t", description: "d" };
    const opportunity = generateOpportunity(finding);
    expect(opportunity.impact).toMatch(/confianza/i);
  });
});
