// GooglePlacesProvider — Places API (New) /v1/places:searchNearby implementasyonu.
//
// PRD § 7.4 (Veri Kaynağı Stratejisi):
//   - HER çağrıda X-Goog-FieldMask header'ı zorunlu — yalnız Essentials/Pro
//     alanları (id, displayName, location, types, primaryType, formatted-
//     Address, rating, userRatingCount). Enterprise SKU alanlarına Sprint
//     4'te detay endpoint'inde dokunulacak; Sprint 2 nearby search'te yok.
//   - Sonuçlar provider'ın dışında cache'lenir; bu sınıf cache yapmaz.
//
// Pricing (2026 spot fiyatlar — yaklaşık):
//   - Nearby Search (Essentials):  $4 / 1000 → $0.004 / call
//   - Place Details (Essentials): $4 / 1000 → $0.004 / call (Sprint 4)
// Sayılar `costUsdPerCall` ile cost-tracking middleware'e bildirilir.

import type {
  NearbySearchParams,
  PlaceCategory,
  PlaceSummary,
  PlacesProvider,
} from "./PlacesProvider.js";
import { mapPrimaryTypeToCategory } from "./PlacesProvider.js";

const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchNearby";

const NEARBY_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.types",
  "places.primaryType",
  "places.rating",
  "places.userRatingCount",
].join(",");

interface GoogleNearbyRequest {
  includedTypes?: string[];
  maxResultCount?: number;
  locationRestriction: {
    circle: {
      center: { latitude: number; longitude: number };
      radius: number;
    };
  };
  rankPreference?: "DISTANCE" | "POPULARITY";
}

interface GoogleNearbyResponse {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    types?: string[];
    primaryType?: string;
    rating?: number;
    userRatingCount?: number;
  }>;
}

export interface GooglePlacesProviderOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export class GooglePlacesProvider implements PlacesProvider {
  readonly name = "google_places";
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: GooglePlacesProviderOptions) {
    if (!opts.apiKey) throw new Error("GooglePlacesProvider: apiKey required");
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  costUsdPerCall(endpoint: "nearby_search" | "place_details"): number {
    return endpoint === "nearby_search" ? 0.004 : 0.004;
  }

  async searchNearby(params: NearbySearchParams): Promise<PlaceSummary[]> {
    const body: GoogleNearbyRequest = {
      // Google Places (New) caps Nearby Search at 20 results per call.
      maxResultCount: Math.min(Math.max(params.maxResults ?? 20, 1), 20),
      rankPreference: "DISTANCE",
      locationRestriction: {
        circle: {
          center: { latitude: params.lat, longitude: params.lng },
          radius: Math.min(Math.max(params.radiusMeters, 1), 50_000),
        },
      },
    };
    if (params.categories && params.categories.length > 0) {
      body.includedTypes = mapCategoriesToGoogleTypes(params.categories);
    }

    const res = await this.fetchImpl(PLACES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": NEARBY_FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Google Places searchNearby failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as GoogleNearbyResponse;
    if (!data.places) return [];
    return data.places
      .filter((p) => p.location?.latitude != null && p.location?.longitude != null)
      .map<PlaceSummary>((p) => ({
        googlePlaceId: p.id,
        name: p.displayName?.text ?? "(adı yok)",
        formattedAddress: p.formattedAddress ?? null,
        lat: p.location!.latitude!,
        lng: p.location!.longitude!,
        category: mapPrimaryTypeToCategory(p.primaryType ?? p.types?.[0]),
        types: p.types ?? [],
        rating: p.rating ?? null,
        reviewCount: p.userRatingCount ?? null,
      }));
  }
}

// Coarse category → Google primary type list. Sprint 2'de minimal mapping;
// PRD'deki "imalat" gibi kategoriler Google'ın taxonomy'sinde direkt yok,
// places.types içinde yakalanır (mapPrimaryTypeToCategory).
function mapCategoriesToGoogleTypes(categories: PlaceCategory[]): string[] {
  const out = new Set<string>();
  for (const c of categories) {
    switch (c) {
      case "restaurant_cafe":
        out.add("restaurant");
        out.add("cafe");
        out.add("bar");
        break;
      case "retail":
        out.add("store");
        out.add("supermarket");
        break;
      case "wholesale":
        out.add("store");
        break;
      case "manufacturing":
        // Google has no public "factory" type — fall back to a broad bucket.
        out.add("establishment");
        break;
      case "health":
        out.add("hospital");
        out.add("doctor");
        out.add("pharmacy");
        out.add("dental_clinic");
        break;
      case "education":
        out.add("school");
        out.add("primary_school");
        out.add("preschool");
        out.add("university");
        break;
      case "service":
        out.add("real_estate_agency");
        out.add("gym");
        break;
      case "automotive":
        out.add("car_dealer");
        out.add("car_repair");
        break;
      case "construction":
        out.add("general_contractor");
        break;
      case "other":
        out.add("establishment");
        break;
    }
  }
  return [...out];
}
