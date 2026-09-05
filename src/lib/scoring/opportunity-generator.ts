import type { RuleFinding } from "@/lib/audit/types";
import type { OpportunityPriority } from "@prisma/client";

export interface GeneratedOpportunity {
  code: string;
  title: string;
  problem: string;
  opportunity: string;
  impact: string;
  solution: string;
  serviceType: string;
  priority: OpportunityPriority;
}

const SEVERITY_TO_PRIORITY: Record<RuleFinding["severity"], OpportunityPriority> = {
  CRITICAL: "URGENT",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  OPPORTUNITY: "LOW",
};

/**
 * Tabla de traducción problema -> oportunidad comercial para los códigos de
 * regla más frecuentes. Para cualquier código no listado, se usa un mapeo
 * genérico basado en la propia descripción/recomendación de la regla — así
 * el sistema nunca se queda sin oportunidad que ofrecer, y nunca inventa
 * datos fuera de lo que la regla ya evidenció.
 */
const CODE_TO_SERVICE: Record<string, { opportunity: string; serviceType: string }> = {
  WEBSITE_NO_HTTPS: { opportunity: "Migración a HTTPS y hardening básico de seguridad", serviceType: "TECHNICAL_FIX" },
  WEBSITE_NOT_MOBILE_FRIENDLY: { opportunity: "Rediseño responsive de la web", serviceType: "WEBSITE_REDESIGN" },
  WEBSITE_NO_CLEAR_CTA: { opportunity: "Rediseño de página de inicio orientado a conversión", serviceType: "WEBSITE_REDESIGN" },
  WEBSITE_NO_VISIBLE_CONTACT: { opportunity: "Normalización de información de contacto en la web", serviceType: "WEBSITE_REDESIGN" },
  WEBSITE_NO_WHATSAPP: { opportunity: "Integración de WhatsApp Business en la web", serviceType: "AUTOMATION" },
  WEBSITE_NO_ONLINE_BOOKING: { opportunity: "Implantación de sistema de reservas online", serviceType: "AUTOMATION" },
  LOCAL_SEO_NO_GOOGLE_PROFILE: { opportunity: "Creación y optimización de Google Business Profile", serviceType: "LOCAL_SEO" },
  REPUTATION_NO_REVIEWS: { opportunity: "Programa de crecimiento de reseñas auténticas", serviceType: "REPUTATION_MANAGEMENT" },
  REPUTATION_LOW_VOLUME: { opportunity: "Programa de crecimiento de reseñas auténticas", serviceType: "REPUTATION_MANAGEMENT" },
  REPUTATION_LOW_RATING: { opportunity: "Gestión activa de reputación y respuesta a reseñas", serviceType: "REPUTATION_MANAGEMENT" },
  SOCIAL_NO_INSTAGRAM_VISUAL_SECTOR: { opportunity: "Puesta en marcha de estrategia de contenido en Instagram", serviceType: "SOCIAL_MEDIA" },
  SOCIAL_NO_PRESENCE_AT_ALL: { opportunity: "Estrategia inicial de presencia en redes sociales", serviceType: "SOCIAL_MEDIA" },
};

export function generateOpportunity(finding: RuleFinding): GeneratedOpportunity {
  const mapping = CODE_TO_SERVICE[finding.code] ?? {
    opportunity: finding.recommendation ?? "Mejora de presencia digital",
    serviceType: "GENERAL_CONSULTING",
  };

  return {
    code: finding.code,
    title: finding.title,
    problem: finding.description,
    opportunity: mapping.opportunity,
    impact: impactSentenceForCategory(finding.category),
    solution: finding.recommendation ?? mapping.opportunity,
    serviceType: mapping.serviceType,
    priority: SEVERITY_TO_PRIORITY[finding.severity],
  };
}

function impactSentenceForCategory(category: RuleFinding["category"]): string {
  switch (category) {
    case "WEBSITE":
      return "Impacto potencial en la primera impresión y la conversión de visitantes en clientes.";
    case "TECHNICAL":
      return "Impacto potencial en la accesibilidad, el SEO técnico y la experiencia de usuario.";
    case "LOCAL_SEO":
      return "Impacto potencial en la visibilidad en búsquedas y mapas locales.";
    case "REPUTATION":
      return "Impacto potencial en la confianza que un cliente potencial deposita en el negocio antes de decidir.";
    case "SOCIAL":
      return "Impacto potencial en el alcance y la conexión con la audiencia objetivo.";
    case "CONVERSION":
      return "Impacto potencial en la tasa de conversión de visitantes en clientes.";
    default:
      return "Impacto potencial en el crecimiento digital del negocio.";
  }
}
