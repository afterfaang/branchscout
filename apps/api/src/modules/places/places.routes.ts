// Places routes — auth'lı kullanıcılar için harita üstü arama endpoint'leri.

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { searchNearby } from "./places.service.js";
import { ALLOWED_CATEGORIES, type PlaceCategory } from "../../providers/places/index.js";

const NearbySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().int().min(100).max(5000),
  categories: z.array(z.enum(ALLOWED_CATEGORIES as [PlaceCategory, ...PlaceCategory[]])).optional(),
  maxResults: z.number().int().min(1).max(50).optional(),
});

export async function placesRoutes(app: FastifyInstance) {
  app.post(
    "/places/search/nearby",
    {
      schema: {
        description:
          "Belirli bir koordinatın etrafında firma araması. Sonuçlar 7 gün cache'lenir.",
        tags: ["places"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = NearbySchema.safeParse(request.body);
      if (!parsed.success) throw app.httpErrors.badRequest(parsed.error.message);
      const auth = request.auth!;

      const result = await searchNearby(
        { prisma: app.prisma, cache: app.cache, provider: app.places },
        {
          tenantId: auth.tenantId,
          userId: auth.userId,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          radiusMeters: parsed.data.radius,
          categories: parsed.data.categories,
          maxResults: parsed.data.maxResults,
        },
      );

      return reply.send({
        data: result.places,
        meta: { source: result.source, count: result.count, provider: app.places.name },
      });
    },
  );
}
