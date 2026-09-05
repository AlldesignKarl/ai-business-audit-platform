import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CONNECTOR_TYPES = ["GOOGLE", "WEBSITE", "EMAIL", "WHATSAPP", "INSTAGRAM", "FACEBOOK", "CALENDAR", "ANALYTICS", "CRM"] as const;

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const organization = await db.organization.findUniqueOrThrow({ where: { id: session!.user.organizationId } });
  const connectors = await db.connector.findMany({ where: { organizationId: organization.id } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Organización, plan y conectores disponibles.</p>
      </div>

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
          <CardTitle>Conectores disponibles</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm">
          <p className="mb-3 text-muted-foreground">
            Cada conector requiere autorización explícita del propietario del negocio y permisos granulares
            (analizar / modificar / responder / enviar / publicar) antes de que la IA pueda actuar.
          </p>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {CONNECTOR_TYPES.map((type) => {
              const connected = connectors.find((c) => c.type === type);
              return (
                <li key={type} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span>{type}</span>
                  <Badge variant={connected?.status === "CONNECTED" ? "success" : "default"}>
                    {connected?.status ?? "No conectado"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
