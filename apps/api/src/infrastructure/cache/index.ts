// Cache factory: REDIS_URL set ise RedisCache; aksi halde InMemoryCache.

import type { Cache } from "./Cache.js";
import { InMemoryCache } from "./InMemoryCache.js";
import { RedisCache } from "./RedisCache.js";

export type { Cache } from "./Cache.js";
export { InMemoryCache } from "./InMemoryCache.js";

export async function buildCache(opts: {
  redisUrl?: string;
  logger?: (msg: string) => void;
}): Promise<Cache> {
  if (opts.redisUrl) {
    try {
      const cache = await RedisCache.create(opts.redisUrl);
      opts.logger?.("cache: connected to Redis");
      return cache;
    } catch (err) {
      opts.logger?.(
        `cache: Redis connect failed (${(err as Error).message}); falling back to memory`,
      );
    }
  } else {
    opts.logger?.("cache: REDIS_URL not set; using in-memory cache");
  }
  return new InMemoryCache();
}
