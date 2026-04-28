// Admin user listesi.

import type { FastifyInstance } from "fastify";

export async function adminUserRoutes(app: FastifyInstance) {
  app.get(
    "/admin/users",
    {
      schema: {
        description: "Tenant kullanıcılarını listele (ADMIN).",
        tags: ["admin", "users"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireRole("ADMIN"),
    },
    async (request, reply) => {
      const users = await request.db((tx) =>
        tx.user.findMany({
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            branchId: true,
            isActive: true,
            totpEnabled: true,
            createdAt: true,
          },
        }),
      );
      return reply.send({ users });
    },
  );
}
