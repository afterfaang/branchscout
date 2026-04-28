// Branch admin route'ları — ADMIN-only CRUD.

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  BranchError,
  createBranch,
  listBranches,
  softDeleteBranch,
  updateBranch,
} from "./branch.service.js";

const BranchInputSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(400),
  regionId: z.string().nullable().optional(),
  catchmentPolygon: z.unknown().optional(),
});
const BranchPatchSchema = BranchInputSchema.partial();

export async function branchRoutes(app: FastifyInstance) {
  app.get(
    "/admin/branches",
    {
      schema: {
        description: "Şubeleri listele (ADMIN).",
        tags: ["admin", "branches"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireRole("ADMIN"),
    },
    async (request, reply) => {
      const branches = await request.db((tx) => listBranches(tx));
      return reply.send({ branches });
    },
  );

  app.post(
    "/admin/branches",
    {
      schema: {
        description: "Şube oluştur (ADMIN).",
        tags: ["admin", "branches"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireRole("ADMIN"),
    },
    async (request, reply) => {
      const parsed = BranchInputSchema.safeParse(request.body);
      if (!parsed.success) throw app.httpErrors.badRequest(parsed.error.message);
      const auth = request.auth!;
      try {
        const branch = await request.db((tx) =>
          createBranch(tx, auth.tenantId, {
            code: parsed.data.code,
            name: parsed.data.name,
            address: parsed.data.address,
            regionId: parsed.data.regionId ?? null,
            catchmentPolygon:
              (parsed.data.catchmentPolygon as
                | import("@prisma/client").Prisma.InputJsonValue
                | null
                | undefined) ?? null,
          }),
        );
        return reply.code(201).send({ branch });
      } catch (err) {
        if (err instanceof BranchError) {
          throw err.code === "NOT_FOUND"
            ? app.httpErrors.notFound(err.message)
            : app.httpErrors.badRequest(err.message);
        }
        throw err;
      }
    },
  );

  app.patch(
    "/admin/branches/:id",
    {
      schema: {
        description: "Şube güncelle (ADMIN).",
        tags: ["admin", "branches"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireRole("ADMIN"),
    },
    async (request, reply) => {
      const parsed = BranchPatchSchema.safeParse(request.body);
      if (!parsed.success) throw app.httpErrors.badRequest(parsed.error.message);
      const auth = request.auth!;
      const { id } = request.params as { id: string };
      try {
        const branch = await request.db((tx) =>
          updateBranch(tx, auth.tenantId, id, {
            code: parsed.data.code,
            name: parsed.data.name,
            address: parsed.data.address,
            regionId: parsed.data.regionId,
            catchmentPolygon:
              parsed.data.catchmentPolygon as
                | import("@prisma/client").Prisma.InputJsonValue
                | null
                | undefined,
          }),
        );
        return reply.send({ branch });
      } catch (err) {
        if (err instanceof BranchError) {
          throw err.code === "NOT_FOUND"
            ? app.httpErrors.notFound(err.message)
            : app.httpErrors.badRequest(err.message);
        }
        throw err;
      }
    },
  );

  app.delete(
    "/admin/branches/:id",
    {
      schema: {
        description: "Şubeyi soft-delete et (ADMIN).",
        tags: ["admin", "branches"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireRole("ADMIN"),
    },
    async (request, reply) => {
      const auth = request.auth!;
      const { id } = request.params as { id: string };
      try {
        await request.db((tx) => softDeleteBranch(tx, auth.tenantId, id));
        return reply.code(204).send();
      } catch (err) {
        if (err instanceof BranchError) {
          throw err.code === "NOT_FOUND"
            ? app.httpErrors.notFound(err.message)
            : app.httpErrors.badRequest(err.message);
        }
        throw err;
      }
    },
  );
}
