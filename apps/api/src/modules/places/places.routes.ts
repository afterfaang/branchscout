// Places routes — auth'lı kullanıcılar için harita üstü arama endpoint'leri.

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  InvalidPolygonError,
  PolygonTooLargeError,
  searchInPolygon,
  searchNearby,
} from "./places.service.js";
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

  const PolygonSchema = z.object({
    polygon: z.unknown(),
    categories: z
      .array(z.enum(ALLOWED_CATEGORIES as [PlaceCategory, ...PlaceCategory[]]))
      .optional(),
    maxResults: z.number().int().min(1).max(500).optional(),
  });

  app.post(
    "/places/search/polygon",
    {
      schema: {
        description:
          "Bir GeoJSON poligonu içindeki firmaları getirir (cache'lenmiş Company tablosundan, ST_Contains ile). Polygon alanı 100 km² ile sınırlı.",
        tags: ["places"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = PolygonSchema.safeParse(request.body);
      if (!parsed.success) throw app.httpErrors.badRequest(parsed.error.message);
      const auth = request.auth!;

      try {
        const result = await searchInPolygon(
          { prisma: app.prisma, cache: app.cache, provider: app.places },
          {
            tenantId: auth.tenantId,
            userId: auth.userId,
            polygon: parsed.data.polygon,
            categories: parsed.data.categories,
            maxResults: parsed.data.maxResults,
          },
        );
        return reply.send({
          data: result.places,
          meta: {
            source: result.source,
            count: result.count,
            bbox: result.bbox,
            areaSqMeters: result.areaSqMeters,
          },
        });
      } catch (err) {
        if (err instanceof InvalidPolygonError) {
          throw app.httpErrors.badRequest(err.message);
        }
        if (err instanceof PolygonTooLargeError) {
          throw app.httpErrors.badRequest(err.message);
        }
        throw err;
      }
    },
  );
}
