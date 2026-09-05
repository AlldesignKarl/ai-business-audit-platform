import type { EmailProvider, SendEmailParams, SendEmailResult } from "@/lib/email/types";

/**
 * Proveedor de respaldo: registra el email como si se hubiera enviado pero
 * NO realiza ninguna entrega real. Se activa cuando no hay SMTP ni Resend
 * configurados, para que el resto del flujo (plantillas, suppression list,
 * límites diarios, tracking) sea completamente probable sin credenciales
 * reales — nunca simula un `providerId` falso ni marca el email como SENT.
 */
export class LogEmailProvider implements EmailProvider {
  readonly name = "log";
  readonly isConfigured = true;

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    // eslint-disable-next-line no-console
    console.log(`[email:no-provider-configured] to=${params.to} subject="${params.subject}"`);
    return { success: false, simulated: true, error: "Ningún proveedor de email real configurado (SMTP_HOST/RESEND_API_KEY)" };
  }
}
