export interface SendEmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
  unsubscribeUrl?: string;
}

export interface SendEmailResult {
  success: boolean;
  providerId?: string;
  simulated: boolean; // true cuando no hay proveedor real configurado (el envío no ha ocurrido de verdad)
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  send(params: SendEmailParams): Promise<SendEmailResult>;
}
