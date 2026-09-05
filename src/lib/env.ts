import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET es obligatorio (openssl rand -base64 32)"),
  ENCRYPTION_KEY: z.string().min(1, "ENCRYPTION_KEY es obligatorio (openssl rand -base64 32)"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  GOOGLE_PLACES_API_KEY: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL_COMPLEX: z.string().default("claude-opus-4-5"),
  ANTHROPIC_MODEL_SIMPLE: z.string().default("claude-haiku-4-5"),
  AI_DAILY_BUDGET_USD: z.coerce.number().default(20),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_OAUTH_REDIRECT_URI: z.string().optional(),

  GA4_PROPERTY_ID: z.string().optional(),

  REPORTS_STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  PLAYWRIGHT_EXECUTABLE_PATH: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  INTERNAL_ALERTS_DISCORD_WEBHOOK_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Valida process.env una única vez. Falla rápido si falta algo crítico. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuración de entorno inválida:\n${message}`);
  }
  cached = parsed.data;
  return cached;
}

/** Capacidades derivadas de qué credenciales están configuradas — usado en /system-health y para deshabilitar (no simular) funciones. */
export function getCapabilities(env: Env = getEnv()) {
  return {
    googlePlaces: Boolean(env.GOOGLE_PLACES_API_KEY),
    googleOAuth: Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET),
    ai: Boolean(env.ANTHROPIC_API_KEY),
    emailSmtp: Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD),
    emailResend: Boolean(env.RESEND_API_KEY),
    whatsapp: Boolean(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN),
    meta: Boolean(env.META_APP_ID && env.META_APP_SECRET),
    ga4: Boolean(env.GA4_PROPERTY_ID && env.GOOGLE_OAUTH_CLIENT_ID),
    s3Reports: env.REPORTS_STORAGE_DRIVER === "s3" && Boolean(env.S3_BUCKET && env.S3_ACCESS_KEY_ID),
  };
}
