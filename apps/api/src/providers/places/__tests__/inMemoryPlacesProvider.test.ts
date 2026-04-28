import { describe, it, expect } from "vitest";
import { InMemoryPlacesProvider } from "../InMemoryPlacesProvider.js";
import { mapPrimaryTypeToCategory } from "../PlacesProvider.js";

describe("InMemoryPlacesProvider", () => {
  it("returns 0 results for an empty seed", async () => {
    const p = new InMemoryPlacesProvider([]);
    const out = await p.searchNearby({ lat: 40.99, lng: 29.03, radiusMeters: 1000 });
    expect(out).toHaveLength(0);
  });

  it("filters by Haversine distance from center", async () => {
    const p = new InMemoryPlacesProvider();
    // Center on Kadıköy with 500m radius — only the closest seeds should match.
    const close = await p.searchNearby({ lat: 40.99, lng: 29.03, radiusMeters: 500 });
    const far = await p.searchNearby({ lat: 40.99, lng: 29.03, radiusMeters: 5000 });
    expect(close.length).toBeLessThan(far.length);
    expect(far.length).toBeGreaterThan(0);
  });

  it("filters by category when provided", async () => {
    const p = new InMemoryPlacesProvider();
    const cafes = await p.searchNearby({
      lat: 40.99,
      lng: 29.03,
      radiusMeters: 5000,
      categories: ["restaurant_cafe"],
    });
    expect(cafes.length).toBeGreaterThan(0);
    for (const r of cafes) expect(r.category).toBe("restaurant_cafe");
  });

  it("respects maxResults cap", async () => {
    const p = new InMemoryPlacesProvider();
    const limited = await p.searchNearby({
      lat: 40.99,
      lng: 29.03,
      radiusMeters: 10_000,
      maxResults: 3,
    });
    expect(limited).toHaveLength(3);
  });

  it("results are returned sorted by ascending distance", async () => {
    const p = new InMemoryPlacesProvider([
      { googlePlaceId: "a", name: "near", lat: 40.99, lng: 29.03, category: "other" },
      { googlePlaceId: "b", name: "mid", lat: 40.995, lng: 29.04, category: "other" },
      { googlePlaceId: "c", name: "far", lat: 41.01, lng: 29.06, category: "other" },
    ]);
    const out = await p.searchNearby({ lat: 40.99, lng: 29.03, radiusMeters: 5000 });
    expect(out.map((r) => r.googlePlaceId)).toEqual(["a", "b", "c"]);
  });

  it("costUsdPerCall is 0", () => {
    const p = new InMemoryPlacesProvider();
    expect(p.costUsdPerCall("nearby_search")).toBe(0);
  });
});

describe("mapPrimaryTypeToCategory", () => {
  it("maps food/cafe types to restaurant_cafe", () => {
    expect(mapPrimaryTypeToCategory("restaurant")).toBe("restaurant_cafe");
    expect(mapPrimaryTypeToCategory("cafe")).toBe("restaurant_cafe");
    expect(mapPrimaryTypeToCategory("bar")).toBe("restaurant_cafe");
  });
  it("maps health-ish types", () => {
    expect(mapPrimaryTypeToCategory("hospital")).toBe("health");
    expect(mapPrimaryTypeToCategory("pharmacy")).toBe("health");
    expect(mapPrimaryTypeToCategory("dental_clinic")).toBe("health");
  });
  it("maps unknown to other", () => {
    expect(mapPrimaryTypeToCategory("zoo")).toBe("other");
    expect(mapPrimaryTypeToCategory(null)).toBe("other");
  });
});
