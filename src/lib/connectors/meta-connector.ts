import { getEnv } from "@/lib/env";
import { BaseConnector } from "@/lib/connectors/base-connector";
import type { Connector } from "@/lib/connectors/types";

const META_AUTH_URL = "https://www.facebook.com/v21.0/dialog/oauth";
const META_TOKEN_URL = "https://graph.facebook.com/v21.0/oauth/access_token";

interface MetaPagePost {
  message: string;
  link?: string;
}

/**
 * Base común para Instagram y Facebook (ambos vía Meta Graph API + OAuth de
 * Meta). Cada red concreta fija sus propios scopes.
 */
abstract class MetaConnectorBase extends BaseConnector implements Connector<unknown, MetaPagePost> {
  abstract readonly type: string;
  protected abstract readonly scopes: string[];

  async connect(redirectUri: string): Promise<{ authorizationUrl: string | null }> {
    const env = getEnv();
    if (!env.META_APP_ID) return { authorizationUrl: null };
    const url = new URL(META_AUTH_URL);
    url.searchParams.set("client_id", env.META_APP_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", this.scopes.join(","));
    url.searchParams.set("response_type", "code");
    return { authorizationUrl: url.toString() };
  }

  async authenticate(params: { code: string; redirectUri: string }) {
    const env = getEnv();
    if (!env.META_APP_ID || !env.META_APP_SECRET) {
      throw new Error("Meta OAuth no está configurado (faltan META_APP_ID/SECRET)");
    }
    const url = new URL(META_TOKEN_URL);
    url.searchParams.set("client_id", env.META_APP_ID);
    url.searchParams.set("client_secret", env.META_APP_SECRET);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("code", params.code);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Error intercambiando código OAuth de Meta: ${res.status}`);
    const data = (await res.json()) as { access_token: string; expires_in?: number };
    const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined;
    await this.saveCredentials(data.access_token, undefined, expiresAt);
    return { accessToken: data.access_token, expiresAt };
  }

  async getData(params?: { pageId: string }): Promise<unknown> {
    await this.assertPermission("analyze");
    if (!params?.pageId) throw new Error(`${this.type} getData requiere { pageId }`);
    const token = await this.getAccessToken();
    const res = await fetch(`https://graph.facebook.com/v21.0/${params.pageId}?fields=name,about,fan_count,link&access_token=${token}`);
    if (!res.ok) throw new Error(`Meta Graph API error ${res.status}`);
    const data = await res.json();
    await this.logAction(`${this.type.toLowerCase()}.fetch_profile`, "SUCCESS");
    return data;
  }

  async updateData(payload: MetaPagePost): Promise<{ success: boolean; details?: unknown }> {
    await this.assertPermission("publish");
    const record = await this.loadRecord();
    // La publicación real requiere el pageId asociado al conector; hasta entonces se registra como propuesta pendiente de aprobación.
    await this.logAction(`${this.type.toLowerCase()}.post_proposed`, "SUCCESS", { after: payload });
    return { success: true, details: { organizationId: record.organizationId, status: "PENDING_APPROVAL" } };
  }
}

export class InstagramConnector extends MetaConnectorBase {
  readonly type = "INSTAGRAM";
  protected readonly scopes = ["instagram_basic", "instagram_content_publish", "pages_show_list"];
}

export class FacebookConnector extends MetaConnectorBase {
  readonly type = "FACEBOOK";
  protected readonly scopes = ["pages_show_list", "pages_read_engagement", "pages_manage_posts"];
}
