export type TaskComplexity = "simple" | "complex";

export interface GenerateParams {
  system: string;
  prompt: string;
  maxTokens?: number;
  complexity: TaskComplexity;
}

export interface GenerateResult {
  text: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

/** Contrato que debe cumplir cualquier proveedor de IA (Anthropic, futuro OpenAI, etc.) */
export interface AIProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  generate(params: GenerateParams): Promise<GenerateResult>;
}

export type AiRunType =
  | "audit_narrative"
  | "opportunity_phrasing"
  | "agent_recommendation"
  | "email_draft"
  | "review_response"
  | "website_proposal";
