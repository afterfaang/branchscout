// Places domain service unit tests — cache hit/miss + provider fan-out + cost.

import { describe, it, expect, vi } from "vitest";
import { searchNearby } from "../places.service.js";
import { InMemoryPlacesProvider } from "../../../providers/places/InMemoryPlacesProvider.js";
import { InMemoryCache } from "../../../infrastructure/cache/InMemoryCache.js";
import type { PlacesServiceDeps } from "../places.service.js";

function makeFakePrisma() {
  const upsertCalls: { where: unknown; create: unknown }[] = [];
  const costCalls: unknown[] = [];
  const tx = {
    company: {
      upsert: async (args: { where: unknown; create: unknown }) => {
        upsertCalls.push(args);
        return args.create;
      },
    },
    apiCostEvent: {
      create: async (args: { data: unknown }) => {
        costCalls.push(args.data);
        return args.data;
      },
    },
    $executeRaw: async () => 0,
  };
  const prisma = {
    ...tx,
    $transaction: async <T>(fn: (innerTx: typeof tx) => Promise<T>) => fn(tx),
  };
  return { prisma, upsertCalls, costCalls };
}

function makeDeps(): {
  deps: PlacesServiceDeps;
  cache: InMemoryCache;
  upsertCalls: { where: unknown; create: unknown }[];
  costCalls: unknown[];
} {
  const cache = new InMemoryCache();
  const provider = new InMemoryPlacesProvider();
  const { prisma, upsertCalls, costCalls } = makeFakePrisma();
  return {
    deps: {
      cache,
      provider,
      prisma: prisma as unknown as PlacesServiceDeps["prisma"],
    },
    cache,
    upsertCalls,
    costCalls,
  };
}

describe("searchNearby", () => {
  const baseOpts = {
    tenantId: "t1",
    userId: "u1",
    lat: 40.99,
    lng: 29.03,
    radiusMeters: 1000,
  };

  it("provider miss → calls provider, writes cache, upserts companies, records cost", async () => {
    const { deps, cache, upsertCalls, costCalls } = makeDeps();
    const result = await searchNearby(deps, baseOpts);

    expect(result.source).toBe("api");
    expect(result.places.length).toBeGreaterThan(0);
    expect(result.count).toBe(result.places.length);

    // Cache populated.
    expect(cache.size()).toBe(1);

    // Cost event written.
    expect(costCalls).toHaveLength(1);
    const cost = costCalls[0] as { provider: string; endpoint: string; tenantId: string };
    expect(cost.provider).toBe("in_memory_places");
    expect(cost.endpoint).toBe("nearby_search");
    expect(cost.tenantId).toBe("t1");

    // Upserts happened (one per result).
    expect(upsertCalls.length).toBe(result.places.length);
  });

  it("second call with same opts returns from cache (provider not called again)", async () => {
    const { deps } = makeDeps();
    const spy = vi.spyOn(deps.provider, "searchNearby");

    await searchNearby(deps, baseOpts);
    expect(spy).toHaveBeenCalledTimes(1);

    const second = await searchNearby(deps, baseOpts);
    expect(second.source).toBe("cache");
    expect(spy).toHaveBeenCalledTimes(1); // still 1 — cache hit
  });

  it("different category list yields a different cache key", async () => {
    const { deps } = makeDeps();
    const a = await searchNearby(deps, { ...baseOpts, categories: ["health"] });
    const b = await searchNearby(deps, {
      ...baseOpts,
      categories: ["restaurant_cafe"],
    });
    expect(a.source).toBe("api");
    expect(b.source).toBe("api");
  });

  it("identical category list (different order) shares the cache key", async () => {
    const { deps } = makeDeps();
    const a = await searchNearby(deps, {
      ...baseOpts,
      categories: ["restaurant_cafe", "retail"],
    });
    const b = await searchNearby(deps, {
      ...baseOpts,
      categories: ["retail", "restaurant_cafe"],
    });
    expect(a.source).toBe("api");
    expect(b.source).toBe("cache");
  });
});
