// Geographic helpers — polygon area, GeoJSON validation.

export interface GeoJsonPolygon {
  type: "Polygon";
  /** Outer ring + optional holes. First and last coordinate of each ring must match. */
  coordinates: [number, number][][];
}

export class InvalidPolygonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPolygonError";
  }
}

const EARTH_RADIUS_M = 6371008.8;

/** Validates a GeoJSON Polygon shape (RFC 7946). Throws InvalidPolygonError. */
export function validatePolygon(p: unknown): GeoJsonPolygon {
  if (!p || typeof p !== "object") {
    throw new InvalidPolygonError("Polygon objesi gerekli");
  }
  const obj = p as { type?: unknown; coordinates?: unknown };
  if (obj.type !== "Polygon") {
    throw new InvalidPolygonError(`Beklenen tip "Polygon", görünen "${String(obj.type)}"`);
  }
  if (!Array.isArray(obj.coordinates) || obj.coordinates.length === 0) {
    throw new InvalidPolygonError("Polygon en az bir halka içermeli");
  }
  const rings: [number, number][][] = [];
  for (const ring of obj.coordinates) {
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new InvalidPolygonError("Her halka en az 4 nokta (kapalı) içermeli");
    }
    const ringPts: [number, number][] = [];
    for (const pt of ring) {
      if (
        !Array.isArray(pt) ||
        pt.length < 2 ||
        typeof pt[0] !== "number" ||
        typeof pt[1] !== "number"
      ) {
        throw new InvalidPolygonError("Nokta [lng, lat] sayı çifti olmalı");
      }
      const [lng, lat] = pt as [number, number];
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new InvalidPolygonError("Koordinat sınır dışı");
      }
      ringPts.push([lng, lat]);
    }
    const first = ringPts[0]!;
    const last = ringPts[ringPts.length - 1]!;
    if (first[0] !== last[0] || first[1] !== last[1]) {
      throw new InvalidPolygonError("Her halka kapalı olmalı (ilk = son nokta)");
    }
    rings.push(ringPts);
  }
  return { type: "Polygon", coordinates: rings };
}

/**
 * Polygon alanını metrekare cinsinden döndürür. Spherical excess'in
 * Bevis & Cambareri (1987) varyantı: küçük/orta poligonlar için yeterli
 * (doğruluk genelde %0.1 içinde). 100 km² eşik kontrolü için yeter.
 */
export function polygonAreaSqMeters(poly: GeoJsonPolygon): number {
  let total = 0;
  for (let r = 0; r < poly.coordinates.length; r++) {
    const ring = poly.coordinates[r]!;
    const a = ringArea(ring);
    // İlk halka outer ring (alanı +); diğerleri delik (alanı -).
    total += r === 0 ? a : -a;
  }
  return Math.abs(total);
}

function ringArea(ring: [number, number][]): number {
  if (ring.length < 4) return 0;
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const p1 = ring[i]!;
    const p2 = ring[i + 1]!;
    total += toRad(p2[0] - p1[0]) * (2 + Math.sin(toRad(p1[1])) + Math.sin(toRad(p2[1])));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Polygon → bbox [minLng, minLat, maxLng, maxLat] */
export function polygonBbox(poly: GeoJsonPolygon): [number, number, number, number] {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const ring of poly.coordinates) {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return [minLng, minLat, maxLng, maxLat];
}
