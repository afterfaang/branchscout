import { apiFetch } from "../../lib/apiClient";
import type {
  NearbySearchResponse,
  PlaceCategory,
  PlaceSummary,
} from "./types";

export interface NearbySearchParams {
  lat: number;
  lng: number;
  radius: number;
  categories?: PlaceCategory[];
  maxResults?: number;
}

export async function searchNearby(
  params: NearbySearchParams,
): Promise<NearbySearchResponse> {
  return apiFetch<NearbySearchResponse>("/api/v1/places/search/nearby", {
    method: "POST",
    json: params,
  });
}

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: [number, number][][];
}

export interface PolygonSearchResponse {
  data: PlaceSummary[];
  meta: {
    source: "cache" | "api";
    count: number;
    bbox: [number, number, number, number];
    areaSqMeters: number;
  };
}

export async function searchPolygon(params: {
  polygon: GeoJsonPolygon;
  categories?: PlaceCategory[];
  maxResults?: number;
}): Promise<PolygonSearchResponse> {
  return apiFetch<PolygonSearchResponse>("/api/v1/places/search/polygon", {
    method: "POST",
    json: params,
  });
}
