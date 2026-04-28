// Cache plugin — `app.cache` decorator.

import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { buildCache, type Cache } from "../infrastructure/cache/index.js";
import { config } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    cache: Cache;
  }
}

async function cachePlugin(app: FastifyInstance) {
  const cache = await buildCache({
    redisUrl: config.redisUrl,
    logger: (m) => app.log.info({ provider: "cache" }, m),
  });
  app.log.info({ provider: cache.name }, "cache initialised");
  app.decorate("cache", cache);
}

export default fp(cachePlugin, { name: "cache" });
