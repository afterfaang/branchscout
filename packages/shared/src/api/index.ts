import { z } from "zod";

export const HealthResponse = z.object({
  status: z.literal("ok"),
  version: z.string(),
  uptime: z.number(),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

export const ApiError = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  request_id: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiError>;
