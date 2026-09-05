/**
 * Precios oficiales de la API de Anthropic (USD por millón de tokens).
 * Mantener sincronizado con https://www.anthropic.com/pricing cuando cambien.
 */
export const ANTHROPIC_PRICING: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
  "claude-opus-5": { inputPerMTok: 5.0, outputPerMTok: 25.0 },
  "claude-sonnet-5": { inputPerMTok: 2.0, outputPerMTok: 10.0 },
  "claude-haiku-4-5": { inputPerMTok: 1.0, outputPerMTok: 5.0 },
};

export function computeAnthropicCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const pricing = ANTHROPIC_PRICING[model];
  if (!pricing) return 0;
  return (tokensIn / 1_000_000) * pricing.inputPerMTok + (tokensOut / 1_000_000) * pricing.outputPerMTok;
}
