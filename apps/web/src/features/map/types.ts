// Frontend-side place types — paylaşılan, route response shape'iyle eşleşir.

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

export const ALL_CATEGORIES: PlaceCategory[] = [
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

export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  restaurant_cafe: "Restoran & Kafe",
  retail: "Perakende",
  manufacturing: "İmalat",
  wholesale: "Toptan",
  health: "Sağlık",
  education: "Eğitim",
  service: "Hizmet",
  automotive: "Otomotiv",
  construction: "İnşaat",
  other: "Diğer",
};

export const CATEGORY_COLOR: Record<PlaceCategory, string> = {
  restaurant_cafe: "#ef4444",
  retail: "#3b82f6",
  manufacturing: "#a855f7",
  wholesale: "#f59e0b",
  health: "#10b981",
  education: "#06b6d4",
  service: "#8b5cf6",
  automotive: "#64748b",
  construction: "#f97316",
  other: "#6b7280",
};

export interface PlaceSummary {
  googlePlaceId: string;
  name: string;
  formattedAddress: string | null;
  lat: number;
  lng: number;
  category: PlaceCategory;
  types: string[];
  rating: number | null;
  reviewCount: number | null;
}

export interface NearbySearchResponse {
  data: PlaceSummary[];
  meta: { source: "cache" | "api"; count: number; provider: string };
}
