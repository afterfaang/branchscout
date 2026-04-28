import { describe, it, expect } from "vitest";
import {
  InvalidPolygonError,
  polygonAreaSqMeters,
  polygonBbox,
  validatePolygon,
} from "../geo.js";

const KADIKOY_POLYGON = {
  type: "Polygon" as const,
  coordinates: [
    [
      [29.025, 40.985],
      [29.045, 40.985],
      [29.045, 41.005],
      [29.025, 41.005],
      [29.025, 40.985],
    ],
  ],
};

describe("validatePolygon", () => {
  it("accepts a valid closed polygon", () => {
    const out = validatePolygon(KADIKOY_POLYGON);
    expect(out.type).toBe("Polygon");
    expect(out.coordinates[0]).toHaveLength(5);
  });

  it("rejects non-Polygon types", () => {
    expect(() => validatePolygon({ type: "Point", coordinates: [0, 0] })).toThrow(
      InvalidPolygonError,
    );
  });

  it("rejects rings with fewer than 4 points", () => {
    expect(() =>
      validatePolygon({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      }),
    ).toThrow(InvalidPolygonError);
  });

  it("rejects unclosed rings", () => {
    expect(() =>
      validatePolygon({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ],
        ],
      }),
    ).toThrow(InvalidPolygonError);
  });

  it("rejects out-of-bounds coordinates", () => {
    expect(() =>
      validatePolygon({
        type: "Polygon",
        coordinates: [
          [
            [200, 0],
            [201, 0],
            [201, 1],
            [200, 1],
            [200, 0],
          ],
        ],
      }),
    ).toThrow(InvalidPolygonError);
  });
});

describe("polygonAreaSqMeters", () => {
  it("returns area roughly matching a small Kadıköy box (~3 km²)", () => {
    const validated = validatePolygon(KADIKOY_POLYGON);
    const area = polygonAreaSqMeters(validated);
    // ~0.02° lng × 0.02° lat at lat 40.99 ≈ 1.68 km × 2.22 km ≈ 3.7 km²
    expect(area).toBeGreaterThan(3_000_000);
    expect(area).toBeLessThan(4_500_000);
  });

  it("subtracts holes from outer ring", () => {
    const outer: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ];
    const hole: [number, number][] = [
      [0.25, 0.25],
      [0.75, 0.25],
      [0.75, 0.75],
      [0.25, 0.75],
      [0.25, 0.25],
    ];
    const withHole = polygonAreaSqMeters({
      type: "Polygon",
      coordinates: [outer, hole] as [number, number][][],
    });
    const withoutHole = polygonAreaSqMeters({
      type: "Polygon",
      coordinates: [outer] as [number, number][][],
    });
    expect(withHole).toBeLessThan(withoutHole);
  });
});

describe("polygonBbox", () => {
  it("returns [minLng, minLat, maxLng, maxLat]", () => {
    const validated = validatePolygon(KADIKOY_POLYGON);
    expect(polygonBbox(validated)).toEqual([29.025, 40.985, 29.045, 41.005]);
  });
});
