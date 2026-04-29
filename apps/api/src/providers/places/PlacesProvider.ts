// PlacesProvider — coğrafi firma keşif sağlayıcısı arayüzü.
// (ARCHITECTURE.md § 6, ADR-005). Sprint 2'de yalnız `searchNearby`
// kullanılıyor; Sprint 3 polygon, Sprint 4 detay endpoint'leri eklenir.
//
// Implementasyonlar:
//   - GooglePlacesProvider — Places API (New) /v1/places:searchNearby
//   - InMemoryPlacesProvider — test/dev seed datası
//
// Cost: provider HER çağrı başına bir cost event yayar (provider üzerine
// inşa edilen middleware tarafından), gerçek $/USD fiyatlama Google'ın
// pricing tablosundan alınır.

export type PlaceCategory =
  | "restaurant_cafe"
  | "retail"
  | "manufacturing"
  | "wholesale"
  | "health"
  | "education"
  | "service"
  | "automotive"
  | "construction"
  | "other";

export const ALLOWED_CATEGORIES: PlaceCategory[] = [
  "restaurant_cafe",
  "retail",
  "manufacturing",
  "wholesale",
  "health",
  "education",
  "service",
  "automotive",
  "construction",
  "other",
];

/** Maps Google Place primary types to our coarse category buckets. */
export function mapPrimaryTypeToCategory(primaryType: string | null | undefined): PlaceCategory {
  if (!primaryType) return "other";
  const t = primaryType.toLowerCase();
  if (t.includes("restaurant") || t.includes("cafe") || t.includes("bar")) return "restaurant_cafe";
  if (t.includes("store") || t.includes("shop") || t.includes("market")) return "retail";
  if (t.includes("factory") || t.includes("manufactur")) return "manufacturing";
  if (t.includes("wholesale")) return "wholesale";
  if (t.includes("hospital") || t.includes("doctor") || t.includes("pharmacy") || t.includes("dental"))
    return "health";
  if (t.includes("school") || t.includes("university") || t.includes("education"))
    return "education";
  if (t.includes("car_") || t.includes("car_repair") || t.includes("automotive"))
    return "automotive";
  if (t.includes("construction")) return "construction";
  if (t.includes("service")) return "service";
  return "other";
}

export interface NearbySearchParams {
  lat: number;
  lng: number;
  radiusMeters: number; // 100-5000
  /** Optional category filter; if provided, only these categories pass through. */
  categories?: PlaceCategory[];
  /** Cap on number of results returned by the provider (default 50). */
  maxResults?: number;
}

export interface PlaceSummary {
  /** Stable Google place_id — may be persisted indefinitely (ToS). */
  googlePlaceId: string;
  name: string;
  formattedAddress: string | null;
  lat: number;
  lng: number;
  /** Our coarse category. */
  category: PlaceCategory;
  /** All raw Google types for the place. */
  types: string[];
  rating: number | null;
  reviewCount: number | null;
}

export interface PlacePhoto {
  /** Stable identifier — Google's photo resource name (e.g. "places/X/photos/Y"). */
  reference: string;
  widthPx: number | null;
  heightPx: number | null;
  /** Optional pre-resolved URL when the provider returns one (InMemory). */
  url?: string | null;
  authorAttributions?: { displayName: string; uri?: string | null }[];
}

export interface OpeningHoursPeriod {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
}

export interface OpeningHours {
  /** Localized weekday descriptors, e.g. ["Pazartesi: 09:00 – 18:00", ...]. */
  weekdayDescriptions: string[];
  periods: OpeningHoursPeriod[];
  /** True only when Google reports openNow at fetch time. */
  openNow: boolean | null;
}

export interface PlaceDetail extends PlaceSummary {
  phone: string | null;
  websiteUri: string | null;
  hours: OpeningHours | null;
  photos: PlacePhoto[];
}

export interface PlacesProvider {
  readonly name: string;

  /** Approximate USD cost the caller should attribute to this call. */
  costUsdPerCall(endpoint: "nearby_search" | "place_details"): number;

  searchNearby(params: NearbySearchParams): Promise<PlaceSummary[]>;

  /** Full Place Details fetch (Sprint 4). */
  getDetails(placeId: string): Promise<PlaceDetail | null>;

  /** Resolves a Google photo `reference` to a short-lived signed URL. */
  resolvePhotoUrl(reference: string, maxWidthPx: number): Promise<string | null>;
}
