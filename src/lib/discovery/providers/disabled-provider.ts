import type { BusinessSearchParams, BusinessSourceProvider, DiscoveredBusiness } from "@/lib/discovery/types";

/**
 * Se usa cuando ninguna fuente de datos real está configurada. Nunca genera
 * negocios simulados: devuelve una lista vacía y deja constancia del motivo.
 */
export class DisabledProvider implements BusinessSourceProvider {
  readonly name = "disabled";
  readonly isConfigured = true;

  async search(_params: BusinessSearchParams): Promise<DiscoveredBusiness[]> {
    return [];
  }
}
