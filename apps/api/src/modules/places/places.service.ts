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
import { Prisma, type PrismaClient } from "@prisma/client";
import type { Cache } from "../../infrastructure/cache/index.js";
import type {
  NearbySearchParams,
  PlaceCategory,
  PlaceSummary,
  PlacesProvider,
} from "../../providers/places/index.js";
import { mapPrimaryTypeToCategory } from "../../providers/places/index.js";
import { recordCost } from "../cost/cost.service.js";
import { withTenant } from "../../infrastructure/db/tenantPrisma.js";
import {
  InvalidPolygonError,
  type GeoJsonPolygon,
  polygonAreaSqMeters,
  polygonBbox,
  validatePolygon,
} from "../../utils/geo.js";

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
  // After the regular upsert we backfill the PostGIS `location` geography
  // column from (lat, lng) using a raw UPDATE — Prisma can't write to the
  // Unsupported() column directly. Idempotent and cheap.
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
        // PostGIS geography backfill — wrapped in IF EXISTS check at column
        // level so this no-ops cleanly on Postgres instances without PostGIS.
        try {
          await tx.$executeRaw`
            UPDATE "Company"
            SET location = ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326)::geography
            WHERE "googlePlaceId" = ${p.googlePlaceId}
          `;
        } catch {
          // Column not present (PostGIS not installed) — skip silently.
        }
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

// ===========================================================================
// US-3.1 — Polygon search
// ===========================================================================

const MAX_POLYGON_AREA_SQM = 100_000_000; // 100 km²

export interface SearchInPolygonOptions {
  tenantId: string;
  userId: string;
  polygon: unknown; // raw GeoJSON, validated inside
  categories?: PlaceCategory[];
  maxResults?: number;
}

export interface SearchInPolygonResult {
  places: PlaceSummary[];
  source: "cache" | "api";
  count: number;
  bbox: [number, number, number, number];
  areaSqMeters: number;
}

export class PolygonTooLargeError extends Error {
  constructor(public areaSqMeters: number) {
    super(
      `Poligon alanı çok büyük (${(areaSqMeters / 1_000_000).toFixed(1)} km²). ` +
        `İzin verilen maksimum ${MAX_POLYGON_AREA_SQM / 1_000_000} km².`,
    );
    this.name = "PolygonTooLargeError";
  }
}

export { InvalidPolygonError };

interface CompanyRow {
  id: string;
  googlePlaceId: string;
  name: string;
  formattedAddress: string | null;
  lat: number | null;
  lng: number | null;
  category: string | null;
  types: string[];
  rating: number | null;
  reviewCount: number | null;
}

export async function searchInPolygon(
  deps: PlacesServiceDeps,
  opts: SearchInPolygonOptions,
): Promise<SearchInPolygonResult> {
  const polygon: GeoJsonPolygon = validatePolygon(opts.polygon);
  const area = polygonAreaSqMeters(polygon);
  if (area > MAX_POLYGON_AREA_SQM) {
    throw new PolygonTooLargeError(area);
  }
  const bbox = polygonBbox(polygon);
  const max = opts.maxResults ?? 200;
  const geoJsonString = JSON.stringify(polygon);

  // Cache key: full polygon hash + categories
  const cacheKey = buildPolygonCacheKey(geoJsonString, opts.categories);
  const cached = await deps.cache.get<PlaceSummary[]>(cacheKey);
  if (cached) {
    return { places: cached, source: "cache", count: cached.length, bbox, areaSqMeters: area };
  }

  // PostGIS query: ST_Contains on the geography column. Kept inside withTenant
  // so RLS still applies. Falls back to bbox+JS when location column missing.
  const rows = await withTenant(deps.prisma, opts.tenantId, async (tx) => {
    const allowed = opts.categories && opts.categories.length > 0 ? opts.categories : null;
    try {
      // Try the PostGIS path first.
      const result = await tx.$queryRaw<CompanyRow[]>`
        SELECT id, "googlePlaceId", name, "formattedAddress", lat, lng, category, types,
               rating, "reviewCount"
        FROM "Company"
        WHERE "tenantId" = ${opts.tenantId}
          AND location IS NOT NULL
          AND ST_Contains(
            ST_GeomFromGeoJSON(${geoJsonString})::geography::geometry,
            location::geometry
          )
          ${
            allowed
              ? Prisma.sql`AND category = ANY(${allowed})`
              : Prisma.empty
          }
        ORDER BY name
        LIMIT ${max}
      `;
      return result;
    } catch {
      // Fallback: bbox scan + JS point-in-polygon (works without PostGIS).
      const [minLng, minLat, maxLng, maxLat] = bbox;
      const candidates = await tx.company.findMany({
        where: {
          tenantId: opts.tenantId,
          lat: { gte: minLat, lte: maxLat },
          lng: { gte: minLng, lte: maxLng },
          ...(allowed ? { category: { in: allowed } } : {}),
        },
        take: max * 2,
        select: {
          id: true,
          googlePlaceId: true,
          name: true,
          formattedAddress: true,
          lat: true,
          lng: true,
          category: true,
          types: true,
          rating: true,
          reviewCount: true,
        },
      });
      return candidates.filter(
        (c) => c.lat != null && c.lng != null && pointInPolygon(c.lng, c.lat, polygon),
      );
    }
  });

  const places: PlaceSummary[] = rows.map((c) => ({
    googlePlaceId: c.googlePlaceId,
    name: c.name,
    formattedAddress: c.formattedAddress ?? null,
    lat: c.lat ?? 0,
    lng: c.lng ?? 0,
    category: (c.category as PlaceCategory) ?? mapPrimaryTypeToCategory(c.types?.[0]),
    types: c.types ?? [],
    rating: c.rating ?? null,
    reviewCount: c.reviewCount ?? null,
  }));

  // Note: polygon search reads from cached Company table; no fresh provider call.
  // Cost event written for visibility (provider="cache_polygon", $0).
  await recordCost(deps.prisma, {
    tenantId: opts.tenantId,
    userId: opts.userId,
    provider: "cache_polygon",
    endpoint: "search_polygon",
    costUsd: 0,
    metadata: {
      bbox,
      areaSqMeters: area,
      categories: opts.categories ?? [],
      resultCount: places.length,
    },
  });

  await deps.cache.set(cacheKey, places, CACHE_TTL_SECONDS);
  return { places, source: "api", count: places.length, bbox, areaSqMeters: area };
}

function buildPolygonCacheKey(geoJsonString: string, categories?: PlaceCategory[]): string {
  const polyHash = createHash("md5").update(geoJsonString).digest("hex").slice(0, 12);
  const cats = (categories ?? []).slice().sort().join(",");
  const catHash = createHash("md5").update(cats).digest("hex").slice(0, 8);
  return `places:polygon:${polyHash}:${catHash}`;
}

/** Ray-casting point-in-polygon, GeoJSON [lng,lat] coordinate system. */
function pointInPolygon(lng: number, lat: number, poly: GeoJsonPolygon): boolean {
  // Outer ring contains, holes exclude.
  if (poly.coordinates.length === 0) return false;
  if (!ringContains(lng, lat, poly.coordinates[0]!)) return false;
  for (let i = 1; i < poly.coordinates.length; i++) {
    if (ringContains(lng, lat, poly.coordinates[i]!)) return false;
  }
  return true;
}

function ringContains(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
