// API client — fetch wrapper with bearer token + JSON ergonomics.
// Tek noktada base URL, auth header ve hata normalizasyonu.

import { useAuthStore } from "../features/auth/authStore";

const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface ApiErrorBody {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  request_id?: string;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(message: string, status: number, body: ApiErrorBody | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface RequestOpts extends RequestInit {
  json?: unknown;
  auth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOpts = {},
): Promise<T> {
  const { json, auth = true, headers = {}, ...rest } = opts;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  if (json !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (!res.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // body parse failed; keep null
    }
    const detail = body?.detail ?? body?.title ?? res.statusText;
    throw new ApiError(detail, res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const apiUrl = API_URL;
