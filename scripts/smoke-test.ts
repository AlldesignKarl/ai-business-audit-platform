import "dotenv/config";
import { db } from "@/lib/db";
import { runBusinessAudit } from "@/lib/audit/engine";
import { generateBusinessReport } from "@/lib/reports/report-generator";

async function main() {
  const business = await db.business.findFirstOrThrow({ where: { name: { contains: "El Fogón" } } });
  console.log("Business:", business.name, business.id);

  const { auditId } = await runBusinessAudit(business.id);
  console.log("Audit completed:", auditId);

  const updated = await db.business.findUniqueOrThrow({ where: { id: business.id } });
  console.log("overallScore:", updated.overallScore, "opportunityScore:", updated.opportunityScore, "status:", updated.status);

  const findings = await db.auditFinding.findMany({ where: { auditId } });
  console.log("findings:", findings.length);
  const opportunities = await db.opportunity.findMany({ where: { businessId: business.id } });
  console.log("opportunities:", opportunities.length);

  const { reportId, filePath } = await generateBusinessReport(business.id, "smoke-test-script");
  console.log("Report generated:", reportId, filePath);
}

main()
  .catch((e) => {
    console.error("SMOKE TEST FAILED:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
