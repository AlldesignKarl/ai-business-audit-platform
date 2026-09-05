import { getEnv } from "@/lib/env";
import { BaseConnector } from "@/lib/connectors/base-connector";
import type { Connector, ConnectorAuthResult } from "@/lib/connectors/types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = ["https://www.googleapis.com/auth/business.manage"];

interface GoogleBusinessProfileData {
  accounts: unknown;
}

/**
 * Conector de Google Business Profile (perfil de empresa en Google/Maps).
 * OAuth2 estándar de Google. Requiere GOOGLE_OAUTH_CLIENT_ID/SECRET — sin
 * ellas, connect() devuelve authorizationUrl=null (deshabilitado).
 */
export class GoogleConnector extends BaseConnector implements Connector<GoogleBusinessProfileData, never> {
  readonly type = "GOOGLE";

  async connect(redirectUri: string): Promise<{ authorizationUrl: string | null }> {
    const env = getEnv();
    if (!env.GOOGLE_OAUTH_CLIENT_ID) return { authorizationUrl: null };

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("scope", SCOPES.join(" "));
    return { authorizationUrl: url.toString() };
  }

  async authenticate(params: { code: string; redirectUri: string }): Promise<ConnectorAuthResult> {
    const env = getEnv();
    if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
      throw new Error("Google OAuth no está configurado (faltan GOOGLE_OAUTH_CLIENT_ID/SECRET)");
    }
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: params.code,
        client_id: env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirect_uri: params.redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error(`Error intercambiando código OAuth de Google: ${res.status}`);
    const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number; scope: string };

    const auth: ConnectorAuthResult = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    };
    await this.saveCredentials(auth.accessToken, auth.refreshToken, auth.expiresAt, auth.scope);
    return auth;
  }

  async getData(): Promise<GoogleBusinessProfileData> {
    await this.assertPermission("analyze");
    const token = await this.getAccessToken();
    const res = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Google Business Profile API error ${res.status}`);
    const accounts = await res.json();
    await this.logAction("google.fetch_accounts", "SUCCESS");
    return { accounts };
  }

  async updateData(): Promise<{ success: boolean }> {
    await this.assertPermission("modify");
    throw new Error("Actualización del perfil de Google Business no implementada en esta fase — requiere aprobación manual explícita por acción.");
  }
}
