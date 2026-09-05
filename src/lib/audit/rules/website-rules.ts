import type { WebsiteScanResult } from "@/lib/audit/website-scan";
import type { RuleFinding } from "@/lib/audit/types";

/**
 * Reglas deterministas sobre la web (WEBSITE, TECHNICAL y CONVERSION). Cada
 * regla explica el "por qué" en su descripción — no se limita a constatar un
 * hecho ("no tiene X") sino su posible efecto sobre el negocio.
 */
export function evaluateWebsiteRules(scan: WebsiteScanResult): RuleFinding[] {
  const findings: RuleFinding[] = [];

  if (!scan.reachable) {
    findings.push({
      category: "TECHNICAL",
      severity: "CRITICAL",
      code: "WEBSITE_UNREACHABLE",
      title: "La web no responde",
      description:
        "No ha sido posible acceder a la web pública del negocio. Mientras esto persista, la web no puede generar ningún cliente ni reforzar la confianza de quien la busca.",
      evidence: scan.error,
      recommendation: "Revisar hosting, DNS y certificado del dominio con carácter urgente.",
    });
    return findings;
  }

  if (!scan.https) {
    findings.push({
      category: "TECHNICAL",
      severity: "CRITICAL",
      code: "WEBSITE_NO_HTTPS",
      title: "La web no usa HTTPS",
      description:
        "Los navegadores marcan como 'no seguro' cualquier web sin HTTPS, lo que puede generar desconfianza inmediata en visitantes potenciales y penaliza el posicionamiento en buscadores.",
      recommendation: "Instalar un certificado SSL/TLS (gratuito vía Let's Encrypt en la mayoría de hostings).",
    });
  }

  if (scan.responseTimeMs && scan.responseTimeMs > 3000) {
    findings.push({
      category: "TECHNICAL",
      severity: scan.responseTimeMs > 6000 ? "HIGH" : "MEDIUM",
      code: "WEBSITE_SLOW_RESPONSE",
      title: "Tiempo de carga elevado",
      description:
        "Un tiempo de respuesta por encima de 3 segundos puede estar provocando que parte de los visitantes abandonen la web antes de que termine de cargar, especialmente en móvil.",
      evidence: `${scan.responseTimeMs} ms`,
      recommendation: "Optimizar imágenes, activar caché y revisar el hosting.",
    });
  }

  if (!scan.title || scan.titleLength === 0) {
    findings.push({
      category: "WEBSITE",
      severity: "HIGH",
      code: "WEBSITE_MISSING_TITLE",
      title: "Falta la etiqueta <title>",
      description:
        "Sin un título de página, los resultados de búsqueda muestran un texto genérico, lo que reduce las probabilidades de que un cliente potencial haga clic.",
      recommendation: "Añadir un título único y descriptivo por página (50-60 caracteres).",
    });
  } else if ((scan.titleLength ?? 0) > 65) {
    findings.push({
      category: "WEBSITE",
      severity: "LOW",
      code: "WEBSITE_TITLE_TOO_LONG",
      title: "Título de página demasiado largo",
      description: "Google puede recortar el título en los resultados de búsqueda, ocultando información relevante para el cliente.",
      evidence: `${scan.titleLength} caracteres`,
      recommendation: "Acortar el título a 50-60 caracteres manteniendo la parte más relevante al inicio.",
    });
  }

  if (!scan.metaDescription) {
    findings.push({
      category: "WEBSITE",
      severity: "MEDIUM",
      code: "WEBSITE_MISSING_META_DESCRIPTION",
      title: "Falta la meta description",
      description:
        "Sin meta description, Google genera un fragmento automático que a menudo no comunica bien la propuesta de valor del negocio, reduciendo el atractivo del resultado en búsquedas.",
      recommendation: "Redactar una meta description de 140-160 caracteres con una llamada a la acción clara.",
    });
  }

  if (!scan.hasViewportMeta) {
    findings.push({
      category: "TECHNICAL",
      severity: "CRITICAL",
      code: "WEBSITE_NOT_MOBILE_FRIENDLY",
      title: "La web no está adaptada a móvil",
      description:
        "La mayoría del tráfico de búsqueda local llega desde el móvil. Una web no responsive puede estar frustrando a la mayoría de los visitantes potenciales antes de que encuentren la información que buscan.",
      recommendation: "Aplicar un diseño responsive (meta viewport + CSS adaptable).",
    });
  }

  if ((scan.h1Count ?? 0) === 0) {
    findings.push({
      category: "WEBSITE",
      severity: "MEDIUM",
      code: "WEBSITE_MISSING_H1",
      title: "Sin encabezado principal (H1)",
      description: "La ausencia de un H1 dificulta tanto a los buscadores como a los propios visitantes entender rápidamente de qué trata la página.",
      recommendation: "Añadir un H1 claro con el mensaje principal de la página.",
    });
  } else if ((scan.h1Count ?? 0) > 1) {
    findings.push({
      category: "WEBSITE",
      severity: "LOW",
      code: "WEBSITE_MULTIPLE_H1",
      title: "Varios encabezados H1 en la misma página",
      description: "Tener más de un H1 diluye la jerarquía visual y de contenido, dificultando identificar el mensaje principal.",
      recommendation: "Mantener un único H1 por página y usar H2/H3 para el resto de la jerarquía.",
    });
  }

  if (scan.headingsOutOfOrder) {
    findings.push({
      category: "WEBSITE",
      severity: "LOW",
      code: "WEBSITE_HEADING_HIERARCHY",
      title: "Jerarquía de encabezados desordenada",
      description: "Saltar niveles de encabezado (p.ej. de H1 a H3) puede dificultar la navegación a usuarios con lectores de pantalla y confundir a los buscadores sobre la estructura del contenido.",
      recommendation: "Ordenar los encabezados de forma secuencial (H1 > H2 > H3).",
    });
  }

  if ((scan.imagesTotal ?? 0) > 0 && (scan.imagesWithoutAlt ?? 0) / (scan.imagesTotal || 1) > 0.5) {
    findings.push({
      category: "TECHNICAL",
      severity: "MEDIUM",
      code: "WEBSITE_IMAGES_MISSING_ALT",
      title: "La mayoría de imágenes no tiene texto alternativo",
      description:
        "Esto afecta tanto a la accesibilidad (usuarios con lectores de pantalla no pueden entender el contenido visual) como al SEO de imágenes, reduciendo oportunidades de visibilidad adicional.",
      evidence: `${scan.imagesWithoutAlt}/${scan.imagesTotal} imágenes sin atributo alt`,
      recommendation: "Añadir texto alternativo descriptivo a las imágenes relevantes.",
    });
  }

  if ((scan.brokenLinksFound ?? 0) > 0) {
    findings.push({
      category: "TECHNICAL",
      severity: (scan.brokenLinksFound ?? 0) >= 3 ? "HIGH" : "MEDIUM",
      code: "WEBSITE_BROKEN_LINKS",
      title: "Enlaces internos rotos detectados",
      description:
        "Un enlace roto interrumpe la navegación del visitante en un momento clave y transmite una imagen de abandono o desactualización del negocio.",
      evidence: `${scan.brokenLinksFound} de ${scan.internalLinksSampleChecked} enlaces muestreados devuelven error`,
      recommendation: "Revisar y corregir los enlaces internos rotos.",
    });
  }

  if (!scan.hasPhoneText && !scan.hasEmailText) {
    findings.push({
      category: "CONVERSION",
      severity: "CRITICAL",
      code: "WEBSITE_NO_VISIBLE_CONTACT",
      title: "No se detecta teléfono ni email visibles",
      description:
        "Si un visitante interesado no encuentra rápidamente una forma de contactar, es muy probable que abandone la web y contacte con un competidor cuya información sea más accesible.",
      recommendation: "Mostrar teléfono y/o email de forma visible en la cabecera o pie de página de todas las páginas.",
    });
  }

  if (!scan.hasCtaAboveFold) {
    findings.push({
      category: "CONVERSION",
      severity: "HIGH",
      code: "WEBSITE_NO_CLEAR_CTA",
      title: "No hay una llamada a la acción clara",
      description:
        "Sin un CTA visible (reservar, llamar, pedir presupuesto...), el visitante no tiene claro cuál es el siguiente paso, lo que reduce las probabilidades de conversión aunque el contenido le interese.",
      recommendation: "Añadir un botón de llamada a la acción visible y específico ('Reserva tu cita', 'Llámanos ahora'...).",
    });
  }

  if (!scan.hasWhatsappLink) {
    findings.push({
      category: "CONVERSION",
      severity: "OPPORTUNITY",
      code: "WEBSITE_NO_WHATSAPP",
      title: "Sin enlace directo a WhatsApp",
      description:
        "Para muchos negocios locales, WhatsApp reduce la fricción de contacto frente a llamada o email, especialmente entre clientes más jóvenes.",
      recommendation: "Añadir un botón/enlace directo a WhatsApp Business si encaja con el perfil de cliente del negocio.",
    });
  }

  if (!scan.hasBookingLink) {
    findings.push({
      category: "CONVERSION",
      severity: "OPPORTUNITY",
      code: "WEBSITE_NO_ONLINE_BOOKING",
      title: "Sin sistema de reserva online",
      description:
        "Cuando el sector lo permite (restauración, salud, belleza, servicios con cita previa), no ofrecer reserva online obliga al cliente a llamar en horario comercial, lo que puede perder reservas fuera de ese horario.",
      recommendation: "Evaluar la implantación de un sistema de reservas online si el sector del negocio lo justifica.",
    });
  }

  if (!scan.hasSitemap) {
    findings.push({
      category: "TECHNICAL",
      severity: "LOW",
      code: "WEBSITE_NO_SITEMAP",
      title: "No se encuentra sitemap.xml",
      description: "Un sitemap ayuda a los buscadores a descubrir e indexar todas las páginas relevantes, especialmente en webs con muchas páginas.",
      recommendation: "Generar y publicar un sitemap.xml, y declararlo en Google Search Console.",
    });
  }

  return findings;
}
