// InMemoryCache — process-local cache for dev/test/fallback. Map<string, entry>.
// TTL setIntervalsız uygulanır: get() sırasında expiry kontrol edilir,
// expired key silinir.

import type { Cache } from "./Cache.js";

interface Entry<T> {
  value: T;
  expiresAt: number | null; // ms epoch
}

export class InMemoryCache implements Cache {
  readonly name = "memory";
  private readonly store = new Map<string, Entry<unknown>>();
  private readonly maxSize: number;

  constructor(opts: { maxSize?: number } = {}) {
    this.maxSize = opts.maxSize ?? 5000;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    // Evict oldest when over budget — naive but adequate for dev.
    while (this.store.size > this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (!oldest) break;
      this.store.delete(oldest);
    }
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  /** Test helper. */
  size(): number {
    return this.store.size;
  }

  /** Test helper. */
  clear(): void {
    this.store.clear();
  }
}
