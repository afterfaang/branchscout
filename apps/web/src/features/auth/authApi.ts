// Auth feature API çağrıları — tek noktadan endpoint sözleşmesi.

import { apiFetch } from "../../lib/apiClient";
import type { AuthUser } from "./authStore";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: AuthUser;
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/v1/auth/login", {
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
