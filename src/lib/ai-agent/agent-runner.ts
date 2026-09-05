import { db } from "@/lib/db";
import { createConnectorInstance } from "@/lib/connectors/registry";
import { runAiTask } from "@/lib/ai/orchestrator";
import { recordActivity } from "@/lib/activity";

/**
 * Ejecuta el AI Agent asignado a un negocio-cliente: recopila datos SOLO de
 * los conectores que el propietario ha autorizado con permiso `analyze`, y
 * pide al AI Orchestrator recomendaciones de acción acotadas a esos
 * conectores. Nunca actúa fuera de lo autorizado — genera recomendaciones,
 * y crea Tasks (que pasan por Approval Center si la acción lo requiere) en
 * lugar de ejecutar cambios directamente.
 */
export async function runAiAgent(agentId: string, reason: string): Promise<{ recommendationsText: string; tasksCreated: number }> {
  const agent = await db.aiAgent.findUniqueOrThrow({ where: { id: agentId }, include: { business: true } });
  if (!agent.isActive) throw new Error("El AI Agent está desactivado");

  const allowedConnectorIds = (agent.allowedConnectors as string[] | null) ?? [];
  const connectors = await db.connector.findMany({
    where: { id: { in: allowedConnectorIds }, businessId: agent.businessId, status: "CONNECTED" },
  });

  const metrics: Record<string, unknown> = {};
  for (const connectorRecord of connectors) {
    const permissions = connectorRecord.permissions as { analyze?: boolean };
    if (!permissions.analyze) continue;
    try {
      const instance = createConnectorInstance(connectorRecord.type, connectorRecord.id);
      metrics[connectorRecord.type] = await instance.getData();
    } catch (error) {
      metrics[connectorRecord.type] = { error: error instanceof Error ? error.message : String(error) };
    }
  }

  const recommendationsText = await runAiTask({
    organizationId: agent.organizationId,
    businessId: agent.businessId,
    agentId: agent.id,
    type: "agent_recommendation",
    complexity: "complex",
    context: {
      businessName: agent.business.name,
      metrics,
      allowedConnectors: connectors.map((c) => c.type),
    },
  });

  const task = await db.task.create({
    data: {
      organizationId: agent.organizationId,
      businessId: agent.businessId,
      title: `Recomendaciones del AI Agent (${reason})`,
      description: recommendationsText,
      assignedTo: "AI_AGENT",
      approvalRequired: true,
      status: "REVIEW",
    },
  });

  await recordActivity({
    organizationId: agent.organizationId,
    businessId: agent.businessId,
    actorType: "AI_AGENT",
    actorId: agent.id,
    action: "ai_agent.run",
    after: { taskId: task.id, reason },
  });

  return { recommendationsText, tasksCreated: 1 };
}
