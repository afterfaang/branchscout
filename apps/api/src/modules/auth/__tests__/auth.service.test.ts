// Auth service unit testi — argon2 hash + service mantığı.
// Prisma mock'lanır; gerçek DB integration test'i Sprint 1 sonu eklenecek.

import { describe, it, expect, beforeAll } from "vitest";
import argon2 from "argon2";
import {
  InactiveUserError,
  InvalidCredentialsError,
  login,
  refresh,
} from "../auth.service.js";
import type { AuthDeps } from "../auth.service.js";
import type { Role } from "@prisma/client";

interface FakeUser {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  branchId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function makeFakePrisma(users: FakeUser[]): AuthDeps["prisma"] {
  return {
    user: {
      findFirst: async ({
        where,
      }: {
        where: { email?: string; id?: string; tenantId?: string };
      }) => {
        return (
          users.find((u) => {
            if (where.email && u.email !== where.email) return false;
            if (where.id && u.id !== where.id) return false;
            if (where.tenantId && u.tenantId !== where.tenantId) return false;
            return true;
          }) ?? null
        );
      },
    },
  } as unknown as AuthDeps["prisma"];
}

function makeIssueTokens() {
  let counter = 0;
  return (params: { userId: string; tenantId: string; role: Role }) => {
    counter++;
    return {
      accessToken: `access-${params.userId}-${counter}`,
      refreshToken: `refresh-${params.userId}-${counter}`,
      refreshJti: `jti-${counter}`,
    };
  };
}

let activeUser: FakeUser;
let inactiveUser: FakeUser;

beforeAll(async () => {
  const passwordHash = await argon2.hash("correct-password");
  activeUser = {
    id: "u-1",
    tenantId: "t-1",
    email: "ayse@demo-bank.test",
    passwordHash,
    name: "Ayşe Şube Müdürü",
    role: "BRANCH_MANAGER",
    branchId: "b-1",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  inactiveUser = {
    ...activeUser,
    id: "u-2",
    email: "pasif@demo-bank.test",
    isActive: false,
  };
});

function makeDeps(users: FakeUser[]): AuthDeps {
  return {
    prisma: makeFakePrisma(users),
    issueTokens: makeIssueTokens(),
    accessTtl: "15m",
  };
}

describe("auth.service.login", () => {
  it("logs in an active user with correct password", async () => {
    const deps = makeDeps([activeUser]);
    const result = await login(deps, "ayse@demo-bank.test", "correct-password");

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email).toBe("ayse@demo-bank.test");
    expect(result.user.role).toBe("BRANCH_MANAGER");
    expect(result.user.tenantId).toBe("t-1");
  });

  it("normalizes email (uppercase + spaces)", async () => {
    const deps = makeDeps([activeUser]);
    const result = await login(deps, "  AYSE@demo-bank.test  ", "correct-password");

    expect(result.user.email).toBe("ayse@demo-bank.test");
  });

  it("rejects unknown email with InvalidCredentialsError", async () => {
    const deps = makeDeps([activeUser]);
    await expect(
      login(deps, "yok@demo-bank.test", "anything"),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects wrong password with InvalidCredentialsError", async () => {
    const deps = makeDeps([activeUser]);
    await expect(
      login(deps, "ayse@demo-bank.test", "wrong-password"),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects inactive user with InactiveUserError", async () => {
    const deps = makeDeps([inactiveUser]);
    await expect(
      login(deps, "pasif@demo-bank.test", "correct-password"),
    ).rejects.toBeInstanceOf(InactiveUserError);
  });
});

describe("auth.service.refresh", () => {
  it("issues new tokens for a valid active user", async () => {
    const deps = makeDeps([activeUser]);
    const result = await refresh(deps, { sub: "u-1", tenant: "t-1" });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it("rejects refresh for unknown user", async () => {
    const deps = makeDeps([activeUser]);
    await expect(
      refresh(deps, { sub: "nope", tenant: "t-1" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects refresh for inactive user", async () => {
    const deps = makeDeps([inactiveUser]);
    await expect(
      refresh(deps, { sub: "u-2", tenant: "t-1" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
