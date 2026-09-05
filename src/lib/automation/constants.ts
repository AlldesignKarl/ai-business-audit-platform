/** Eventos y tipos de acción realmente soportados por el motor de
 *  automatizaciones (automation-engine.ts) — la única lista que el Agente de
 *  Automatización puede usar, para no sugerir nunca una integración inexistente. */
export const AUTOMATION_AVAILABLE_EVENTS = ["audit.completed", "email.replied"] as const;
export const AUTOMATION_AVAILABLE_ACTIONS = ["create_task", "require_approval", "run_ai_agent", "analyze_reviews"] as const;
