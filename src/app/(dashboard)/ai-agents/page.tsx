import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/security/rbac";
import { enqueueJob } from "@/lib/queue/queues";
import { revalidatePath } from "next/cache";

async function runAgentNow(agentId: string) {
  "use server";
  await requireRole("CLIENT");
  await enqueueJob("run_ai_agent", { agentId, reason: "manual_trigger" });
  revalidatePath("/ai-agents");
}

export default async function AiAgentsPage() {
  const session = await getServerSession(authOptions);
  const organizationId = session!.user.organizationId;

  const agents = await db.aiAgent.findMany({
    where: { organizationId },
    include: { business: true, runs: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Agents</h1>
        <p className="text-sm text-muted-foreground">
          Cada cliente tiene un agente con acceso únicamente a los conectores que ha autorizado. El botón ⚡ Automático
          ejecuta el ciclo completo de análisis y genera recomendaciones — nunca publica cambios sin aprobación.
        </p>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Ningún negocio se ha convertido todavía en cliente con un AI Agent activo.
          </CardContent>
        </Card>
      ) : (
        agents.map((agent) => {
          const run = runAgentNow.bind(null, agent.id);
          return (
            <Card key={agent.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base font-medium text-foreground">{agent.name}</CardTitle>
                <Badge variant={agent.isActive ? "success" : "default"}>{agent.isActive ? "Activo" : "Inactivo"}</Badge>
              </CardHeader>
              <CardContent className="pt-0 text-sm">
                <p className="text-muted-foreground">Negocio: {agent.business.name}</p>
                {agent.runs[0] && <p className="mt-1 text-xs text-muted-foreground">Última ejecución: {agent.runs[0].createdAt.toLocaleString("es-ES")}</p>}
                <form action={run} className="mt-3">
                  <Button size="sm">⚡ Ejecutar modo automático</Button>
                </form>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
