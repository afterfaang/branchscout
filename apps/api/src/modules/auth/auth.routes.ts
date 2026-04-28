// Auth route handler'ları — Fastify ile zod validation ve OpenAPI doc.

import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { z } from "zod";
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
  TotpInvalidError,
  completeMfaLogin,
  getCurrentUser,
  login,
  refresh,
} from "./auth.service.js";
import {
  generateRecoveryCodes,
  generateTotpSetup,
  verifyRecoveryCode,
  verifyTotp,
} from "./totp.service.js";
import {
  MFA_TOKEN_TTL_SECONDS,
  issueMfaToken,
  verifyMfaToken,
} from "./mfa.token.js";
import { withAuthLookup } from "../../infrastructure/db/tenantPrisma.js";

const TotpCodeSchema = z.object({ code: z.string().regex(/^\d{6}$/, "6 haneli kod") });
const MfaLoginSchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "6 haneli kod"),
});
const RecoverSchema = z.object({
  email: z.string().email(),
  recoveryCode: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  const deps = {
    prisma: app.prisma,
    issueTokens: app.jwt.issueTokens,
    accessTtl: config.jwt.accessTtl,
    issueMfaToken,
    mfaTokenTtlSeconds: MFA_TOKEN_TTL_SECONDS,
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
              status: { type: "string" },
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
          202: {
            type: "object",
            properties: {
              status: { type: "string" },
              mfaToken: { type: "string" },
              expiresInSeconds: { type: "number" },
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
        if (result.status === "mfa_required") {
          // 202 Accepted — credentials are valid, but TOTP step is required.
          reply.code(202);
          return {
            status: "mfa_required",
            mfaToken: result.mfaToken,
            expiresInSeconds: result.expiresInSeconds,
          };
        }
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
    "/login/totp",
    {
      schema: {
        description: "MFA tamamlama — login'den dönen mfaToken + 6 haneli TOTP kod.",
        tags: ["auth"],
      },
    },
    async (request, reply) => {
      const parsed = MfaLoginSchema.safeParse(request.body);
      if (!parsed.success) {
        throw app.httpErrors.badRequest(parsed.error.message);
      }
      let payload;
      try {
        payload = verifyMfaToken(parsed.data.mfaToken);
      } catch {
        throw app.httpErrors.unauthorized("MFA token geçersiz veya süresi doldu");
      }
      try {
        const result = await completeMfaLogin(
          deps,
          { sub: payload.sub, tenant: payload.tenant, role: payload.role },
          async (secret) => verifyTotp(secret, parsed.data.code),
        );
        return reply.send(result);
      } catch (err) {
        if (err instanceof TotpInvalidError) {
          throw app.httpErrors.unauthorized("TOTP kodu hatalı");
        }
        if (err instanceof InvalidCredentialsError) {
          throw app.httpErrors.unauthorized("Kullanıcı pasif veya bulunamadı");
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

  // ----- TOTP setup / verify -----

  app.post(
    "/setup-totp",
    {
      schema: {
        description:
          "TOTP setup başlatır. Cevap: QR data URL + base32 secret + 10 recovery code (plaintext, sadece bu cevapta görünür).",
        tags: ["auth"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const auth = request.auth!;
      const user = await withAuthLookup(app.prisma, (tx) =>
        tx.user.findFirst({ where: { id: auth.userId, tenantId: auth.tenantId } }),
      );
      if (!user) throw app.httpErrors.notFound("Kullanıcı bulunamadı");

      const setup = await generateTotpSetup({ accountName: user.email });
      const recovery = await generateRecoveryCodes(10);

      // Persist secret (NOT yet enabled until user completes /verify-totp)
      // and recovery codes (hashed). Old codes (if re-setup) are dropped.
      await withAuthLookup(app.prisma, async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { totpSecret: setup.secret, totpEnabled: false },
        });
        await tx.recoveryCode.deleteMany({ where: { userId: user.id } });
        await tx.recoveryCode.createMany({
          data: recovery.hashes.map((h) => ({ userId: user.id, codeHash: h })),
        });
      });

      return reply.send({
        otpauthUri: setup.otpauthUri,
        qrDataUrl: setup.qrDataUrl,
        recoveryCodes: recovery.plaintext,
      });
    },
  );

  app.post(
    "/verify-totp",
    {
      schema: {
        description: "TOTP setup'ı tamamlar (kullanıcı 6 haneli kodu doğrular).",
        tags: ["auth"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const parsed = TotpCodeSchema.safeParse(request.body);
      if (!parsed.success) throw app.httpErrors.badRequest(parsed.error.message);
      const auth = request.auth!;

      const user = await withAuthLookup(app.prisma, (tx) =>
        tx.user.findFirst({ where: { id: auth.userId, tenantId: auth.tenantId } }),
      );
      if (!user || !user.totpSecret) {
        throw app.httpErrors.badRequest("Önce /setup-totp çağırılmalı");
      }
      if (!(await verifyTotp(user.totpSecret, parsed.data.code))) {
        throw app.httpErrors.unauthorized("TOTP kodu hatalı");
      }
      await withAuthLookup(app.prisma, (tx) =>
        tx.user.update({ where: { id: user.id }, data: { totpEnabled: true } }),
      );
      return reply.send({ totpEnabled: true });
    },
  );

  app.post(
    "/recover",
    {
      schema: {
        description:
          "Recovery code ile TOTP'yi sıfırla. Email + plaintext recovery code; başarılıysa TOTP devre dışı, kullanıcı /setup-totp'a yönlenir.",
        tags: ["auth"],
      },
    },
    async (request, reply) => {
      const parsed = RecoverSchema.safeParse(request.body);
      if (!parsed.success) throw app.httpErrors.badRequest(parsed.error.message);

      const result = await withAuthLookup(app.prisma, async (tx) => {
        const user = await tx.user.findFirst({
          where: { email: parsed.data.email.trim().toLowerCase() },
          include: { recoveryCodes: { where: { usedAt: null } } },
        });
        if (!user || !user.isActive) return null;
        const match = await verifyRecoveryCode(
          parsed.data.recoveryCode,
          user.recoveryCodes.map((c) => ({ id: c.id, hash: c.codeHash })),
        );
        if (!match) return null;
        // mark code used + disable TOTP so user can re-enroll
        await tx.recoveryCode.update({
          where: { id: match.id },
          data: { usedAt: new Date() },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { totpEnabled: false, totpSecret: null },
        });
        return { userId: user.id, tenantId: user.tenantId, role: user.role };
      });

      if (!result) {
        throw app.httpErrors.unauthorized("Recovery code geçersiz");
      }
      // Re-enrollment için kısa ömürlü access token döndür (mfa devre dışı).
      const tokens = app.jwt.issueTokens(result);
      return reply.send({
        status: "totp_reset",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        message: "TOTP sıfırlandı; lütfen tekrar /setup-totp çağırın.",
      });
    },
  );

  // OpenAPI uses these schema definitions implicitly via Zod imports
  void TokenPair;
  void argon2; // used in service layer; keeps tree-shaker happy with explicit ref
}
