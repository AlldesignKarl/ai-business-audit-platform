import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";
import { computeAnthropicCostUsd } from "@/lib/ai/pricing";
import type { AIProvider, GenerateParams, GenerateResult } from "@/lib/ai/types";

/**
 * Proveedor real de IA vía Anthropic. Queda deshabilitado automáticamente si
 * no hay ANTHROPIC_API_KEY configurada — nunca simula una respuesta de IA.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic | null = null;

  constructor() {
    const env = getEnv();
    if (env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    if (!this.client) {
      throw new Error("AnthropicProvider no está configurado (falta ANTHROPIC_API_KEY)");
    }
    const env = getEnv();
    const model = params.complexity === "complex" ? env.ANTHROPIC_MODEL_COMPLEX : env.ANTHROPIC_MODEL_SIMPLE;

    const response = await this.client.messages.create({
      model,
      max_tokens: params.maxTokens ?? 2048,
      system: params.system,
      messages: [{ role: "user", content: params.prompt }],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;

    return {
      text: textBlock?.text ?? "",
      provider: this.name,
      model,
      tokensIn,
      tokensOut,
      costUsd: computeAnthropicCostUsd(model, tokensIn, tokensOut),
    };
  }
}
