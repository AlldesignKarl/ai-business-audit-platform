import { describe, it, expect } from "vitest";
import { evaluateWebsiteRules } from "@/lib/audit/rules/website-rules";
import type { WebsiteScanResult } from "@/lib/audit/website-scan";

function baseScan(overrides: Partial<WebsiteScanResult> = {}): WebsiteScanResult {
  return {
    url: "https://example.com",
    reachable: true,
    https: true,
    statusCode: 200,
    responseTimeMs: 500,
    title: "Ejemplo — Restaurante en Zaragoza",
    titleLength: 30,
    metaDescription: "Restaurante familiar en el centro de Zaragoza",
    metaDescriptionLength: 45,
    hasViewportMeta: true,
    h1Count: 1,
    headingsOutOfOrder: false,
    imagesTotal: 4,
    imagesWithoutAlt: 0,
    linksTotal: 10,
    internalLinksSampleChecked: 5,
    brokenLinksFound: 0,
    formsCount: 1,
    wordCount: 200,
    hasPhoneText: true,
    hasEmailText: true,
    hasVisibleAddressHint: true,
    hasWhatsappLink: true,
    hasBookingLink: true,
    hasCtaAboveFold: true,
    socialLinks: { instagram: "https://instagram.com/x" },
    hasSitemap: true,
    ...overrides,
  };
}

describe("evaluateWebsiteRules", () => {
  it("no genera hallazgos críticos para una web bien construida", () => {
    const findings = evaluateWebsiteRules(baseScan());
    const critical = findings.filter((f) => f.severity === "CRITICAL");
    expect(critical).toHaveLength(0);
  });

  it("detecta ausencia de HTTPS como crítico", () => {
    const findings = evaluateWebsiteRules(baseScan({ https: false }));
    expect(findings.some((f) => f.code === "WEBSITE_NO_HTTPS" && f.severity === "CRITICAL")).toBe(true);
  });

  it("detecta falta de viewport como crítico (no mobile friendly)", () => {
    const findings = evaluateWebsiteRules(baseScan({ hasViewportMeta: false }));
    expect(findings.some((f) => f.code === "WEBSITE_NOT_MOBILE_FRIENDLY")).toBe(true);
  });

  it("detecta ausencia total de contacto visible", () => {
    const findings = evaluateWebsiteRules(baseScan({ hasPhoneText: false, hasEmailText: false }));
    expect(findings.some((f) => f.code === "WEBSITE_NO_VISIBLE_CONTACT")).toBe(true);
  });

  it("marca la web como no accesible cuando no responde", () => {
    const findings = evaluateWebsiteRules(baseScan({ reachable: false, error: "timeout" }));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe("WEBSITE_UNREACHABLE");
  });
});
