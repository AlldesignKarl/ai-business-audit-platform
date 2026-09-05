import type { RuleFinding } from "@/lib/audit/types";

export interface ReputationInput {
  rating: number | null;
  reviewCount: number | null;
}

/**
 * Reglas deterministas de reputación. Solo opera sobre datos ya disponibles
 * en el perfil del negocio (rating/nº de reseñas agregado desde la fuente de
 * descubrimiento). No accede a reseñas individuales salvo que exista un
 * conector autorizado (ver ReputationCenter, fase de conectores).
 */
export function evaluateReputationRules(input: ReputationInput): RuleFinding[] {
  const findings: RuleFinding[] = [];

  if (input.reviewCount === null || input.reviewCount === 0) {
    findings.push({
      category: "REPUTATION",
      severity: "HIGH",
      code: "REPUTATION_NO_REVIEWS",
      title: "Sin reseñas públicas",
      description:
        "La ausencia de reseñas dificulta que un cliente potencial valore la confianza en el negocio frente a competidores que sí las muestran, especialmente en decisiones de compra locales.",
      recommendation: "Activar una campaña de solicitud de reseñas auténticas a clientes reales (enlace + QR).",
    });
    return findings;
  }

  if (input.reviewCount < 10) {
    findings.push({
      category: "REPUTATION",
      severity: "MEDIUM",
      code: "REPUTATION_LOW_VOLUME",
      title: "Volumen de reseñas bajo",
      description:
        "Un número reducido de reseñas puede transmitir menos confianza que competidores con mayor volumen, incluso si la valoración media es buena.",
      evidence: `${input.reviewCount} reseñas`,
      recommendation: "Solicitar reseñas de forma sistemática tras cada servicio, siempre a clientes reales.",
    });
  }

  if (input.rating !== null && input.rating < 4.0) {
    findings.push({
      category: "REPUTATION",
      severity: input.rating < 3.5 ? "CRITICAL" : "HIGH",
      code: "REPUTATION_LOW_RATING",
      title: "Valoración media por debajo de 4.0",
      description:
        "Una valoración inferior a 4.0 puede estar disuadiendo a clientes potenciales que comparan varias opciones antes de decidir, incluso antes de visitar la web del negocio.",
      evidence: `${input.rating.toFixed(1)} / 5`,
      recommendation: "Analizar los motivos recurrentes de insatisfacción y desplegar un plan de mejora del servicio junto con gestión activa de reseñas.",
    });
  }

  return findings;
}

/** Reputation Score 0-100, documentado y reproducible (no una caja negra). */
export function computeReputationScore(input: ReputationInput): number {
  if (input.rating === null || input.reviewCount === null || input.reviewCount === 0) return 30;
  const ratingComponent = (input.rating / 5) * 70; // 70% del score
  const volumeComponent = Math.min(input.reviewCount / 50, 1) * 30; // 30% del score, satura en 50 reseñas
  return Math.round(ratingComponent + volumeComponent);
}
