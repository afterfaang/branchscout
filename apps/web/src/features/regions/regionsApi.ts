import { apiFetch } from "../../lib/apiClient";

export interface RegionWithBranches {
  id: string;
  name: string;
  branches: { id: string; code: string; name: string; address: string }[];
}

export async function fetchMyRegions(): Promise<{ regions: RegionWithBranches[] }> {
  return apiFetch("/api/v1/regions/my");
}
