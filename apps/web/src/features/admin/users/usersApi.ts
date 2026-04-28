import { apiFetch } from "../../../lib/apiClient";

export type Role = "ADMIN" | "REGION_MANAGER" | "BRANCH_MANAGER" | "ANALYST";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  branchId: string | null;
  isActive: boolean;
  totpEnabled: boolean;
  createdAt: string;
}

export interface InvitationRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  branch: { id: string; code: string; name: string } | null;
  invitedBy: { id: string; email: string; name: string };
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export interface InviteInput {
  email: string;
  name: string;
  role: Role;
  branchId?: string | null;
}

export async function listUsers(): Promise<{ users: AdminUser[] }> {
  return apiFetch("/api/v1/admin/users");
}

export async function listInvitations(): Promise<{ invitations: InvitationRow[] }> {
  return apiFetch("/api/v1/admin/users/invitations");
}

export async function inviteUser(input: InviteInput): Promise<{ id: string; email: string; expiresAt: string }> {
  return apiFetch("/api/v1/admin/users/invite", { method: "POST", json: input });
}

export async function revokeInvitation(id: string): Promise<void> {
  return apiFetch(`/api/v1/admin/users/invitations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
