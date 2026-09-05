import { db } from "@/lib/db";
import { ModelRouter } from "@/lib/ai/model-router";
import { getPromptSpec } from "@/lib/ai/prompt-manager";
import { assertWithinDailyBudget } from "@/lib/ai/cost-guard";
import type { AiRunType, TaskComplexity } from "@/lib/ai/types";

interface RunAiTaskInput {
  organizationId: string;
  businessId?: string;
  agentId?: string;
  type: AiRunType;
  complexity: TaskComplexity;
  context: Record<string, unknown>;
  maxTokens?: number;
}

/**
 * AI Orchestrator: único punto de entrada para invocar IA en toda la
 * plataforma. Aplica presupuesto diario, elige proveedor/modelo vía
 * ModelRouter, construye el prompt vía PromptManager, y deja constancia en
 * AiRun (coste, tokens, entrada/salida) para observabilidad y facturación.
 */
export async function runAiTask(input: RunAiTaskInput): Promise<string> {
  const router = new ModelRouter();
  const provider = router.resolve();
  const spec = getPromptSpec(input.type);
  const userPrompt = spec.buildUserPrompt(input.context);

  if (provider.name !== "null") {
    await assertWithinDailyBudget(input.organizationId);
  }

  try {
    const result = await provider.generate({
      system: spec.system,
      prompt: userPrompt,
      maxTokens: input.maxTokens,
      complexity: input.complexity,
    });

    await db.aiRun.create({
      data: {
        organizationId: input.organizationId,
        agentId: input.agentId,
        businessId: input.businessId,
        type: input.type,
        provider: result.provider,
        model: result.model,
        input: { system: spec.system, prompt: userPrompt } as object,
        output: { text: result.text } as object,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costUsd: result.costUsd,
        status: "COMPLETED",
      },
    });

    return result.text;
  } catch (error) {
    await db.aiRun.create({
      data: {
        organizationId: input.organizationId,
        agentId: input.agentId,
        businessId: input.businessId,
        type: input.type,
        provider: provider.name,
        model: "unknown",
        input: { system: spec.system, prompt: userPrompt } as object,
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
