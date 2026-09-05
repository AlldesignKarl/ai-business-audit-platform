import * as cheerio from "cheerio";
import { isPathAllowedByRobots, AUDIT_USER_AGENT } from "@/lib/audit/robots";

export interface WebsiteScanResult {
  url: string;
  reachable: boolean;
  error?: string;
  https: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  htmlSizeBytes?: number;
  title?: string;
  titleLength?: number;
  metaDescription?: string;
  metaDescriptionLength?: number;
  hasViewportMeta?: boolean;
  h1Count?: number;
  headingsOutOfOrder?: boolean;
  imagesTotal?: number;
  imagesWithoutAlt?: number;
  linksTotal?: number;
  internalLinksSampleChecked?: number;
  brokenLinksFound?: number;
  formsCount?: number;
  wordCount?: number;
  hasPhoneText?: boolean;
  hasEmailText?: boolean;
  hasVisibleAddressHint?: boolean;
  hasWhatsappLink?: boolean;
  hasBookingLink?: boolean;
  hasCtaAboveFold?: boolean;
  socialLinks: { instagram?: string; facebook?: string; tiktok?: string; linkedin?: string; youtube?: string };
  hasSitemap?: boolean;
}

const PHONE_REGEX = /(\+?\d[\d\s().-]{7,}\d)/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CTA_KEYWORDS = ["reserva", "reservar", "contacta", "contactar", "llama", "pide cita", "comprar", "book now", "contact us", "call now", "pedir cita", "solicitar presupuesto"];
const BOOKING_HINTS = ["calendly", "booking.com", "cita previa", "reserva online", "book-appointment", "acuity", "square appointments"];

/**
 * Analiza técnicamente una web pública. Solo lee HTML servido públicamente
 * (fetch estándar, sin evadir bloqueos), respeta robots.txt, y nunca inventa
 * señales que no puede observar directamente.
 */
export async function scanWebsite(rawUrl: string): Promise<WebsiteScanResult> {
  let url: URL;
  try {
    url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
  } catch {
    return { url: rawUrl, reachable: false, error: "URL inválida", https: false, socialLinks: {} };
  }

  const allowed = await isPathAllowedByRobots(url.origin, url.pathname || "/");
  if (!allowed) {
    return { url: url.toString(), reachable: false, error: "Bloqueado por robots.txt", https: url.protocol === "https:", socialLinks: {} };
  }

  const start = Date.now();
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": AUDIT_USER_AGENT },
    });
  } catch (error) {
    return {
      url: url.toString(),
      reachable: false,
      error: error instanceof Error ? error.message : "No se pudo conectar",
      https: url.protocol === "https:",
      socialLinks: {},
    };
  }
  const responseTimeMs = Date.now() - start;
  const html = await res.text();
  const $ = cheerio.load(html);
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();

  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const hasViewportMeta = $('meta[name="viewport"]').length > 0;

  const headingLevels = $("h1,h2,h3").map((_, el) => Number(el.tagName.replace("h", ""))).get();
  let headingsOutOfOrder = false;
  for (let i = 1; i < headingLevels.length; i++) {
    const prev = headingLevels[i - 1];
    const curr = headingLevels[i];
    if (prev !== undefined && curr !== undefined && curr - prev > 1) headingsOutOfOrder = true;
  }

  const images = $("img");
  const imagesWithoutAlt = images.filter((_, el) => !$(el).attr("alt")?.trim()).length;

  const allLinks = $("a[href]");
  const hrefs = allLinks.map((_, el) => $(el).attr("href") ?? "").get();
  const socialLinks: WebsiteScanResult["socialLinks"] = {};
  for (const href of hrefs) {
    if (/instagram\.com/i.test(href)) socialLinks.instagram = href;
    if (/facebook\.com/i.test(href)) socialLinks.facebook = href;
    if (/tiktok\.com/i.test(href)) socialLinks.tiktok = href;
    if (/linkedin\.com/i.test(href)) socialLinks.linkedin = href;
    if (/youtube\.com/i.test(href)) socialLinks.youtube = href;
  }
  const hasWhatsappLink = hrefs.some((h) => /wa\.me|whatsapp\.com|api\.whatsapp/i.test(h));
  const hasBookingLink = hrefs.some((h) => BOOKING_HINTS.some((hint) => h.toLowerCase().includes(hint)));

  const internalLinks = hrefs
    .filter((h) => h && !h.startsWith("#") && !h.startsWith("mailto:") && !h.startsWith("tel:"))
    .map((h) => {
      try {
        return new URL(h, url.toString()).toString();
      } catch {
        return null;
      }
    })
    .filter((h): h is string => h !== null)
    .filter((h) => new URL(h).origin === url.origin);

  const sample = Array.from(new Set(internalLinks)).slice(0, 8);
  let brokenLinksFound = 0;
  await Promise.all(
    sample.map(async (link) => {
      try {
        const linkRes = await fetch(link, { method: "HEAD", signal: AbortSignal.timeout(6000), headers: { "User-Agent": AUDIT_USER_AGENT } });
        if (linkRes.status >= 400) brokenLinksFound++;
      } catch {
        brokenLinksFound++;
      }
    })
  );

  let hasSitemap = false;
  try {
    const sitemapRes = await fetch(new URL("/sitemap.xml", url.origin).toString(), { method: "HEAD", signal: AbortSignal.timeout(5000) });
    hasSitemap = sitemapRes.ok;
  } catch {
    hasSitemap = false;
  }

  const ctaHtml = $("a,button").map((_, el) => $(el).text().toLowerCase()).get().join(" ");

  return {
    url: url.toString(),
    reachable: true,
    https: url.protocol === "https:" && res.url.startsWith("https:"),
    statusCode: res.status,
    responseTimeMs,
    htmlSizeBytes: Buffer.byteLength(html, "utf8"),
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    hasViewportMeta,
    h1Count: $("h1").length,
    headingsOutOfOrder,
    imagesTotal: images.length,
    imagesWithoutAlt,
    linksTotal: allLinks.length,
    internalLinksSampleChecked: sample.length,
    brokenLinksFound,
    formsCount: $("form").length,
    wordCount: bodyText.split(/\s+/).filter(Boolean).length,
    hasPhoneText: PHONE_REGEX.test(bodyText),
    hasEmailText: EMAIL_REGEX.test(bodyText),
    hasVisibleAddressHint: /\b(calle|avenida|c\/|plaza|street|st\.|ave\.)\b/i.test(bodyText),
    hasWhatsappLink,
    hasBookingLink,
    hasCtaAboveFold: CTA_KEYWORDS.some((kw) => ctaHtml.includes(kw)),
    socialLinks,
    hasSitemap,
  };
}
