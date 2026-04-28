// Auth modülü Zod şemaları — request/response validation + OpenAPI gen için.

import { z } from "zod";

export const LoginRequest = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const RefreshRequest = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshRequest = z.infer<typeof RefreshRequest>;

export const TokenPair = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.string(),
});
export type TokenPair = z.infer<typeof TokenPair>;

export const MeResponse = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(["ADMIN", "REGION_MANAGER", "BRANCH_MANAGER", "ANALYST"]),
  branchId: z.string().nullable(),
});
export type MeResponse = z.infer<typeof MeResponse>;
