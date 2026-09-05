export type ConnectorPermissionAction = "analyze" | "modify" | "respond" | "send" | "publish";

export interface ConnectorPermissions {
  analyze: boolean;
  modify: boolean;
  respond: boolean;
  send: boolean;
  publish: boolean;
}

export const DEFAULT_CONNECTOR_PERMISSIONS: ConnectorPermissions = {
  analyze: false,
  modify: false,
  respond: false,
  send: false,
  publish: false,
};

export interface ConnectorAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

/**
 * Contrato común de todo conector/plugin de integración. `getData` es de solo
 * lectura (requiere permiso `analyze`); `updateData` ejecuta una acción que
 * modifica algo externo (requiere el permiso específico de la acción, p.ej.
 * `respond` para contestar un email o `publish` para publicar un cambio web).
 */
export interface Connector<TData = unknown, TUpdate = unknown> {
  readonly type: string;
  /** Devuelve la URL de autorización OAuth (o null si el conector no usa OAuth, p.ej. WebsiteConnector). */
  connect(redirectUri: string): Promise<{ authorizationUrl: string | null }>;
  /** Intercambia el código OAuth por tokens y los persiste cifrados. */
  authenticate(params: Record<string, string>): Promise<ConnectorAuthResult>;
  /** Lectura de datos del conector. Requiere permiso `analyze`. */
  getData(params?: Record<string, unknown>): Promise<TData>;
  /** Escritura/acción sobre el conector. Requiere el permiso correspondiente. */
  updateData(payload: TUpdate): Promise<{ success: boolean; details?: unknown }>;
  disconnect(): Promise<void>;
}
