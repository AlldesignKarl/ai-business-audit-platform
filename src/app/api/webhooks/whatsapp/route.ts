import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getEnv } from "@/lib/env";

/** Verificación inicial del webhook (Meta la llama al configurar la URL). */
export async function GET(req: NextRequest) {
  const env = getEnv();
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verificación fallida" }, { status: 403 });
}

/** Valida la firma HMAC-SHA256 de Meta antes de procesar cualquier evento entrante. */
export async function POST(req: NextRequest) {
  const env = getEnv();
  const rawBody = await req.text();

  if (env.WHATSAPP_APP_SECRET) {
    const signature = req.headers.get("x-hub-signature-256");
    const expected = "sha256=" + crypto.createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
    if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }
  }

  // El procesamiento detallado de mensajes entrantes (respuestas de clientes,
  // estado de entrega) se encola como process_reply cuando corresponde a un
  // hilo existente — mantenido deliberadamente simple en esta fase.
  return NextResponse.json({ received: true });
}
