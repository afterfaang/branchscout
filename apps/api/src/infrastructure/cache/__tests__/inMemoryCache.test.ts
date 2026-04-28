import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InMemoryCache } from "../InMemoryCache.js";
import { buildCache } from "../index.js";

describe("InMemoryCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("set + get round-trip a JSON value", async () => {
    const cache = new InMemoryCache();
    await cache.set("k", { hello: "world", n: 42 });
    expect(await cache.get<{ hello: string; n: number }>("k")).toEqual({
      hello: "world",
      n: 42,
    });
  });

  it("returns null for missing key", async () => {
    const cache = new InMemoryCache();
    expect(await cache.get("nope")).toBeNull();
  });

  it("expires entries after TTL", async () => {
    const cache = new InMemoryCache();
    await cache.set("k", "v", 1); // 1s TTL
    expect(await cache.get("k")).toBe("v");
    vi.advanceTimersByTime(1500);
    expect(await cache.get("k")).toBeNull();
  });

  it("keeps entries with no TTL", async () => {
    const cache = new InMemoryCache();
    await cache.set("k", "v");
    vi.advanceTimersByTime(60 * 60 * 1000); // 1h
    expect(await cache.get("k")).toBe("v");
  });

  it("del removes a key", async () => {
    const cache = new InMemoryCache();
    await cache.set("k", "v");
    await cache.del("k");
    expect(await cache.get("k")).toBeNull();
  });

  it("evicts oldest entries beyond maxSize", async () => {
    const cache = new InMemoryCache({ maxSize: 3 });
    await cache.set("a", 1);
    await cache.set("b", 2);
    await cache.set("c", 3);
    await cache.set("d", 4);
    expect(await cache.get("a")).toBeNull();
    expect(await cache.get("d")).toBe(4);
    expect(cache.size()).toBe(3);
  });
});

describe("buildCache", () => {
  it("falls back to InMemory when no Redis URL", async () => {
    const logs: string[] = [];
    const cache = await buildCache({ logger: (m) => logs.push(m) });
    expect(cache.name).toBe("memory");
    expect(logs.some((l) => l.includes("in-memory"))).toBe(true);
  });
});
