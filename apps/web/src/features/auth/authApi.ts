// Auth feature API çağrıları — tek noktadan endpoint sözleşmesi.

import { apiFetch } from "../../lib/apiClient";
import type { AuthUser } from "./authStore";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginOk {
  status: "ok";
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: AuthUser;
}
export interface LoginMfaRequired {
  status: "mfa_required";
  mfaToken: string;
  expiresInSeconds: number;
}
export type LoginResponse = LoginOk | LoginMfaRequired;

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  // The 202 mfa_required response is also "ok" status — apiFetch will return JSON.
  return apiFetch<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    json: payload,
    auth: false,
  });
}

export async function completeMfaLogin(payload: {
  mfaToken: string;
  code: string;
}): Promise<LoginOk> {
  return apiFetch<LoginOk>("/api/v1/auth/login/totp", {
    method: "POST",
    json: payload,
    auth: false,
  });
}

export async function fetchMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/v1/auth/me");
}

export async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: string }> {
  return apiFetch("/api/v1/auth/refresh", {
    method: "POST",
    json: { refreshToken },
    auth: false,
  });
}

// ----- TOTP setup / verify -----

export interface TotpSetupResponse {
  otpauthUri: string;
  qrDataUrl: string;
  recoveryCodes: string[];
}
export async function setupTotp(): Promise<TotpSetupResponse> {
  return apiFetch<TotpSetupResponse>("/api/v1/auth/setup-totp", { method: "POST" });
}
export async function verifyTotp(code: string): Promise<{ totpEnabled: boolean }> {
  return apiFetch("/api/v1/auth/verify-totp", { method: "POST", json: { code } });
}

// ----- Invitations -----

export interface InvitationDetail {
  email: string;
  name: string;
  role: string;
  branch: { id: string; code: string; name: string } | null;
  expiresAt: string;
}
export async function fetchInvitation(token: string): Promise<InvitationDetail> {
  return apiFetch<InvitationDetail>(`/api/v1/invitations/${encodeURIComponent(token)}`, {
    auth: false,
  });
}

export interface AcceptInvitationResponse {
  status: "ok";
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: AuthUser;
}
export async function acceptInvitation(payload: {
  token: string;
  password: string;
}): Promise<AcceptInvitationResponse> {
  return apiFetch<AcceptInvitationResponse>("/api/v1/invitations/accept", {
    method: "POST",
    json: payload,
    auth: false,
  });
}
