// JWT plugin unit testi — Fastify instance ile gerçek issue/verify döngüsü.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import jwtPlugin from "../jwt.js";

describe("jwt plugin", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(sensible);
    await app.register(jwtPlugin);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("issues an access + refresh token pair", () => {
    const tokens = app.jwt.issueTokens({
      userId: "user-1",
      tenantId: "tenant-1",
      role: "BRANCH_MANAGER",
    });

    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(tokens.refreshJti).toBeTruthy();
    expect(tokens.accessToken).not.toBe(tokens.refreshToken);
  });

  it("verifies a valid access token and returns the payload", () => {
    const { accessToken } = app.jwt.issueTokens({
      userId: "user-2",
      tenantId: "tenant-2",
      role: "ADMIN",
    });

    const payload = app.jwt.verifyAccess(accessToken);

    expect(payload.sub).toBe("user-2");
    expect(payload.tenant).toBe("tenant-2");
    expect(payload.role).toBe("ADMIN");
    expect(payload.type).toBe("access");
  });

  it("rejects an access token if presented as refresh", () => {
    const { accessToken } = app.jwt.issueTokens({
      userId: "user-3",
      tenantId: "tenant-3",
      role: "BRANCH_MANAGER",
    });

    expect(() => app.jwt.verifyRefresh(accessToken)).toThrow();
  });

  it("rejects a tampered token", () => {
    const { accessToken } = app.jwt.issueTokens({
      userId: "user-4",
      tenantId: "tenant-4",
      role: "BRANCH_MANAGER",
    });
    const tampered = accessToken.slice(0, -2) + "xx";

    expect(() => app.jwt.verifyAccess(tampered)).toThrow();
  });

  it("includes a unique jti on each refresh token", () => {
    const a = app.jwt.issueTokens({
      userId: "user-5",
      tenantId: "tenant-5",
      role: "BRANCH_MANAGER",
    });
    const b = app.jwt.issueTokens({
      userId: "user-5",
      tenantId: "tenant-5",
      role: "BRANCH_MANAGER",
    });

    expect(a.refreshJti).not.toBe(b.refreshJti);
  });

  describe("requireRole", () => {
    // requireRole tests need to register routes; these can only be added
    // before app.ready(), so each test builds its own app instance.
    async function buildAppWithRoute(opts: {
      role: import("@prisma/client").Role[];
      path: string;
    }) {
      const local = Fastify({ logger: false });
      await local.register(sensible);
      await local.register(jwtPlugin);
      local.get(opts.path, { preHandler: local.requireRole(...opts.role) }, async () => ({
        ok: true,
      }));
      await local.ready();
      return local;
    }

    it("allows when user role is in the allowlist", async () => {
      const local = await buildAppWithRoute({ role: ["ADMIN"], path: "/admin-only" });
      const { accessToken } = local.jwt.issueTokens({
        userId: "u",
        tenantId: "t",
        role: "ADMIN",
      });

      const res = await local.inject({
        method: "GET",
        url: "/admin-only",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
      await local.close();
    });

    it("rejects with 403 when role does not match", async () => {
      const local = await buildAppWithRoute({ role: ["ADMIN"], path: "/admin-only" });
      const { accessToken } = local.jwt.issueTokens({
        userId: "u",
        tenantId: "t",
        role: "BRANCH_MANAGER",
      });

      const res = await local.inject({
        method: "GET",
        url: "/admin-only",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(403);
      await local.close();
    });

    it("rejects with 401 when no token", async () => {
      const local = await buildAppWithRoute({ role: ["ADMIN"], path: "/admin-only" });

      const res = await local.inject({ method: "GET", url: "/admin-only" });

      expect(res.statusCode).toBe(401);
      await local.close();
    });

    it("accepts multiple allowed roles", async () => {
      const local = await buildAppWithRoute({
        role: ["ADMIN", "REGION_MANAGER"],
        path: "/manager-only",
      });
      const { accessToken } = local.jwt.issueTokens({
        userId: "u",
        tenantId: "t",
        role: "REGION_MANAGER",
      });

      const res = await local.inject({
        method: "GET",
        url: "/manager-only",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      await local.close();
    });
  });
});
