import { getRedis } from "@/lib/queue/redis";

/**
 * Rate limiter de ventana fija basado en Redis (INCR + EXPIRE), apto para
 * multi-instancia. Úsalo tanto para límites por proveedor externo (p.ej.
 * Google Places) como para endpoints públicos sensibles (login).
 *
 * Falla ABIERTO (permite la acción) si Redis no está disponible o no
 * responde a tiempo, en lugar de tumbar la petición entera — un límite de
 * tasa caído nunca debe bloquear el login u otras funciones críticas.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  try {
    const redis = getRedis();
    const redisKey = `ratelimit:${key}`;
    const count = await withTimeout(redis.incr(redisKey), 3000);
    if (count === 1) {
      await withTimeout(redis.expire(redisKey, windowSeconds), 3000);
    }
    const ttl = await withTimeout(redis.ttl(redisKey), 3000);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetInSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[rate-limit] Redis no disponible, fallando abierto para "${key}":`, error);
    return { allowed: true, remaining: limit, resetInSeconds: windowSeconds };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Redis timeout tras ${ms}ms`)), ms)),
  ]);
}
