import type { RuleFinding } from "@/lib/audit/types";
import type { WebsiteScanResult } from "@/lib/audit/website-scan";

/**
 * Sectores donde una presencia activa en redes visuales (Instagram/TikTok)
 * suele tener un impacto directo en la captación. Fuera de esta lista, la
 * ausencia de redes se trata como oportunidad menor, no como problema — la
 * IA no debe asumir que todos los negocios necesitan las mismas redes.
 */
const VISUAL_SOCIAL_SECTORS = [
  "restaurante", "restaurant", "cafeteria", "cafetería", "peluqueria", "peluquería",
  "estetica", "estética", "moda", "ropa", "hotel", "gimnasio", "spa", "belleza", "reposteria", "repostería",
];

export function evaluateSocialRules(scan: Pick<WebsiteScanResult, "socialLinks">, category: string | null): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const categoryLower = (category ?? "").toLowerCase();
  const isVisualSector = VISUAL_SOCIAL_SECTORS.some((s) => categoryLower.includes(s));

  const hasAnySocial = Object.values(scan.socialLinks).some(Boolean);

  if (!scan.socialLinks.instagram && isVisualSector) {
    findings.push({
      category: "SOCIAL",
      severity: "HIGH",
      code: "SOCIAL_NO_INSTAGRAM_VISUAL_SECTOR",
      title: "Sin presencia en Instagram (sector visual)",
      description:
        "En sectores donde la decisión de compra se apoya mucho en lo visual, no tener Instagram enlazado desde la web puede estar reduciendo el alcance entre clientes potenciales que descubren negocios locales a través de esa red.",
      recommendation: "Crear y enlazar un perfil de Instagram activo, coherente con el branding del negocio.",
    });
  } else if (!scan.socialLinks.instagram) {
    findings.push({
      category: "SOCIAL",
      severity: "OPPORTUNITY",
      code: "SOCIAL_NO_INSTAGRAM",
      title: "Sin Instagram enlazado",
      description: "Instagram no es imprescindible para todos los sectores, pero puede representar una oportunidad de visibilidad adicional según el público objetivo.",
      recommendation: "Valorar si el público objetivo del negocio está presente en Instagram antes de invertir en este canal.",
    });
  }

  if (!scan.socialLinks.facebook) {
    findings.push({
      category: "SOCIAL",
      severity: "OPPORTUNITY",
      code: "SOCIAL_NO_FACEBOOK",
      title: "Sin Facebook enlazado",
      description: "Facebook sigue siendo relevante para búsquedas locales y reseñas en varios sectores y franjas de edad.",
      recommendation: "Evaluar la creación de una página de Facebook si el público objetivo lo justifica.",
    });
  }

  if (!hasAnySocial) {
    findings.push({
      category: "SOCIAL",
      severity: "MEDIUM",
      code: "SOCIAL_NO_PRESENCE_AT_ALL",
      title: "Ninguna red social enlazada desde la web",
      description:
        "La ausencia total de enlaces a redes sociales puede transmitir una sensación de negocio menos activo o actualizado a quien visita la web antes de decidir confiar en el negocio.",
      recommendation: "Enlazar desde la web al menos un canal social activo, coherente con el sector y el público objetivo.",
    });
  }

  return findings;
}
