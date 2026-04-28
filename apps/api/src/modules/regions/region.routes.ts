// Bölge route'ları — bölge müdürü kendine bağlı bölgeleri ve şubeleri görür.
//
// Mevcut model basit: Region bir tenant altında; Branch tek bir Region'a bağlı.
// "Bana bağlı bölge" iki yoldan tespit edilir:
//   1. ADMIN ise tüm bölgeler görünür.
//   2. Diğer roller için kullanıcının branchId'si üzerinden region türetilir
//      (Sprint 2'de explicit user-region eşleşmesi modeline geçilebilir).

import type { FastifyInstance } from "fastify";

export async function regionRoutes(app: FastifyInstance) {
  app.get(
    "/regions/my",
    {
      schema: {
        description:
          "Aktif kullanıcının erişebildiği bölgeleri (ve şubeleri) döndürür.",
        tags: ["regions"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const auth = request.auth!;
      const data = await request.db(async (tx) => {
        if (auth.role === "ADMIN") {
          // tüm bölgeler + şubeleri
          return tx.region.findMany({
            include: {
              branches: {
                where: { deletedAt: null },
                orderBy: { code: "asc" },
                select: { id: true, code: true, name: true, address: true },
              },
            },
            orderBy: { name: "asc" },
          });
        }

        if (auth.role === "REGION_MANAGER" || auth.role === "BRANCH_MANAGER") {
          const me = await tx.user.findFirst({
            where: { id: auth.userId },
            select: { branchId: true },
          });
          if (!me?.branchId) return [];
          const branch = await tx.branch.findFirst({
            where: { id: me.branchId },
            select: { regionId: true },
          });
          if (!branch?.regionId) return [];
          return tx.region.findMany({
            where: { id: branch.regionId },
            include: {
              branches: {
                where: { deletedAt: null },
                orderBy: { code: "asc" },
                select: { id: true, code: true, name: true, address: true },
              },
            },
          });
        }

        // Other roles (e.g. ANALYST) — empty for now.
        return [];
      });
      return reply.send({ regions: data });
    },
  );
}
