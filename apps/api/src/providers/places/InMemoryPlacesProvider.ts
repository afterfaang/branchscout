// InMemoryPlacesProvider — dev/test fallback. Belleğe seed edilmiş bir
// fake firma listesini Haversine mesafe filtresiyle döndürür. Frontend ve
// backend testleri Google API'ye dokunmadan tüm akışı doğrulayabilir.

import type {
  NearbySearchParams,
  PlaceCategory,
  PlaceDetail,
  PlaceSummary,
  PlacesProvider,
} from "./PlacesProvider.js";

export interface SeedPlace {
  googlePlaceId: string;
  name: string;
  formattedAddress?: string | null;
  lat: number;
  lng: number;
  category: PlaceCategory;
  types?: string[];
  rating?: number | null;
  reviewCount?: number | null;
}

export class InMemoryPlacesProvider implements PlacesProvider {
  readonly name = "in_memory_places";
  private readonly seed: SeedPlace[];

  constructor(seed: SeedPlace[] = DEFAULT_KADIKOY_SEED) {
    this.seed = seed;
  }

  costUsdPerCall(_endpoint: "nearby_search" | "place_details"): number {
    return 0; // free in dev
  }

  async searchNearby(params: NearbySearchParams): Promise<PlaceSummary[]> {
    const max = params.maxResults ?? 50;
    const allowed = params.categories ? new Set(params.categories) : null;
    const matches: { place: SeedPlace; distance: number }[] = [];
    for (const place of this.seed) {
      if (allowed && !allowed.has(place.category)) continue;
      const distance = haversineMeters(params.lat, params.lng, place.lat, place.lng);
      if (distance <= params.radiusMeters) {
        matches.push({ place, distance });
      }
    }
    matches.sort((a, b) => a.distance - b.distance);
    return matches.slice(0, max).map(({ place }) => ({
      googlePlaceId: place.googlePlaceId,
      name: place.name,
      formattedAddress: place.formattedAddress ?? null,
      lat: place.lat,
      lng: place.lng,
      category: place.category,
      types: place.types ?? [],
      rating: place.rating ?? null,
      reviewCount: place.reviewCount ?? null,
    }));
  }

  async getDetails(placeId: string): Promise<PlaceDetail | null> {
    const place = this.seed.find((p) => p.googlePlaceId === placeId);
    if (!place) return null;
    return {
      googlePlaceId: place.googlePlaceId,
      name: place.name,
      formattedAddress: place.formattedAddress ?? null,
      lat: place.lat,
      lng: place.lng,
      category: place.category,
      types: place.types ?? [],
      rating: place.rating ?? null,
      reviewCount: place.reviewCount ?? null,
      phone: null,
      websiteUri: null,
      hours: null,
      photos: [],
    };
  }

  async resolvePhotoUrl(_reference: string, _maxWidthPx: number): Promise<string | null> {
    return null;
  }

  /** Test helpers. */
  setSeed(seed: SeedPlace[]): void {
    this.seed.length = 0;
    this.seed.push(...seed);
  }
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // m
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 18 fake firma — Kadıköy + Bağdat Caddesi etrafına serpiştirilmiş.
// Demo seed'imizdeki Kadıköy şubesi (~40.99, 29.03) merkez alındı.
const DEFAULT_KADIKOY_SEED: SeedPlace[] = [
  {
    googlePlaceId: "demo-bagdat-cafe",
    name: "Bağdat Cafe",
    formattedAddress: "Bağdat Cd. No:120, Kadıköy",
    lat: 40.97,
    lng: 29.03,
    category: "restaurant_cafe",
    types: ["cafe", "food"],
    rating: 4.5,
    reviewCount: 312,
  },
  {
    googlePlaceId: "demo-anadolu-eczane",
    name: "Anadolu Eczanesi",
    formattedAddress: "Bahariye Cd. No:25, Kadıköy",
    lat: 40.99,
    lng: 29.027,
    category: "health",
    types: ["pharmacy"],
    rating: 4.8,
    reviewCount: 154,
  },
  {
    googlePlaceId: "demo-moda-mobilya",
    name: "Moda Mobilya",
    formattedAddress: "Moda Cd. No:55, Kadıköy",
    lat: 40.984,
    lng: 29.025,
    category: "retail",
    types: ["furniture_store", "store"],
    rating: 4.2,
    reviewCount: 89,
  },
  {
    googlePlaceId: "demo-suadiye-restaurant",
    name: "Suadiye Restoran",
    formattedAddress: "Bağdat Cd. No:435, Suadiye",
    lat: 40.957,
    lng: 29.085,
    category: "restaurant_cafe",
    types: ["restaurant"],
    rating: 4.6,
    reviewCount: 421,
  },
  {
    googlePlaceId: "demo-kalamis-spor",
    name: "Kalamış Spor Kulübü",
    formattedAddress: "Kalamış Cd. No:12",
    lat: 40.972,
    lng: 29.043,
    category: "service",
    types: ["gym"],
    rating: 4.4,
    reviewCount: 67,
  },
  {
    googlePlaceId: "demo-fenerbahce-anaokulu",
    name: "Fenerbahçe Anaokulu",
    formattedAddress: "Fener Cd. No:8",
    lat: 40.97,
    lng: 29.039,
    category: "education",
    types: ["school", "preschool"],
    rating: 4.9,
    reviewCount: 41,
  },
  {
    googlePlaceId: "demo-caddebostan-emlak",
    name: "Caddebostan Emlak",
    formattedAddress: "Bağdat Cd. No:280, Caddebostan",
    lat: 40.964,
    lng: 29.066,
    category: "service",
    types: ["real_estate_agency"],
    rating: 4.0,
    reviewCount: 23,
  },
  {
    googlePlaceId: "demo-erenkoy-petshop",
    name: "Erenköy Pet Shop",
    formattedAddress: "İstiklal Sk. No:7, Erenköy",
    lat: 40.962,
    lng: 29.078,
    category: "retail",
    types: ["pet_store"],
    rating: 4.7,
    reviewCount: 112,
  },
  {
    googlePlaceId: "demo-kosuyolu-hastane",
    name: "Koşuyolu Sağlık Merkezi",
    formattedAddress: "Koşuyolu Cd.",
    lat: 41.001,
    lng: 29.039,
    category: "health",
    types: ["hospital"],
    rating: 4.3,
    reviewCount: 514,
  },
  {
    googlePlaceId: "demo-acibadem-imalat",
    name: "Acıbadem Tekstil İmalat",
    formattedAddress: "Çamlıca Cd.",
    lat: 41.01,
    lng: 29.045,
    category: "manufacturing",
    types: ["factory"],
    rating: 4.1,
    reviewCount: 18,
  },
  {
    googlePlaceId: "demo-hasanpasa-toptan",
    name: "Hasanpaşa Toptan Gıda",
    formattedAddress: "Tibbiye Cd.",
    lat: 40.998,
    lng: 29.038,
    category: "wholesale",
    types: ["wholesaler"],
    rating: 3.9,
    reviewCount: 7,
  },
  {
    googlePlaceId: "demo-feneryolu-otomotiv",
    name: "Feneryolu Otomotiv",
    formattedAddress: "Bağdat Cd. No:200",
    lat: 40.973,
    lng: 29.05,
    category: "automotive",
    types: ["car_repair"],
    rating: 4.5,
    reviewCount: 88,
  },
  {
    googlePlaceId: "demo-kadikoy-insaat",
    name: "Kadıköy İnşaat A.Ş.",
    formattedAddress: "Söğütlüçeşme Cd.",
    lat: 40.991,
    lng: 29.026,
    category: "construction",
    types: ["general_contractor"],
    rating: 4.0,
    reviewCount: 12,
  },
  {
    googlePlaceId: "demo-ozgurluk-cafe",
    name: "Özgürlük Kahve",
    formattedAddress: "Moda Cd. No:80",
    lat: 40.982,
    lng: 29.022,
    category: "restaurant_cafe",
    types: ["cafe"],
    rating: 4.6,
    reviewCount: 233,
  },
  {
    googlePlaceId: "demo-bostanci-market",
    name: "Bostancı Market",
    formattedAddress: "Bağdat Cd. No:480",
    lat: 40.948,
    lng: 29.094,
    category: "retail",
    types: ["supermarket", "store"],
    rating: 4.1,
    reviewCount: 198,
  },
  {
    googlePlaceId: "demo-gozlukcu-istanbul",
    name: "Optisyen İstanbul",
    formattedAddress: "Mühürdar Cd. No:10",
    lat: 40.989,
    lng: 29.029,
    category: "retail",
    types: ["store", "optometrist"],
    rating: 4.4,
    reviewCount: 45,
  },
  {
    googlePlaceId: "demo-kadikoy-anaokulu-2",
    name: "Çocuk Atölyesi",
    formattedAddress: "Mühürdar Cd.",
    lat: 40.987,
    lng: 29.03,
    category: "education",
    types: ["preschool"],
    rating: 4.8,
    reviewCount: 30,
  },
  {
    googlePlaceId: "demo-cevizli-fabrika",
    name: "Cevizli Üretim",
    formattedAddress: "Cevizli Mh.",
    lat: 40.93,
    lng: 29.13,
    category: "manufacturing",
    types: ["factory"],
    rating: 3.8,
    reviewCount: 4,
  },
];
