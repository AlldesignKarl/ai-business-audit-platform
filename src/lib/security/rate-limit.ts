import { getRedis } from "@/lib/queue/redis";

/**
 * Rate limiter de ventana fija basado en Redis (INCR + EXPIRE), apto para
 * multi-instancia. Úsalo tanto para límites por proveedor externo (p.ej.
 * Google Places) como para endpoints públicos sensibles (login).
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const redis = getRedis();
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSeconds);
  }
  const ttl = await redis.ttl(redisKey);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetInSeconds: ttl > 0 ? ttl : windowSeconds,
  };
}
