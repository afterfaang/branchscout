// `request.db(fn)` decorator — auth context'inden gelen tenantId ile
// withTenant transaction sarmalayıcısı. Kullanım:
//
//   const branches = await request.db((tx) => tx.branch.findMany());
//
// Auth gerektirmeyen endpoint'ler (login/refresh) bunu kullanmaz; doğrudan
// `app.prisma` ile çalışır ve tenantId'yi explicit `where` filtresinde verir.

import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { withTenant, type TenantBoundClient } from "../infrastructure/db/tenantPrisma.js";

declare module "fastify" {
  interface FastifyRequest {
    db: <T>(fn: (tx: TenantBoundClient) => Promise<T>) => Promise<T>;
  }
}

async function dbPlugin(app: FastifyInstance) {
  app.decorateRequest("db", function (this: FastifyRequest) {
    // placeholder; replaced per-request below
    throw new Error("request.db called outside an auth'd request");
  });

  app.addHook("onRequest", async (request) => {
    request.db = async <T>(fn: (tx: TenantBoundClient) => Promise<T>): Promise<T> => {
      if (!request.auth) {
        throw new Error(
          "request.db requires an authenticated context (auth middleware must run first)",
        );
      }
      return withTenant(app.prisma, request.auth.tenantId, fn);
    };
  });
}

export default fp(dbPlugin, { name: "db", dependencies: ["prisma", "jwt"] });
