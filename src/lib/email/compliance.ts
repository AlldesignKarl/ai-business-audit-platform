import { db } from "@/lib/db";

export async function isSuppressed(organizationId: string, email: string): Promise<boolean> {
  const entry = await db.suppressionEntry.findUnique({
    where: { organizationId_email: { organizationId, email: email.toLowerCase() } },
  });
  return Boolean(entry);
}

export async function addToSuppressionList(organizationId: string, email: string, reason: string) {
  return db.suppressionEntry.upsert({
    where: { organizationId_email: { organizationId, email: email.toLowerCase() } },
    create: { organizationId, email: email.toLowerCase(), reason },
    update: { reason },
  });
}

/** Nº de emails ya enviados hoy para una organización (límite diario global además del límite por campaña). */
export async function getEmailsSentToday(organizationId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return db.email.count({
    where: {
      status: "SENT",
      sentAt: { gte: startOfDay },
      business: { organizationId },
    },
  });
}

const ORG_DAILY_EMAIL_HARD_CAP = 500;

export async function assertCanSendMore(organizationId: string, campaignDailyLimit?: number): Promise<void> {
  const sentToday = await getEmailsSentToday(organizationId);
  const cap = campaignDailyLimit ? Math.min(campaignDailyLimit, ORG_DAILY_EMAIL_HARD_CAP) : ORG_DAILY_EMAIL_HARD_CAP;
  if (sentToday >= cap) {
    throw new Error(`Límite diario de envíos alcanzado (${sentToday}/${cap}). Se reanudará mañana.`);
  }
}
