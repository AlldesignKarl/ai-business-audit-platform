import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "@/lib/env";
import type { EmailProvider, SendEmailParams, SendEmailResult } from "@/lib/email/types";

export class SmtpProvider implements EmailProvider {
  readonly name = "smtp";
  private transporter: Transporter | null = null;

  constructor() {
    const env = getEnv();
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: (env.SMTP_PORT ?? 587) === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      });
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.transporter) throw new Error("SmtpProvider no está configurado");
    try {
      const info = await this.transporter.sendMail({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        headers: params.unsubscribeUrl ? { "List-Unsubscribe": `<${params.unsubscribeUrl}>` } : undefined,
      });
      return { success: true, providerId: info.messageId, simulated: false };
    } catch (error) {
      return { success: false, simulated: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
