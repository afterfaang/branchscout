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
});
