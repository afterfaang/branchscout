export type Role = "ADMIN" | "REGION_MANAGER" | "BRANCH_MANAGER" | "ANALYST";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  branchId: string | null;
}

export interface Branch {
  id: string;
  tenantId: string;
  regionId: string | null;
  code: string;
  name: string;
  address: string;
}
