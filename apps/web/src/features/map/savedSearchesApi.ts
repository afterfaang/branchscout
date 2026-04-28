import { apiFetch } from "../../lib/apiClient";
import type { GeoJsonPolygon } from "./placesApi";
import type { PlaceCategory } from "./types";

/** Persisted search state — restored verbatim onto the map. */
export interface SavedQuery {
  center?: { lat: number; lng: number };
  radius?: number;
  polygon?: GeoJsonPolygon;
  categories?: PlaceCategory[];
  zoom?: number;
}

export interface SavedSearch {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  queryJson: SavedQuery;
  createdAt: string;
  updatedAt: string;
}

export async function listSavedSearches(): Promise<{ savedSearches: SavedSearch[] }> {
  return apiFetch("/api/v1/saved-searches");
}

export async function createSavedSearch(input: {
  name: string;
  queryJson: SavedQuery;
}): Promise<SavedSearch> {
  return apiFetch("/api/v1/saved-searches", { method: "POST", json: input });
}

export async function updateSavedSearch(
  id: string,
  patch: { name?: string; queryJson?: SavedQuery },
): Promise<SavedSearch> {
  return apiFetch(`/api/v1/saved-searches/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: patch,
  });
}

export async function deleteSavedSearch(id: string): Promise<void> {
  return apiFetch(`/api/v1/saved-searches/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
