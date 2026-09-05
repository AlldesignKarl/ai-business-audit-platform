import type { AIProvider, GenerateParams, GenerateResult } from "@/lib/ai/types";

/**
 * Proveedor de respaldo determinista: NO llama a ningún modelo de IA. Se activa
 * cuando no hay credenciales de IA configuradas, para que la plataforma siga
 * siendo completamente funcional (con narrativa basada en plantillas/reglas en
 * lugar de texto generado) en lugar de fallar o simular una respuesta de IA.
 */
export class NullProvider implements AIProvider {
  readonly name = "null";
  readonly isConfigured = true;

  async generate(params: GenerateParams): Promise<GenerateResult> {
    return {
      text: `[IA no configurada — ANTHROPIC_API_KEY ausente] ${params.prompt.slice(0, 0)}`,
      provider: this.name,
      model: "none",
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
    };
  }
}
