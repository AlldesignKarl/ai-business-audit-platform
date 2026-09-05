import { getEnv } from "@/lib/env";
import { BaseConnector } from "@/lib/connectors/base-connector";
import type { Connector } from "@/lib/connectors/types";

/** Google Analytics 4 (Data API), de solo lectura — nunca modifica configuración de analítica. */
export class AnalyticsConnector extends BaseConnector implements Connector<unknown, never> {
  readonly type = "ANALYTICS";

  async connect(redirectUri: string): Promise<{ authorizationUrl: string | null }> {
    const env = getEnv();
    if (!env.GOOGLE_OAUTH_CLIENT_ID) return { authorizationUrl: null };
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("scope", "https://www.googleapis.com/auth/analytics.readonly");
    return { authorizationUrl: url.toString() };
  }

  async authenticate(params: { code: string; redirectUri: string }) {
    const env = getEnv();
    if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) throw new Error("Google OAuth no configurado");
    const res = await fetch("https://oauth2.googleapis.com/token", {
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
    if (!res.ok) throw new Error(`Error OAuth GA4: ${res.status}`);
    const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
    await this.saveCredentials(data.access_token, data.refresh_token, new Date(Date.now() + data.expires_in * 1000));
    return { accessToken: data.access_token };
  }

  async getData(): Promise<unknown> {
    await this.assertPermission("analyze");
    const env = getEnv();
    if (!env.GA4_PROPERTY_ID) throw new Error("Falta GA4_PROPERTY_ID");
    const token = await this.getAccessToken();
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${env.GA4_PROPERTY_ID}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "conversions" }],
      }),
    });
    if (!res.ok) throw new Error(`GA4 Data API error ${res.status}`);
    const data = await res.json();
    await this.logAction("analytics.run_report", "SUCCESS");
    return data;
  }

  async updateData(): Promise<never> {
    throw new Error("AnalyticsConnector es de solo lectura");
  }
}
