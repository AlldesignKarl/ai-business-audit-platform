import { SmtpProvider } from "@/lib/email/providers/smtp-provider";
import { ResendProvider } from "@/lib/email/providers/resend-provider";
import { LogEmailProvider } from "@/lib/email/providers/log-provider";
import type { EmailProvider } from "@/lib/email/types";

export function resolveEmailProvider(): EmailProvider {
  const resend = new ResendProvider();
  if (resend.isConfigured) return resend;
  const smtp = new SmtpProvider();
  if (smtp.isConfigured) return smtp;
  return new LogEmailProvider();
}
