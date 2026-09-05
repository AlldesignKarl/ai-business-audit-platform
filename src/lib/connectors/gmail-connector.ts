import { getEnv } from "@/lib/env";
import { BaseConnector } from "@/lib/connectors/base-connector";
import type { Connector, ConnectorAuthResult } from "@/lib/connectors/types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

interface GmailProfileData {
  emailAddress: string;
}

export interface GmailAttachment {
  filename: string;
  contentBase64: string;
  mimeType: string;
}

export interface GmailSendPayload {
  to: string;
  subject: string;
  html: string;
  attachment?: GmailAttachment;
}

/**
 * Conector Gmail (scope gmail.send únicamente — nunca lee la bandeja de
 * entrada). Se usa para enviar informes de auditoría en nombre de la
 * organización. `updateData` es la única forma de enviar y siempre exige el
 * permiso `send`, concedido explícitamente en Ajustes — el Approval Center es
 * quien decide CUÁNDO se invoca, nunca el propio conector.
 */
export class GmailConnector extends BaseConnector implements Connector<GmailProfileData, GmailSendPayload> {
  readonly type = "GMAIL";

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
    if (!res.ok) throw new Error(`Error intercambiando código OAuth de Gmail: ${res.status}`);
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

  async getData(): Promise<GmailProfileData> {
    await this.assertPermission("analyze");
    const token = await this.getAccessToken();
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Gmail API error ${res.status}`);
    const profile = (await res.json()) as GmailProfileData;
    await this.logAction("gmail.fetch_profile", "SUCCESS");
    return profile;
  }

  async updateData(payload: GmailSendPayload): Promise<{ success: boolean; details?: unknown }> {
    await this.assertPermission("send");
    const token = await this.getAccessToken();
    const raw = buildRawMessage(payload);

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      const text = await res.text();
      await this.logAction("gmail.send", "FAILURE", { after: { to: payload.to, status: res.status } });
      throw new Error(`Gmail API error al enviar (${res.status}): ${text}`);
    }
    const data = (await res.json()) as { id: string };
    await this.logAction("gmail.send", "SUCCESS", { after: { to: payload.to, messageId: data.id } });
    return { success: true, details: { messageId: data.id } };
  }
}

function base64url(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Construye un mensaje RFC 2822 multipart/mixed (HTML + adjunto PDF opcional) codificado en base64url, como exige la Gmail API. */
function buildRawMessage(payload: GmailSendPayload): string {
  const boundary = `np_boundary_${Date.now()}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(payload.subject, "utf-8").toString("base64")}?=`;
  const lines: string[] = [
    `To: ${payload.to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    payload.html,
    "",
  ];

  if (payload.attachment) {
    lines.push(
      `--${boundary}`,
      `Content-Type: ${payload.attachment.mimeType}; name="${payload.attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${payload.attachment.filename}"`,
      "",
      payload.attachment.contentBase64,
      ""
    );
  }

  lines.push(`--${boundary}--`);
  return base64url(lines.join("\r\n"));
}
