import type { RuleFinding } from "@/lib/audit/types";
import type { Business } from "@prisma/client";

/**
 * Reglas de SEO local basadas únicamente en los campos que ya tenemos del
 * negocio (perfil descubierto o introducido manualmente). Cuando el negocio
 * conecta su Google Business Profile real (fase de conectores), estas reglas
 * se enriquecen con datos verificados en vez de inferidos.
 */
export function evaluateLocalSeoRules(business: Pick<Business, "googlePlaceId" | "category" | "phone" | "address" | "website">): RuleFinding[] {
  const findings: RuleFinding[] = [];

  if (!business.googlePlaceId) {
    findings.push({
      category: "LOCAL_SEO",
      severity: "CRITICAL",
      code: "LOCAL_SEO_NO_GOOGLE_PROFILE",
      title: "No se encuentra perfil de Google Business verificado",
      description:
        "Sin un perfil de Google Business Profile localizable, el negocio puede estar perdiendo visibilidad en el mapa y en las búsquedas locales ('cerca de mí'), donde suele concentrarse buena parte de la demanda local.",
      recommendation: "Crear y verificar el perfil de Google Business Profile del negocio.",
    });
  }

  if (!business.category) {
    findings.push({
      category: "LOCAL_SEO",
      severity: "MEDIUM",
      code: "LOCAL_SEO_MISSING_CATEGORY",
      title: "Categoría de negocio no identificada",
      description: "Una categoría ausente o genérica reduce las probabilidades de aparecer en búsquedas específicas del sector.",
      recommendation: "Asegurar que la categoría principal y las secundarias del perfil reflejan con precisión los servicios ofrecidos.",
    });
  }

  if (!business.phone) {
    findings.push({
      category: "LOCAL_SEO",
      severity: "HIGH",
      code: "LOCAL_SEO_MISSING_PHONE",
      title: "Sin teléfono público registrado",
      description: "La falta de un teléfono consistente entre plataformas dificulta el contacto directo desde búsquedas locales y mapas.",
      recommendation: "Publicar un teléfono de contacto único y consistente en todas las plataformas (web, Google, redes).",
    });
  }

  if (!business.address) {
    findings.push({
      category: "LOCAL_SEO",
      severity: "MEDIUM",
      code: "LOCAL_SEO_MISSING_ADDRESS",
      title: "Dirección no disponible",
      description: "Sin una dirección clara y consistente, los negocios con ubicación física pueden perder relevancia en búsquedas de proximidad.",
      recommendation: "Publicar y mantener la dirección consistente en el perfil de Google y en la web.",
    });
  }

  return findings;
}
