import { apiFetch } from "../../lib/apiClient";
import type {
  NearbySearchResponse,
  PlaceCategory,
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
