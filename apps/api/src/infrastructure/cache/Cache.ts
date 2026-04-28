// Generic cache abstraction. Two implementations:
// - RedisCache: production. ioredis client, TTL'ler ms cinsinden Redis'in
//   PX seçeneğiyle uygulanır.
// - InMemoryCache: dev/test fallback. Tek process'te yaşar; restart'ta sıfırlanır.
//
// API set/get JSON-serializable değerler için. Daha exotic tipleri saklamak
// gerekirse caller serialize etmeli.

export interface Cache {
  /** Returns the cached value or null. */
  get<T>(key: string): Promise<T | null>;
  /** Stores a JSON-serializable value with optional TTL (seconds). */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  /** Removes a single key. */
  del(key: string): Promise<void>;
  /** Logical name for logs. */
  readonly name: string;
}
