import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCapabilities } from "@/lib/env";
import { runAutomationAgentAction, toggleAutomationAction, deleteAutomationAction } from "@/lib/actions";
import { AUTOMATION_AVAILABLE_EVENTS } from "@/lib/automation/constants";

export default async function AutomationsPage({
  searchParams,
}: {
  searchParams: { error?: string; created?: string };
}) {
  const session = await getServerSession(authOptions);
  const organizationId = session!.user.organizationId;
  const capabilities = getCapabilities();

  const automations = await db.automation.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { runs: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { runs: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Automatizaciones</h1>
        <p className="text-sm text-muted-foreground">
          Reglas WHEN/IF/THEN que reaccionan a eventos reales de la plataforma. Toda ejecución queda registrada — y
          nunca se activan solas: cada automatización empieza inactiva hasta que la revisas y la activas tú.
        </p>
      </div>

      {searchParams.error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-5 text-sm text-destructive">{decodeURIComponent(searchParams.error)}</CardContent>
        </Card>
      )}
      {searchParams.created && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="pt-5 text-sm">
            Borrador creado a partir de tu objetivo. Revísalo abajo y actívalo cuando estés conforme.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>🤖 Agente de Automatización</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="mb-3 text-sm text-muted-foreground">
            Describe en lenguaje natural qué quieres automatizar. El agente solo puede usar eventos y acciones reales
            de la plataforma ({AUTOMATION_AVAILABLE_EVENTS.join(", ")}) — nunca inventa una integración que no existe,
            y el resultado siempre empieza inactivo para que lo revises.
          </p>
          {!capabilities.ai && (
            <p className="mb-3 text-xs text-warning">
              Falta configurar <code>ANTHROPIC_API_KEY</code> en el servidor para usar este agente. Mientras tanto,
              crea automatizaciones manualmente vía la API o espera a que se configure.
            </p>
          )}
          <form action={runAutomationAgentAction} className="flex gap-2">
            <textarea
              name="goal"
              required
              rows={2}
              placeholder="Ej: cuando una auditoría termine con puntuación de oportunidad muy alta, crea una tarea para el equipo comercial"
              className="h-auto flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <Button type="submit" disabled={!capabilities.ai} className="self-start">
              Sugerir
            </Button>
          </form>
        </CardContent>
      </Card>

      {automations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Todavía no hay automatizaciones. Crea una con el Agente de Automatización de arriba.
          </CardContent>
        </Card>
      ) : (
        automations.map((a) => {
          const trigger = a.trigger as { event?: string };
          const toggle = toggleAutomationAction.bind(null, a.id, !a.isActive);
          const remove = deleteAutomationAction.bind(null, a.id);
          return (
            <Card key={a.id}>
              <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-medium text-foreground">{a.name}</CardTitle>
                  <Badge>{trigger.event ?? "sin evento"}</Badge>
                </div>
                <Badge variant={a.isActive ? "success" : "default"}>{a.isActive ? "Activa" : "Inactiva"}</Badge>
              </CardHeader>
              <CardContent className="pt-0 text-sm">
                <p className="text-xs text-muted-foreground">
                  {a._count.runs} ejecuciones
                  {a.runs[0] && ` · última: ${a.runs[0].createdAt.toLocaleString("es-ES")} (${a.runs[0].status})`}
                </p>
                <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify({ conditions: a.conditions, actions: a.actions }, null, 2)}
                </pre>
                <div className="mt-3 flex gap-2">
                  <form action={toggle}>
                    <Button size="sm" variant="outline" type="submit">
                      {a.isActive ? "Desactivar" : "Activar"}
                    </Button>
                  </form>
                  <form action={remove}>
                    <Button size="sm" variant="destructive" type="submit">
                      Eliminar
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
