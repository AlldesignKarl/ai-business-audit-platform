import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";

/** Suma del coste de IA (USD) de una organización en el día natural en curso. */
export async function getAiCostToday(organizationId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const result = await db.aiRun.aggregate({
    where: { organizationId, createdAt: { gte: startOfDay } },
    _sum: { costUsd: true },
  });
  return result._sum.costUsd ?? 0;
}

export async function getAiCostThisMonth(organizationId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const result = await db.aiRun.aggregate({
    where: { organizationId, createdAt: { gte: startOfMonth } },
    _sum: { costUsd: true },
  });
  return result._sum.costUsd ?? 0;
}

/** Lanza si la organización ha superado su presupuesto diario de IA (0 = sin límite). */
export async function assertWithinDailyBudget(organizationId: string): Promise<void> {
  const budget = getEnv().AI_DAILY_BUDGET_USD;
  if (budget <= 0) return;
  const spent = await getAiCostToday(organizationId);
  if (spent >= budget) {
    throw new Error(
      `Presupuesto diario de IA superado ($${spent.toFixed(2)} / $${budget.toFixed(2)}). ` +
        `Las tareas de IA quedan en cola hasta mañana o hasta ampliar AI_DAILY_BUDGET_USD.`
    );
  }
}
