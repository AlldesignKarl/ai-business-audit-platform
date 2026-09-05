import IORedis, { type Redis } from "ioredis";
import { getEnv } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

export function getRedis(): Redis {
  if (global.__redis) return global.__redis;
  const redis = new IORedis(getEnv().REDIS_URL, {
    maxRetriesPerRequest: null, // requerido por BullMQ
    lazyConnect: true,
  });
  // ioredis crashea el proceso si el evento 'error' no tiene listener —
  // lo registramos para que un Redis caído/no configurado nunca tumbe la
  // app web (solo afecta a colas/rate-limit, que ya fallan de forma segura).
  redis.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("[redis] connection error:", err.message);
  });
  global.__redis = redis;
  return redis;
}
