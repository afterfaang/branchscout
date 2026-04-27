import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(16).default("dev-secret-please-change-in-production-xx"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = schema.parse(process.env);

export const config = {
  env: parsed.NODE_ENV,
  port: parsed.PORT,
  logLevel: parsed.LOG_LEVEL,
  databaseUrl: parsed.DATABASE_URL,
  redisUrl: parsed.REDIS_URL,
  jwt: {
    secret: parsed.JWT_SECRET,
    accessTtl: parsed.JWT_ACCESS_TTL,
    refreshTtl: parsed.JWT_REFRESH_TTL,
  },
  corsOrigins: parsed.CORS_ORIGIN.split(",").map((s) => s.trim()),
  isProd: parsed.NODE_ENV === "production",
} as const;
