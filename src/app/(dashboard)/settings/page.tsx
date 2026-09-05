import { getServerSession } from "next-auth";
import type { ConnectorType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCapabilities } from "@/lib/env";
import {
  initiateConnectorConnectAction,
  activateInternalConnectorAction,
  connectWhatsAppManualAction,
  disconnectConnectorAction,
  updateConnectorPermissionsAction,
} from "@/lib/actions";
import type { ConnectorPermissions } from "@/lib/connectors/types";
import { DEFAULT_CONNECTOR_PERMISSIONS } from "@/lib/connectors/types";

type Capability = keyof ReturnType<typeof getCapabilities>;

const CONNECTOR_DEFS: {
  type: ConnectorType;
  label: string;
  description: string;
  authMode: "oauth" | "internal" | "manual_whatsapp";
  capability?: Capability;
}[] = [
  {
    type: "GMAIL",
    label: "Gmail — enviar informes",
    description: "Envía los informes de auditoría en PDF desde tu propia cuenta de Gmail. Cada envío pasa siempre por el Approval Center, incluso para el OWNER.",
    authMode: "oauth",
    capability: "googleOAuth",
  },
  {
    type: "GOOGLE",
    label: "Google Business Profile",
    description: "Perfil de empresa en Google/Maps: nombre, horarios, reseñas.",
    authMode: "oauth",
    capability: "googleOAuth",
  },
  {
    type: "CALENDAR",
    label: "Google Calendar",
    description: "Gestión de citas y reservas del negocio cliente.",
    authMode: "oauth",
    capability: "googleOAuth",
  },
  {
    type: "ANALYTICS",
    label: "Google Analytics 4",
    description: "Solo lectura: sesiones y conversiones del sitio web del cliente.",
    authMode: "oauth",
    capability: "ga4",
  },
  {
    type: "INSTAGRAM",
    label: "Instagram",
    description: "Lectura y propuestas de publicación vía Meta Graph API (nunca publica sin aprobación).",
    authMode: "oauth",
    capability: "meta",
  },
  {
    type: "FACEBOOK",
    label: "Facebook",
    description: "Lectura y propuestas de publicación vía Meta Graph API (nunca publica sin aprobación).",
    authMode: "oauth",
    capability: "meta",
  },
  {
    type: "WHATSAPP",
    label: "WhatsApp Business",
    description: "Respuestas automáticas vía WhatsApp Business Cloud API. Se conecta pegando el access token de Meta Business Manager.",
    authMode: "manual_whatsapp",
    capability: "whatsapp",
  },
  {
    type: "WEBSITE",
    label: "Web del negocio",
    description: "Escaneo técnico de la web del cliente. No requiere credenciales externas.",
    authMode: "internal",
  },
  {
    type: "EMAIL",
    label: "Email de prospección",
    description: "Campañas de email comercial con opt-out, suppression list y límites de envío.",
    authMode: "internal",
  },
  {
    type: "CRM",
    label: "CRM interno",
    description: "Lectura/escritura del propio CRM de la plataforma (estado del negocio, notas).",
    authMode: "internal",
  },
];

const PERMISSION_LABELS: { key: keyof ConnectorPermissions; label: string }[] = [
  { key: "analyze", label: "Analizar" },
  { key: "modify", label: "Modificar" },
  { key: "respond", label: "Responder" },
  { key: "send", label: "Enviar" },
  { key: "publish", label: "Publicar" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { error?: string; connected?: string };
}) {
  const session = await getServerSession(authOptions);
  const organization = await db.organization.findUniqueOrThrow({ where: { id: session!.user.organizationId } });
  const connectors = await db.connector.findMany({ where: { organizationId: organization.id, businessId: null } });
  const capabilities = getCapabilities();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Organización, plan y conectores disponibles.</p>
      </div>

      {searchParams.error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-5 text-sm text-destructive">{decodeURIComponent(searchParams.error)}</CardContent>
        </Card>
      )}
      {searchParams.connected && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="pt-5 text-sm">
            <strong>{searchParams.connected}</strong> conectado correctamente. Concede los permisos necesarios abajo antes
            de que la IA pueda usarlo.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organización</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm">
          <p>Nombre: {organization.name}</p>
          <p>Slug: {organization.slug}</p>
          <p>Plan: {organization.plan}</p>
          <p>Tu rol: {session!.user.role}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conectores</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-0 text-sm">
          <p className="text-muted-foreground">
            Cada conector requiere autorización explícita y permisos granulares (analizar / modificar / responder /
            enviar / publicar) antes de que la IA pueda actuar. Conectar no concede ningún permiso por sí solo.
          </p>

          {CONNECTOR_DEFS.map((def) => {
            const connector = connectors.find((c) => c.type === def.type);
            const connected = connector?.status === "CONNECTED";
            const configured = def.capability ? capabilities[def.capability] : true;
            const permissions: ConnectorPermissions = {
              ...DEFAULT_CONNECTOR_PERMISSIONS,
              ...((connector?.permissions as Partial<ConnectorPermissions>) ?? {}),
            };

            return (
              <div key={def.type} className="rounded-md border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{def.label}</span>
                      <Badge variant={connected ? "success" : connector?.status === "ERROR" ? "critical" : "default"}>
                        {connected ? "Conectado" : connector?.status === "ERROR" ? "Error" : "No conectado"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{def.description}</p>
                    {connector?.lastError && <p className="mt-1 text-xs text-destructive">{connector.lastError}</p>}
                    {!configured && !connected && (
                      <p className="mt-1 text-xs text-warning">
                        Falta configurar las credenciales de esta API en el servidor (variables de entorno).
                      </p>
                    )}
                  </div>

                  {!connected && def.authMode === "oauth" && (
                    <form action={initiateConnectorConnectAction}>
                      <input type="hidden" name="type" value={def.type} />
                      <Button size="sm" type="submit" disabled={!configured}>
                        Conectar
                      </Button>
                    </form>
                  )}
                  {!connected && def.authMode === "internal" && (
                    <form action={activateInternalConnectorAction}>
                      <input type="hidden" name="type" value={def.type} />
                      <Button size="sm" type="submit">
                        Activar
                      </Button>
                    </form>
                  )}
                  {connected && (
                    <form action={disconnectConnectorAction.bind(null, connector!.id)}>
                      <Button size="sm" variant="outline" type="submit">
                        Desconectar
                      </Button>
                    </form>
                  )}
                </div>

                {!connected && def.authMode === "manual_whatsapp" && (
                  <form action={connectWhatsAppManualAction} className="mt-3 flex gap-2">
                    <input
                      name="accessToken"
                      required
                      placeholder="Access token de WhatsApp Business"
                      className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm"
                    />
                    <Button size="sm" type="submit" disabled={!configured}>
                      Conectar
                    </Button>
                  </form>
                )}

                {connected && (
                  <form action={updateConnectorPermissionsAction} className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
                    <input type="hidden" name="connectorId" value={connector!.id} />
                    {PERMISSION_LABELS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" name={`perm_${key}`} defaultChecked={permissions[key]} className="accent-accent" />
                        {label}
                      </label>
                    ))}
                    <Button size="sm" variant="outline" type="submit">
                      Guardar permisos
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
