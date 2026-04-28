// JWT plugin — access + refresh token üretimi ve doğrulama.
// Sentry/observability istek bağlamına token'dan gelen tenant + user ekler.
//
// Token yapısı:
//   access:  { sub: userId, tenant: tenantId, role, type: "access" }
//   refresh: { sub: userId, tenant: tenantId, jti, type: "refresh" }

import fp from "fastify-plugin";
import jwt, { type SignOptions } from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Role } from "@prisma/client";
import { config } from "../config.js";

export interface AccessTokenPayload {
  sub: string;
  tenant: string;
  role: Role;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  tenant: string;
  jti: string;
  type: "refresh";
}

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: Role;
}

declare module "fastify" {
  interface FastifyInstance {
    jwt: {
      issueTokens: (params: {
        userId: string;
        tenantId: string;
        role: Role;
      }) => { accessToken: string; refreshToken: string; refreshJti: string };
      verifyAccess: (token: string) => AccessTokenPayload;
      verifyRefresh: (token: string) => RefreshTokenPayload;
    };
    requireAuth: (
      request: FastifyRequest,
    ) => Promise<AuthContext>;
  }
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

async function jwtPlugin(app: FastifyInstance) {
  const secret = config.jwt.secret;
  const accessOpts: SignOptions = {
    expiresIn: config.jwt.accessTtl as SignOptions["expiresIn"],
    algorithm: "HS256",
  };
  const refreshOpts: SignOptions = {
    expiresIn: config.jwt.refreshTtl as SignOptions["expiresIn"],
    algorithm: "HS256",
  };

  function issueTokens(params: {
    userId: string;
    tenantId: string;
    role: Role;
  }): { accessToken: string; refreshToken: string; refreshJti: string } {
    const accessPayload: AccessTokenPayload = {
      sub: params.userId,
      tenant: params.tenantId,
      role: params.role,
      type: "access",
    };
    const refreshJti = randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      sub: params.userId,
      tenant: params.tenantId,
      jti: refreshJti,
      type: "refresh",
    };
    return {
      accessToken: jwt.sign(accessPayload, secret, accessOpts),
      refreshToken: jwt.sign(refreshPayload, secret, refreshOpts),
      refreshJti,
    };
  }

  function verifyAccess(token: string): AccessTokenPayload {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      (decoded as { type?: string }).type !== "access"
    ) {
      throw new Error("Invalid token type");
    }
    return decoded as unknown as AccessTokenPayload;
  }

  function verifyRefresh(token: string): RefreshTokenPayload {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      (decoded as { type?: string }).type !== "refresh"
    ) {
      throw new Error("Invalid token type");
    }
    return decoded as unknown as RefreshTokenPayload;
  }

  app.decorate("jwt", { issueTokens, verifyAccess, verifyRefresh });

  // Reusable auth guard for protected routes.
  app.decorate("requireAuth", async function (request: FastifyRequest) {
    const header = request.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw app.httpErrors.unauthorized("Missing bearer token");
    }
    const token = header.slice("Bearer ".length).trim();
    let payload: AccessTokenPayload;
    try {
      payload = verifyAccess(token);
    } catch {
      throw app.httpErrors.unauthorized("Invalid or expired token");
    }
    const ctx: AuthContext = {
      userId: payload.sub,
      tenantId: payload.tenant,
      role: payload.role,
    };
    request.auth = ctx;
    return ctx;
  });
}

export default fp(jwtPlugin, { name: "jwt", dependencies: [] });
