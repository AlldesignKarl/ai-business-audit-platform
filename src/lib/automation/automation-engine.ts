import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/queue/queues";

export interface AutomationEvent {
  organizationId: string;
  event: string; // p.ej. "review.created", "lead.created"
  payload: Record<string, unknown>;
}

interface AutomationCondition {
  field: string;
  operator: "eq" | "neq" | "lte" | "gte" | "contains";
  value: unknown;
}

interface AutomationAction {
  type: "create_task" | "require_approval" | "run_ai_agent" | "send_email" | "analyze_reviews";
  params?: Record<string, unknown>;
}

function getField(payload: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), payload);
}

function evaluateCondition(condition: AutomationCondition, payload: Record<string, unknown>): boolean {
  const actual = getField(payload, condition.field);
  switch (condition.operator) {
    case "eq":
      return actual === condition.value;
    case "neq":
      return actual !== condition.value;
    case "lte":
      return typeof actual === "number" && typeof condition.value === "number" && actual <= condition.value;
    case "gte":
      return typeof actual === "number" && typeof condition.value === "number" && actual >= condition.value;
    case "contains":
      return typeof actual === "string" && typeof condition.value === "string" && actual.includes(condition.value);
    default:
      return false;
  }
}

/**
 * Motor de automatizaciones tipo WHEN/IF/THEN. Evalúa todas las
 * automatizaciones activas de la organización que escuchan `event`, y
 * ejecuta sus acciones en orden si se cumplen las condiciones. Cada
 * ejecución queda registrada en AutomationRun para auditoría completa.
 */
export async function triggerAutomations(event: AutomationEvent): Promise<void> {
  const automations = await db.automation.findMany({
    where: { organizationId: event.organizationId, isActive: true },
  });

  for (const automation of automations) {
    const trigger = automation.trigger as { event?: string };
    if (trigger.event !== event.event) continue;

    const conditions = (automation.conditions as AutomationCondition[] | null) ?? [];
    const allConditionsMet = conditions.every((c) => evaluateCondition(c, event.payload));
    if (!allConditionsMet) continue;

    const actions = (automation.actions as AutomationAction[] | null) ?? [];
    const log: unknown[] = [];
    let status: "COMPLETED" | "FAILED" | "AWAITING_APPROVAL" = "COMPLETED";

    for (const action of actions) {
      try {
        const outcome = await executeAction(automation.organizationId, action, event);
        log.push({ action: action.type, outcome });
        if (outcome?.awaitingApproval) status = "AWAITING_APPROVAL";
      } catch (error) {
        status = "FAILED";
        log.push({ action: action.type, error: error instanceof Error ? error.message : String(error) });
        break;
      }
    }

    await db.automationRun.create({ data: { automationId: automation.id, status, log: log as object } });
  }
}

async function executeAction(organizationId: string, action: AutomationAction, event: AutomationEvent) {
  const businessId = (event.payload.businessId as string | undefined) ?? undefined;

  switch (action.type) {
    case "create_task":
      await db.task.create({
        data: {
          organizationId,
          businessId,
          title: (action.params?.title as string) ?? `Tarea automática (${event.event})`,
          description: JSON.stringify(event.payload),
          assignedTo: "USER",
        },
      });
      return { created: true };

    case "require_approval":
      await db.approval.create({
        data: {
          organizationId,
          businessId,
          type: (action.params?.type as string) ?? "automation_action",
          title: (action.params?.title as string) ?? `Aprobación requerida (${event.event})`,
          payload: event.payload as object,
          requestedBy: "AUTOMATION",
          status: "PENDING",
        },
      });
      return { awaitingApproval: true };

    case "run_ai_agent":
      if (action.params?.agentId) {
        await enqueueJob("run_ai_agent", { agentId: action.params.agentId as string, reason: event.event });
      }
      return { queued: true };

    case "analyze_reviews":
      if (businessId) await enqueueJob("analyze_reviews", { businessId });
      return { queued: true };

    case "send_email":
      return { skipped: true, reason: "send_email requiere emailId concreto, configurar vía campaña" };

    default:
      return { skipped: true };
  }
}
