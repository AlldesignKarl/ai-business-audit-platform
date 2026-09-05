/**
 * Comprobador mínimo de robots.txt. La plataforma solo analiza páginas
 * públicas que el propio robots.txt del negocio permite rastrear a un user
 * agent genérico — nunca evade bloqueos ni protecciones.
 */
const USER_AGENT = "AIBusinessAuditBot/1.0 (+https://example.com/bot)";

export async function isPathAllowedByRobots(origin: string, path: string): Promise<boolean> {
  try {
    const res = await fetch(new URL("/robots.txt", origin).toString(), {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return true; // sin robots.txt -> se asume permitido
    const body = await res.text();
    return evaluateRobotsTxt(body, path);
  } catch {
    return true;
  }
}

export function evaluateRobotsTxt(robotsTxt: string, path: string): boolean {
  const lines = robotsTxt.split("\n").map((l) => l.trim());
  let applies = false;
  const disallows: string[] = [];

  for (const line of lines) {
    if (/^user-agent:/i.test(line)) {
      const agent = line.split(":")[1]?.trim();
      applies = agent === "*";
    } else if (applies && /^disallow:/i.test(line)) {
      const rule = line.split(":").slice(1).join(":").trim();
      if (rule) disallows.push(rule);
    }
  }

  return !disallows.some((rule) => path.startsWith(rule));
}

export const AUDIT_USER_AGENT = USER_AGENT;
