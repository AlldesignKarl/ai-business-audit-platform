import { getEnv } from "@/lib/env";
import { BaseConnector } from "@/lib/connectors/base-connector";
import type { Connector } from "@/lib/connectors/types";

interface WhatsAppSendPayload {
  to: string;
  templateName: string;
  languageCode: string;
  variables?: string[];
}

/**
 * WhatsApp Business Platform (Meta Cloud API oficial). Nunca usa librerías
 * no oficiales de WhatsApp Web ni automatiza cuentas personales.
 */
export class WhatsAppConnector extends BaseConnector implements Connector<unknown, WhatsAppSendPayload> {
  readonly type = "WHATSAPP";

  async connect(): Promise<{ authorizationUrl: string | null }> {
    // WhatsApp Business Cloud API se autoriza vía Meta Business Manager, no vía redirect OAuth estándar.
    return { authorizationUrl: null };
  }

  async authenticate(params: { accessToken: string }) {
    await this.saveCredentials(params.accessToken);
    return { accessToken: params.accessToken };
  }

  async getData(): Promise<{ phoneNumberId: string | undefined }> {
    await this.assertPermission("analyze");
    return { phoneNumberId: getEnv().WHATSAPP_PHONE_NUMBER_ID };
  }

  async updateData(payload: WhatsAppSendPayload): Promise<{ success: boolean; details?: unknown }> {
    await this.assertPermission("send");
    const env = getEnv();
    if (!env.WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error("WhatsApp Cloud API no está configurada (falta WHATSAPP_PHONE_NUMBER_ID)");
    }
    const token = await this.getAccessToken();

    const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: payload.to,
        type: "template",
        template: {
          name: payload.templateName,
          language: { code: payload.languageCode },
          ...(payload.variables
            ? { components: [{ type: "body", parameters: payload.variables.map((v) => ({ type: "text", text: v })) }] }
            : {}),
        },
      }),
    });

    const success = res.ok;
    await this.logAction("whatsapp.send_template", success ? "SUCCESS" : "FAILURE", { after: payload });
    if (!success) throw new Error(`WhatsApp Cloud API error ${res.status}: ${await res.text()}`);
    return { success: true, details: await res.json() };
  }
}
