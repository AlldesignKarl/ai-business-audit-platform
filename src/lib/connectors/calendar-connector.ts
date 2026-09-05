import { getEnv } from "@/lib/env";
import { BaseConnector } from "@/lib/connectors/base-connector";
import type { Connector } from "@/lib/connectors/types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

interface CalendarEventPayload {
  summary: string;
  startIso: string;
  endIso: string;
  description?: string;
}

/** Google Calendar, para gestión de citas/reservas del negocio cliente. */
export class CalendarConnector extends BaseConnector implements Connector<unknown, CalendarEventPayload> {
  readonly type = "CALENDAR";

  async connect(redirectUri: string): Promise<{ authorizationUrl: string | null }> {
    const env = getEnv();
    if (!env.GOOGLE_OAUTH_CLIENT_ID) return { authorizationUrl: null };
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("scope", SCOPES.join(" "));
    return { authorizationUrl: url.toString() };
  }

  async authenticate(params: { code: string; redirectUri: string }) {
    const env = getEnv();
    if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
      throw new Error("Google OAuth no está configurado");
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
    if (!res.ok) throw new Error(`Error OAuth Google Calendar: ${res.status}`);
    const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
    await this.saveCredentials(data.access_token, data.refresh_token, new Date(Date.now() + data.expires_in * 1000));
    return { accessToken: data.access_token };
  }

  async getData(params?: { calendarId?: string }): Promise<unknown> {
    await this.assertPermission("analyze");
    const token = await this.getAccessToken();
    const calendarId = params?.calendarId ?? "primary";
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Google Calendar API error ${res.status}`);
    const data = await res.json();
    await this.logAction("calendar.list_events", "SUCCESS");
    return data;
  }

  async updateData(payload: CalendarEventPayload): Promise<{ success: boolean; details?: unknown }> {
    await this.assertPermission("modify");
    const token = await this.getAccessToken();
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: payload.summary,
        description: payload.description,
        start: { dateTime: payload.startIso },
        end: { dateTime: payload.endIso },
      }),
    });
    const success = res.ok;
    await this.logAction("calendar.create_event", success ? "SUCCESS" : "FAILURE", { after: payload });
    if (!success) throw new Error(`Google Calendar API error ${res.status}`);
    return { success: true, details: await res.json() };
  }
}
