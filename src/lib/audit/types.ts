export type FindingCategory = "WEBSITE" | "LOCAL_SEO" | "REPUTATION" | "SOCIAL" | "CONVERSION" | "TECHNICAL";
export type FindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "OPPORTUNITY";

export interface RuleFinding {
  category: FindingCategory;
  severity: FindingSeverity;
  /** Identificador estable de la regla, p.ej. WEBSITE_NO_HTTPS. Se usa para mapear a oportunidades. */
  code: string;
  title: string;
  description: string;
  evidence?: string;
  recommendation?: string;
}
