// Saved searches — kullanıcı bazında kayıtlı arama CRUD'u.
// Her kayıt tenant + user'a bağlı; RLS politikası tenant_id'yi enforce eder.
// queryJson tarafından korunan kullanıcı tercihinin başkalarınca
// görüntülenmesi gerekmediğinden, list endpoint'i sadece request.auth.userId'ye
// ait kayıtları döndürür (servis katmanı seviyesinde ek filtreleme).

import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  queryJson: z.record(z.string(), z.unknown()),
});
const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  queryJson: z.record(z.string(), z.unknown()).optional(),
});

export async function savedSearchRoutes(app: FastifyInstance) {
  app.get(
    "/saved-searches",
    {
      schema: {
        description: "Aktif kullanıcının kayıtlı aramaları (yeni → eski).",
        tags: ["saved-searches"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const auth = request.auth!;
      const list = await request.db((tx) =>
        tx.savedSearch.findMany({
          where: { userId: auth.userId },
          orderBy: { createdAt: "desc" },
        }),
      );
      return reply.send({ savedSearches: list });
    },
  );

  app.post(
    "/saved-searches",
    {
      schema: {
        description: "Yeni kayıtlı arama oluştur.",
        tags: ["saved-searches"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = CreateSchema.safeParse(request.body);
      if (!parsed.success) throw app.httpErrors.badRequest(parsed.error.message);
      const auth = request.auth!;
      const created = await request.db((tx) =>
        tx.savedSearch.create({
          data: {
            tenantId: auth.tenantId,
            userId: auth.userId,
            name: parsed.data.name,
            queryJson: parsed.data.queryJson as Prisma.InputJsonValue,
          },
        }),
      );
      return reply.code(201).send(created);
    },
  );

  app.patch(
    "/saved-searches/:id",
    {
      schema: {
        description: "Kayıtlı aramayı güncelle (ad ve/veya query).",
        tags: ["saved-searches"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = UpdateSchema.safeParse(request.body);
      if (!parsed.success) throw app.httpErrors.badRequest(parsed.error.message);
      const auth = request.auth!;
      const { id } = request.params as { id: string };

      const updated = await request.db(async (tx) => {
        const existing = await tx.savedSearch.findFirst({
          where: { id, userId: auth.userId },
        });
        if (!existing) return null;
        return tx.savedSearch.update({
          where: { id },
          data: {
            name: parsed.data.name,
            queryJson:
              parsed.data.queryJson !== undefined
                ? (parsed.data.queryJson as Prisma.InputJsonValue)
                : undefined,
          },
        });
      });

      if (!updated) throw app.httpErrors.notFound("Kayıtlı arama bulunamadı");
      return reply.send(updated);
    },
  );

  app.delete(
    "/saved-searches/:id",
    {
      schema: {
        description: "Kayıtlı aramayı sil.",
        tags: ["saved-searches"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const auth = request.auth!;
      const { id } = request.params as { id: string };

      const deleted = await request.db(async (tx) => {
        const existing = await tx.savedSearch.findFirst({
          where: { id, userId: auth.userId },
        });
        if (!existing) return false;
        await tx.savedSearch.delete({ where: { id } });
        return true;
      });

      if (!deleted) throw app.httpErrors.notFound("Kayıtlı arama bulunamadı");
      return reply.code(204).send();
    },
  );
}
