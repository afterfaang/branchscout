import { apiFetch } from "../../lib/apiClient";
import type { PlaceDetailResponse } from "./types";

export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetailResponse> {
  return apiFetch<PlaceDetailResponse>(
    `/api/v1/places/${encodeURIComponent(placeId)}`,
  );
}

export async function refreshPlaceDetails(placeId: string): Promise<PlaceDetailResponse> {
  return apiFetch<PlaceDetailResponse>(
    `/api/v1/places/${encodeURIComponent(placeId)}/refresh`,
    { method: "POST" },
  );
}

export async function recordWebsiteClick(
  placeId: string,
  url: string,
): Promise<{ recorded: boolean }> {
  return apiFetch(`/api/v1/places/${encodeURIComponent(placeId)}/website-click`, {
    method: "POST",
    json: { url },
  });
}
