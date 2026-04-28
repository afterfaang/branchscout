// Auth route handler'ları — Fastify ile zod validation ve OpenAPI doc.

import type { FastifyInstance } from "fastify";
import { config } from "../../config.js";
import {
  LoginRequest,
  MeResponse,
  RefreshRequest,
  TokenPair,
} from "./auth.schema.js";
import {
  InactiveUserError,
  InvalidCredentialsError,
  getCurrentUser,
  login,
  refresh,
} from "./auth.service.js";

export async function authRoutes(app: FastifyInstance) {
  const deps = {
    prisma: app.prisma,
    issueTokens: app.jwt.issueTokens,
    accessTtl: config.jwt.accessTtl,
  };

  app.post(
    "/login",
    {
      schema: {
        description: "Email + parola ile giriş.",
        tags: ["auth"],
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
              expiresIn: { type: "string" },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  tenantId: { type: "string" },
                  email: { type: "string" },
                  name: { type: "string" },
                  role: { type: "string" },
                  branchId: { type: ["string", "null"] },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = LoginRequest.safeParse(request.body);
      if (!parsed.success) {
        throw app.httpErrors.badRequest(parsed.error.message);
      }
      try {
        const result = await login(deps, parsed.data.email, parsed.data.password);
        return reply.send(result);
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          throw app.httpErrors.unauthorized("Geçersiz email veya parola");
        }
        if (err instanceof InactiveUserError) {
          throw app.httpErrors.forbidden("Hesap aktif değil");
        }
        throw err;
      }
    },
  );

  app.post(
    "/refresh",
    {
      schema: {
        description: "Refresh token ile yeni access token alma.",
        tags: ["auth"],
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: { refreshToken: { type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const parsed = RefreshRequest.safeParse(request.body);
      if (!parsed.success) {
        throw app.httpErrors.badRequest(parsed.error.message);
      }
      let payload;
      try {
        payload = app.jwt.verifyRefresh(parsed.data.refreshToken);
      } catch {
        throw app.httpErrors.unauthorized("Refresh token geçersiz");
      }
      try {
        const result = await refresh(deps, {
          sub: payload.sub,
          tenant: payload.tenant,
        });
        return reply.send(result);
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          throw app.httpErrors.unauthorized("Kullanıcı bulunamadı veya pasif");
        }
        throw err;
      }
    },
  );

  app.get(
    "/me",
    {
      schema: {
        description: "Mevcut kullanıcı bilgisi.",
        tags: ["auth"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const auth = request.auth!;
      const user = await getCurrentUser(app.prisma, auth.userId, auth.tenantId);
      if (!user) {
        throw app.httpErrors.notFound("Kullanıcı bulunamadı");
      }
      const validated = MeResponse.parse(user);
      return reply.send(validated);
    },
  );

  // OpenAPI uses these schema definitions implicitly via Zod imports
  void TokenPair;
}
