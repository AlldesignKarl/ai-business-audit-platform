import type { AuditFinding, Business, Opportunity } from "@prisma/client";

export interface ReportData {
  business: Business;
  overallScore: number;
  categoryScores: Record<string, number>;
  potentialImpact: string;
  priority: string;
  findings: AuditFinding[];
  opportunities: Opportunity[];
  generatedAt: Date;
}

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, OPPORTUNITY: 4 };
const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: "Crítico",
  HIGH: "Alto",
  MEDIUM: "Medio",
  LOW: "Bajo",
  OPPORTUNITY: "Oportunidad",
};
const CATEGORY_LABEL: Record<string, string> = {
  WEBSITE: "Web",
  LOCAL_SEO: "SEO Local",
  REPUTATION: "Reputación",
  SOCIAL: "Redes Sociales",
  CONVERSION: "Conversión",
  TECHNICAL: "Técnico",
};

function scoreColor(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

function findingsByCategory(findings: AuditFinding[], category: string): AuditFinding[] {
  return findings.filter((f) => f.category === category).sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9));
}

function renderFindingsSection(title: string, findings: AuditFinding[]): string {
  if (findings.length === 0) return `<h3>${title}</h3><p class="muted">Sin hallazgos relevantes en esta categoría.</p>`;
  return `
    <h3>${title}</h3>
    <table class="findings">
      <thead><tr><th>Severidad</th><th>Hallazgo</th><th>Descripción</th><th>Recomendación</th></tr></thead>
      <tbody>
        ${findings
          .map(
            (f) => `
          <tr>
            <td><span class="badge badge-${f.severity.toLowerCase()}">${SEVERITY_LABEL[f.severity]}</span></td>
            <td>${escapeHtml(f.title)}</td>
            <td>${escapeHtml(f.description)}</td>
            <td>${escapeHtml(f.recommendation ?? "-")}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

export function buildReportHtml(data: ReportData): string {
  const topProblems = [...data.findings]
    .filter((f) => f.severity !== "OPPORTUNITY")
    .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))
    .slice(0, 10);

  const opportunities30 = data.opportunities.filter((o) => o.priority === "URGENT");
  const opportunities60 = data.opportunities.filter((o) => o.priority === "HIGH");
  const opportunities90 = data.opportunities.filter((o) => o.priority === "MEDIUM" || o.priority === "LOW");

  return `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 28mm 18mm; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.5; font-size: 13px; }
  h1 { font-size: 28px; margin-bottom: 4px; }
  h2 { font-size: 19px; margin-top: 36px; border-bottom: 2px solid #111; padding-bottom: 6px; }
  h3 { font-size: 15px; margin-top: 22px; color: #333; }
  .cover { text-align: center; padding-top: 120px; page-break-after: always; }
  .cover .eyebrow { letter-spacing: 3px; text-transform: uppercase; color: #6b7280; font-size: 12px; }
  .cover h1 { font-size: 40px; margin-top: 12px; }
  .cover .business-name { font-size: 22px; margin-top: 24px; font-weight: 600; }
  .cover .date { color: #6b7280; margin-top: 8px; }
  .score-grid { display: flex; gap: 16px; flex-wrap: wrap; margin: 20px 0; }
  .score-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 18px; min-width: 130px; }
  .score-card .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
  .score-card .value { font-size: 26px; font-weight: 700; }
  .overall { border: 2px solid #111; }
  table.findings { width: 100%; border-collapse: collapse; margin-top: 10px; }
  table.findings th, table.findings td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; font-size: 11.5px; }
  table.findings th { background: #f9fafb; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 600; color: #fff; }
  .badge-critical { background: #dc2626; }
  .badge-high { background: #ea580c; }
  .badge-medium { background: #d97706; }
  .badge-low { background: #6b7280; }
  .badge-opportunity { background: #2563eb; }
  .muted { color: #6b7280; }
  .plan-column { display: inline-block; width: 32%; vertical-align: top; margin-right: 1%; }
  ul.plan-list { padding-left: 18px; }
  .footer-note { margin-top: 40px; font-size: 10.5px; color: #9ca3af; }
</style>
</head>
<body>

<section class="cover">
  <div class="eyebrow">Digital Business Audit</div>
  <h1>Auditoría de Presencia Digital</h1>
  <div class="business-name">${escapeHtml(data.business.name)}</div>
  <div class="date">${data.generatedAt.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}</div>
</section>

<h2>Resumen Ejecutivo</h2>
<p>
  Este informe resume el estado actual de la presencia digital de <strong>${escapeHtml(data.business.name)}</strong>
  y las oportunidades de mejora identificadas. La puntuación global de salud digital es de
  <strong>${data.overallScore}/100</strong>, con un impacto potencial estimado <strong>${data.potentialImpact}</strong>
  y una prioridad de actuación <strong>${data.priority}</strong>.
</p>

<h2>Business Health Score</h2>
<div class="score-grid">
  <div class="score-card overall">
    <div class="label">Overall Score</div>
    <div class="value" style="color:${scoreColor(data.overallScore)}">${data.overallScore}/100</div>
  </div>
  ${Object.entries(data.categoryScores)
    .map(
      ([key, value]) => `
    <div class="score-card">
      <div class="label">${CATEGORY_LABEL[key.toUpperCase()] ?? key}</div>
      <div class="value" style="color:${scoreColor(value)}">${value}/100</div>
    </div>`
    )
    .join("")}
</div>

<h2>Top Problems</h2>
${
  topProblems.length === 0
    ? '<p class="muted">No se han detectado problemas relevantes.</p>'
    : `<table class="findings">
      <thead><tr><th>Severidad</th><th>Problema</th><th>Evidencia</th><th>Solución recomendada</th></tr></thead>
      <tbody>
        ${topProblems
          .map(
            (f) => `
          <tr>
            <td><span class="badge badge-${f.severity.toLowerCase()}">${SEVERITY_LABEL[f.severity]}</span></td>
            <td><strong>${escapeHtml(f.title)}</strong><br/><span class="muted">${escapeHtml(f.description)}</span></td>
            <td>${escapeHtml(f.evidence ?? "-")}</td>
            <td>${escapeHtml(f.recommendation ?? "-")}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`
}

<h2>Website Audit</h2>
${renderFindingsSection("Hallazgos de Web", findingsByCategory(data.findings, "WEBSITE"))}

<h2>Local SEO Audit</h2>
${renderFindingsSection("Hallazgos de SEO Local", findingsByCategory(data.findings, "LOCAL_SEO"))}

<h2>Reputation Audit</h2>
${renderFindingsSection("Hallazgos de Reputación", findingsByCategory(data.findings, "REPUTATION"))}

<h2>Social Media Audit</h2>
${renderFindingsSection("Hallazgos de Redes Sociales", findingsByCategory(data.findings, "SOCIAL"))}

<h2>Conversion Audit</h2>
${renderFindingsSection("Hallazgos de Conversión", findingsByCategory(data.findings, "CONVERSION"))}

<h2>Technical Audit</h2>
${renderFindingsSection("Hallazgos Técnicos", findingsByCategory(data.findings, "TECHNICAL"))}

<h2>Opportunities</h2>
<table class="findings">
  <thead><tr><th>Prioridad</th><th>Oportunidad</th><th>Impacto</th><th>Solución</th></tr></thead>
  <tbody>
    ${data.opportunities
      .map(
        (o) => `
      <tr>
        <td><span class="badge badge-${o.priority === "URGENT" ? "critical" : o.priority.toLowerCase()}">${o.priority}</span></td>
        <td><strong>${escapeHtml(o.opportunity)}</strong><br/><span class="muted">${escapeHtml(o.problem)}</span></td>
        <td>${escapeHtml(o.impact)}</td>
        <td>${escapeHtml(o.solution)}</td>
      </tr>`
      )
      .join("")}
  </tbody>
</table>

<h2>Action Plan</h2>
<div class="plan-column">
  <h3>30 días (urgente)</h3>
  <ul class="plan-list">${opportunities30.map((o) => `<li>${escapeHtml(o.opportunity)}</li>`).join("") || '<li class="muted">Sin acciones urgentes</li>'}</ul>
</div>
<div class="plan-column">
  <h3>60 días</h3>
  <ul class="plan-list">${opportunities60.map((o) => `<li>${escapeHtml(o.opportunity)}</li>`).join("") || '<li class="muted">Sin acciones pendientes</li>'}</ul>
</div>
<div class="plan-column">
  <h3>90 días</h3>
  <ul class="plan-list">${opportunities90.map((o) => `<li>${escapeHtml(o.opportunity)}</li>`).join("") || '<li class="muted">Sin acciones pendientes</li>'}</ul>
</div>

<h2>Conclusión</h2>
<p>
  El análisis realizado identifica ${data.findings.length} hallazgos y ${data.opportunities.length} oportunidades de mejora
  para ${escapeHtml(data.business.name)}. Abordar primero los elementos de prioridad ${data.priority} puede contribuir a
  reforzar la captación y conversión de clientes potenciales a través de los canales digitales del negocio.
</p>

<p class="footer-note">
  Informe generado automáticamente a partir de datos públicos y/o autorizados por el propietario del negocio.
  Las estimaciones de impacto son cualitativas y no constituyen una previsión financiera.
</p>

</body>
</html>`;
}
