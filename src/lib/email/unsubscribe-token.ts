import jwt from "jsonwebtoken";
import { getEnv } from "@/lib/env";

interface UnsubscribePayload {
  organizationId: string;
  email: string;
}

export function createUnsubscribeToken(payload: UnsubscribePayload): string {
  return jwt.sign(payload, getEnv().AUTH_SECRET, { expiresIn: "1y" });
}

export function verifyUnsubscribeToken(token: string): UnsubscribePayload {
  return jwt.verify(token, getEnv().AUTH_SECRET) as UnsubscribePayload;
}

export function buildUnsubscribeUrl(payload: UnsubscribePayload): string {
  const token = createUnsubscribeToken(payload);
  return `${getEnv().APP_URL}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}
