// Places domain service — provider çağrısını cache + Postgres upsert + cost
// tracking ile sarmalayan tek noktadır.
//
// Akış:
//   1. Cache key (geohash6 + radius bucket + categories) hash'le.
//   2. Cache hit → JSON parse → dön.
//   3. Cache miss → provider.searchNearby(...) → cost event yaz →
//      Postgres'e tenant-scoped upsert → cache'e yaz → dön.

import { createHash } from "node:crypto";
import ngeohash from "ngeohash";
import type { PrismaClient } from "@prisma/client";
import type { Cache } from "../../infrastructure/cache/index.js";
import type {
  NearbySearchParams,
  PlaceSummary,
  PlacesProvider,
} from "../../providers/places/index.js";
import { recordCost } from "../cost/cost.service.js";
import { withTenant } from "../../infrastructure/db/tenantPrisma.js";

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days, matches ToS for cached results

export interface SearchNearbyOptions extends NearbySearchParams {
  tenantId: string;
  userId: string;
}

export interface SearchNearbyResult {
  places: PlaceSummary[];
  source: "cache" | "api";
  count: number;
}

export interface PlacesServiceDeps {
  prisma: PrismaClient;
  cache: Cache;
  provider: PlacesProvider;
}

export async function searchNearby(
  deps: PlacesServiceDeps,
  opts: SearchNearbyOptions,
): Promise<SearchNearbyResult> {
  const cacheKey = buildCacheKey(opts);

  const cached = await deps.cache.get<PlaceSummary[]>(cacheKey);
  if (cached) {
    return { places: cached, source: "cache", count: cached.length };
  }

  const places = await deps.provider.searchNearby({
    lat: opts.lat,
    lng: opts.lng,
    radiusMeters: opts.radiusMeters,
    categories: opts.categories,
    maxResults: opts.maxResults,
  });

  // Track cost for paid providers (InMemory returns 0 → no-op event still
  // writes for debug visibility).
  await recordCost(deps.prisma, {
    tenantId: opts.tenantId,
    userId: opts.userId,
    provider: deps.provider.name,
    endpoint: "nearby_search",
    costUsd: deps.provider.costUsdPerCall("nearby_search"),
    metadata: {
      lat: opts.lat,
      lng: opts.lng,
      radiusMeters: opts.radiusMeters,
      categories: opts.categories ?? [],
      resultCount: places.length,
    },
  });

  // Tenant-scoped upsert into the Company cache table.
  if (places.length > 0) {
    await withTenant(deps.prisma, opts.tenantId, async (tx) => {
      for (const p of places) {
        await tx.company.upsert({
          where: { googlePlaceId: p.googlePlaceId },
          create: {
            tenantId: opts.tenantId,
            googlePlaceId: p.googlePlaceId,
            name: p.name,
            formattedAddress: p.formattedAddress,
            lat: p.lat,
            lng: p.lng,
            category: p.category,
            types: p.types,
            rating: p.rating,
            reviewCount: p.reviewCount,
          },
          update: {
            name: p.name,
            formattedAddress: p.formattedAddress,
            lat: p.lat,
            lng: p.lng,
            category: p.category,
            types: p.types,
            rating: p.rating,
            reviewCount: p.reviewCount,
          },
        });
      }
    });
  }

  await deps.cache.set(cacheKey, places, CACHE_TTL_SECONDS);

  return { places, source: "api", count: places.length };
}

function buildCacheKey(opts: SearchNearbyOptions): string {
  const geohash = ngeohash.encode(opts.lat, opts.lng, 6); // ≈ 1.2 km × 0.6 km buckets
  const radiusBucket = bucketRadius(opts.radiusMeters);
  const cats = (opts.categories ?? []).slice().sort().join(",");
  const catHash = createHash("md5").update(cats).digest("hex").slice(0, 8);
  return `places:nearby:${geohash}:${radiusBucket}:${catHash}`;
}

function bucketRadius(r: number): string {
  if (r <= 500) return "500";
  if (r <= 1000) return "1000";
  if (r <= 2000) return "2000";
  if (r <= 5000) return "5000";
  return String(Math.round(r));
}
