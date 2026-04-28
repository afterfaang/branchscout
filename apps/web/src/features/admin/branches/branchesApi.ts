import { apiFetch } from "../../../lib/apiClient";

export interface Branch {
  id: string;
  tenantId: string;
  regionId: string | null;
  code: string;
  name: string;
  address: string;
  catchmentPolygon: unknown;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchInput {
  code: string;
  name: string;
  address: string;
  regionId?: string | null;
  catchmentPolygon?: unknown;
}

export async function listBranches(): Promise<{ branches: Branch[] }> {
  return apiFetch("/api/v1/admin/branches");
}

export async function createBranch(input: BranchInput): Promise<{ branch: Branch }> {
  return apiFetch("/api/v1/admin/branches", { method: "POST", json: input });
}

export async function updateBranch(
  id: string,
  patch: Partial<BranchInput>,
): Promise<{ branch: Branch }> {
  return apiFetch(`/api/v1/admin/branches/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: patch,
  });
}

export async function deleteBranch(id: string): Promise<void> {
  return apiFetch(`/api/v1/admin/branches/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
