import { apiFetch } from "../../../lib/apiClient";

export interface ProviderRow {
  provider: string;
  calls: number;
  usd: number;
}
export interface EndpointRow {
  provider: string;
  endpoint: string;
  calls: number;
  usd: number;
}
export interface CostsSummary {
  totalUsd: number;
  byProvider: ProviderRow[];
  byEndpoint: EndpointRow[];
}

export async function fetchTodayCosts(): Promise<CostsSummary> {
  return apiFetch<CostsSummary>("/api/v1/admin/costs/today");
}
