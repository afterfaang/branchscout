// RedisCache — production cache via ioredis. Lazy-imported so the API still
// boots when REDIS_URL is missing.

import type { Cache } from "./Cache.js";

interface MinimalRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: "EX" | "PX", ttl?: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  quit(): Promise<unknown>;
}

export class RedisCache implements Cache {
  readonly name = "redis";

  private constructor(private readonly client: MinimalRedisClient) {}

  static async create(redisUrl: string): Promise<RedisCache> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const ioredisModule = await import("ioredis");
    // ioredis exports a default class.
    const Ctor =
      (ioredisModule as unknown as { default?: new (url: string) => MinimalRedisClient })
        .default ??
      (ioredisModule as unknown as new (url: string) => MinimalRedisClient);
    const client = new Ctor(redisUrl);
    return new RedisCache(client);
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, serialized, "EX", ttlSeconds);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async quit(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      // best-effort during shutdown
    }
  }
}
