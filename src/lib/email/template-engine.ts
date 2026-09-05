/**
 * Motor de variables de plantilla de email. Solo sustituye variables de la
 * lista blanca — cualquier `{{variable}}` desconocida se deja intacta en vez
 * de fallar, para que el remitente la detecte visualmente antes de enviar.
 */
export const TEMPLATE_VARIABLES = [
  "business_name",
  "industry",
  "top_problem",
  "website",
  "audit_score",
  "report_link",
  "unsubscribe_link",
] as const;

export type TemplateVariables = Partial<Record<(typeof TEMPLATE_VARIABLES)[number], string>>;

export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/{{\s*([a-z_]+)\s*}}/gi, (match, key: string) => {
    const value = variables[key as keyof TemplateVariables];
    return value !== undefined ? value : match;
  });
}
