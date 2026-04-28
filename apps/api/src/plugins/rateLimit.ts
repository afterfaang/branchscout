// Rate limit plugin — @fastify/rate-limit, kullanıcı bazında 60/dk.
//
// Anahtar üretimi: auth'lı isteklerde tenant + user, anonim isteklerde IP.
// Bu, login/refresh gibi anonim endpoint'lere de basit bir koruma sağlar.
// Redis store sadece REDIS_URL set ise kullanılır; aksi halde memory store.

import fp from "fastify-plugin";
import rateLimit, { type RateLimitPluginOptions } from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../config.js";

async function rateLimitPlugin(app: FastifyInstance) {
  const opts: RateLimitPluginOptions = {
    max: 60,
    timeWindow: "1 minute",
    allowList: ["127.0.0.1"],
    keyGenerator(request: FastifyRequest) {
      if (request.auth) {
        return `u:${request.auth.tenantId}:${request.auth.userId}`;
      }
      return `ip:${request.ip}`;
    },
  };

  // Redis store wires lazily so the plugin still works against in-memory fallback.
  if (config.redisUrl) {
    try {
      const ioredisModule = await import("ioredis");
      const Ctor =
        (ioredisModule as unknown as { default?: new (url: string) => unknown }).default ??
        (ioredisModule as unknown as new (url: string) => unknown);
      const client = new Ctor(config.redisUrl);
      // @fastify/rate-limit accepts an ioredis client as `redis`.
      (opts as RateLimitPluginOptions & { redis?: unknown }).redis = client;
    } catch (err) {
      app.log.warn(
        { err: (err as Error).message },
        "rate-limit: Redis client failed to initialise; using in-memory store",
      );
    }
  }

  await app.register(rateLimit, opts);
}

export default fp(rateLimitPlugin, { name: "rate-limit" });
