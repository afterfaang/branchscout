// Tenant context plugin — auth'lı isteklerde tenant_id'yi log + DB'ye yansıtır.
//
// Mevcut yaklaşım (Sprint 1): app.current_tenant'i Postgres seviyesinde set
// etmek için tüm tenant-bazlı sorguları transaction içinde sarmamız gerekirdi.
// Şimdilik defense-in-depth olarak sadece request.auth ve log seviyesinde
// tenant izlenir; uygulama katmanı `where: { tenantId }` filtrelerini explicit
// kullanır. Sprint 2'de Prisma client extension ile transaction-bazlı
// `SET LOCAL app.current_tenant` aktive edilecek (RLS migration zaten hazır).

import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

async function tenantContextPlugin(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    // Pino child logger'a tenant + user bilgilerini ekle (varsa).
    if (request.auth) {
      request.log = request.log.child({
        tenant_id: request.auth.tenantId,
        user_id: request.auth.userId,
      });
    }
  });
}

export default fp(tenantContextPlugin, {
  name: "tenant-context",
  dependencies: ["jwt"],
});
