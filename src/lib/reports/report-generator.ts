import { chromium } from "playwright-core";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { buildReportHtml } from "@/lib/reports/report-template";
import { resolveReportStorageDriver } from "@/lib/reports/storage";
import { recordActivity } from "@/lib/activity";

/**
 * Genera el informe PDF de auditoría de un negocio a partir de su última
 * auditoría completada. Usa el Chromium headless preinstalado del entorno
 * (playwright-core, sin descargar navegador aparte).
 */
export async function generateBusinessReport(businessId: string, requestedBy: string): Promise<{ reportId: string; filePath: string }> {
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  const audit = await db.audit.findFirst({
    where: { businessId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    include: { findings: true },
  });
  if (!audit) throw new Error("No hay ninguna auditoría completada para este negocio todavía");

  const opportunities = await db.opportunity.findMany({ where: { businessId }, orderBy: { createdAt: "asc" } });

  const html = buildReportHtml({
    business,
    overallScore: audit.overallScore ?? 0,
    categoryScores: (audit.categoryScores as Record<string, number>) ?? {},
    potentialImpact: audit.potentialImpact ?? "MEDIUM",
    priority: audit.priority ?? "MEDIUM",
    findings: audit.findings,
    opportunities,
    generatedAt: new Date(),
  });

  const executablePath = getEnv().PLAYWRIGHT_EXECUTABLE_PATH ?? "/opt/pw-browsers/chromium";
  const browser = await chromium.launch({ executablePath });
  let pdfBuffer: Buffer;
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }

  const storage = resolveReportStorageDriver();
  const filename = `audit-${business.id}-${Date.now()}.pdf`;
  const { filePath } = await storage.save(filename, pdfBuffer);

  const previousVersions = await db.report.count({ where: { businessId } });
  const report = await db.report.create({
    data: {
      businessId,
      auditId: audit.id,
      generatedBy: requestedBy,
      version: previousVersions + 1,
      storageDriver: storage.name,
      filePath,
      htmlSnapshot: html,
    },
  });

  await recordActivity({
    organizationId: business.organizationId,
    businessId,
    actorType: "USER",
    actorId: requestedBy,
    action: "report.generated",
    after: { reportId: report.id, version: report.version },
  });

  return { reportId: report.id, filePath };
}
