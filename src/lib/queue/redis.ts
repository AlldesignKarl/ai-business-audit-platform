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
  });
  global.__redis = redis;
  return redis;
}
