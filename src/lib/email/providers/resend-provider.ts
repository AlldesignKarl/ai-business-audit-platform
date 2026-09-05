import { getEnv } from "@/lib/env";
import type { EmailProvider, SendEmailParams, SendEmailResult } from "@/lib/email/types";

export class ResendProvider implements EmailProvider {
  readonly name = "resend";
  private apiKey?: string;

  constructor() {
    this.apiKey = getEnv().RESEND_API_KEY;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.apiKey) throw new Error("ResendProvider no está configurado");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        headers: params.unsubscribeUrl ? { "List-Unsubscribe": `<${params.unsubscribeUrl}>` } : undefined,
      }),
    });
    if (!res.ok) {
      return { success: false, simulated: false, error: `Resend API error ${res.status}: ${await res.text()}` };
    }
    const data = (await res.json()) as { id: string };
    return { success: true, providerId: data.id, simulated: false };
  }
}
