import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { createConnectorInstance } from "@/lib/connectors/registry";
import { recordActivity } from "@/lib/activity";
import type { ConnectorType } from "@prisma/client";

const VALID_TYPES = new Set<ConnectorType>([
  "GOOGLE",
  "GMAIL",
  "WEBSITE",
  "EMAIL",
  "WHATSAPP",
  "INSTAGRAM",
  "FACEBOOK",
  "CALENDAR",
  "ANALYTICS",
  "CRM",
]);

/**
 * Callback OAuth genérico para todos los conectores basados en redirect
 * (Google, Gmail, Calendar, Analytics, Meta). El `state` es el id del
 * `Connector` PENDING creado por `initiateConnectorConnectAction` — se valida
 * que pertenezca a la organización de la sesión actual antes de intercambiar
 * el código, para evitar que alguien enlace credenciales ajenas (CSRF).
 */
export async function GET(request: NextRequest, { params }: { params: { type: string } }) {
  const appUrl = getEnv().APP_URL;
  const type = params.type.toUpperCase() as ConnectorType;
  const settingsUrl = new URL("/settings", appUrl);

  if (!VALID_TYPES.has(type)) {
    settingsUrl.searchParams.set("error", `Tipo de conector desconocido: ${params.type}`);
    return NextResponse.redirect(settingsUrl);
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    settingsUrl.searchParams.set("error", `${type}: autorización cancelada o denegada (${oauthError})`);
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state) {
    settingsUrl.searchParams.set("error", `${type}: falta el código de autorización`);
    return NextResponse.redirect(settingsUrl);
  }

  const connector = await db.connector.findFirst({
    where: { id: state, type, organizationId: session.user.organizationId },
  });
  if (!connector) {
    settingsUrl.searchParams.set("error", `${type}: solicitud de conexión no encontrada o caducada. Vuelve a intentarlo.`);
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const redirectUri = new URL(`/api/connectors/${params.type.toLowerCase()}/callback`, appUrl).toString();
    const instance = createConnectorInstance(type, connector.id);
    await instance.authenticate({ code, redirectUri });
    await recordActivity({
      organizationId: session.user.organizationId,
      actorType: "USER",
      actorId: session.user.id,
      action: "connector.connected",
      connectorUsed: type,
      result: "SUCCESS",
    });
    settingsUrl.searchParams.set("connected", type);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[connectors/${type}/callback] error autenticando:`, error);
    await db.connector.update({ where: { id: connector.id }, data: { status: "ERROR", lastError: error instanceof Error ? error.message : String(error) } });
    settingsUrl.searchParams.set("error", `${type}: no se pudo completar la conexión. Inténtalo de nuevo.`);
  }

  return NextResponse.redirect(settingsUrl);
}
