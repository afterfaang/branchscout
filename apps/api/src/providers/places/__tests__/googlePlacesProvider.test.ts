import { describe, it, expect, vi } from "vitest";
import { GooglePlacesProvider } from "../GooglePlacesProvider.js";

describe("GooglePlacesProvider", () => {
  it("requires apiKey at construction", () => {
    expect(() => new GooglePlacesProvider({ apiKey: "" })).toThrow();
  });

  it("sends FieldMask + apiKey headers and parses results", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({
          places: [
            {
              id: "ChIJX",
              displayName: { text: "Demo Cafe" },
              formattedAddress: "Bağdat Cd. 1",
              location: { latitude: 40.99, longitude: 29.03 },
              types: ["cafe", "food"],
              primaryType: "cafe",
              rating: 4.5,
              userRatingCount: 100,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const provider = new GooglePlacesProvider({
      apiKey: "test-key",
      fetchImpl: fetchMock,
    });

    const out = await provider.searchNearby({
      lat: 40.99,
      lng: 29.03,
      radiusMeters: 1000,
      categories: ["restaurant_cafe"],
      maxResults: 10,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const args = fetchMock.mock.calls[0]!;
    const init = args[1]!;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-key");
    expect(headers["X-Goog-FieldMask"]).toContain("places.displayName");
    // Should NOT request Pro/Enterprise SKU fields like editorialSummary.
    expect(headers["X-Goog-FieldMask"]).not.toContain("editorialSummary");
    const parsedBody = JSON.parse(init.body as string) as {
      includedTypes?: string[];
      maxResultCount?: number;
      locationRestriction: { circle: { radius: number } };
    };
    expect(parsedBody.maxResultCount).toBe(10);
    expect(parsedBody.includedTypes).toContain("restaurant");
    expect(parsedBody.locationRestriction.circle.radius).toBe(1000);

    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      googlePlaceId: "ChIJX",
      name: "Demo Cafe",
      category: "restaurant_cafe",
      rating: 4.5,
      reviewCount: 100,
    });
  });

  it("clamps radius to 1-50000", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ places: [] }), { status: 200 }),
    );
    const provider = new GooglePlacesProvider({ apiKey: "k", fetchImpl: fetchMock });
    await provider.searchNearby({ lat: 0, lng: 0, radiusMeters: 999_999 });
    const init = fetchMock.mock.calls[0]![1]!;
    const body = JSON.parse(init.body as string) as {
      locationRestriction: { circle: { radius: number } };
    };
    expect(body.locationRestriction.circle.radius).toBe(50_000);
  });

  it("throws on non-2xx response", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response("rate limited", { status: 429 }),
    );
    const provider = new GooglePlacesProvider({ apiKey: "k", fetchImpl: fetchMock });
    await expect(
      provider.searchNearby({ lat: 0, lng: 0, radiusMeters: 1000 }),
    ).rejects.toThrow(/429/);
  });

  it("returns 0 results when API yields no places", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({}), { status: 200 }),
    );
    const provider = new GooglePlacesProvider({ apiKey: "k", fetchImpl: fetchMock });
    const out = await provider.searchNearby({ lat: 0, lng: 0, radiusMeters: 100 });
    expect(out).toEqual([]);
  });

  it("costUsdPerCall returns expected rates", () => {
    const provider = new GooglePlacesProvider({ apiKey: "k" });
    expect(provider.costUsdPerCall("nearby_search")).toBeCloseTo(0.004);
    expect(provider.costUsdPerCall("place_details")).toBeCloseTo(0.004);
  });
});
