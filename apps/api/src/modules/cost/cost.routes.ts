// Cost dashboard route — admin için bugünkü API maliyeti özeti.

import type { FastifyInstance } from "fastify";
import { getTodayCosts } from "./cost.service.js";

export async function costRoutes(app: FastifyInstance) {
  app.get(
    "/admin/costs/today",
    {
      schema: {
        description:
          "Tenant'ın bugünkü API maliyetinin sağlayıcı + endpoint kırılımı (ADMIN).",
        tags: ["admin", "costs"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireRole("ADMIN"),
    },
    async (request, reply) => {
      const auth = request.auth!;
      const summary = await getTodayCosts(app.prisma, auth.tenantId);
      return reply.send(summary);
    },
  );
}
