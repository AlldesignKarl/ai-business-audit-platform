import { AnthropicProvider } from "@/lib/ai/providers/anthropic-provider";
import { NullProvider } from "@/lib/ai/providers/null-provider";
import type { AIProvider } from "@/lib/ai/types";

/**
 * Punto único de acoplamiento a proveedores de IA. Añadir un proveedor nuevo
 * (OpenAI, Gemini, modelo propio...) solo requiere implementar AIProvider y
 * registrarlo aquí — el resto de la plataforma nunca importa un SDK de IA
 * directamente.
 */
export class ModelRouter {
  private providers: AIProvider[];

  constructor() {
    this.providers = [new AnthropicProvider()];
  }

  /** Devuelve el primer proveedor configurado y disponible, o el NullProvider como último recurso. */
  resolve(): AIProvider {
    const available = this.providers.find((p) => p.isConfigured);
    return available ?? new NullProvider();
  }
}
