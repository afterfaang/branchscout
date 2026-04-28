// Auth servisi — login + refresh iş mantığı.
// Saf fonksiyonlar; route handler'lardan çağrılır. Test edilebilir tutuldu:
// PrismaClient ve JWT helper'ları parametre olarak enjekte edilir.

import argon2 from "argon2";
import type { PrismaClient, Role, User } from "@prisma/client";
import { withAuthLookup } from "../../infrastructure/db/tenantPrisma.js";

export interface AuthDeps {
  prisma: PrismaClient;
  issueTokens: (params: {
    userId: string;
    tenantId: string;
    role: Role;
  }) => { accessToken: string; refreshToken: string; refreshJti: string };
  accessTtl: string;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid credentials");
    this.name = "InvalidCredentialsError";
  }
}

export class InactiveUserError extends Error {
  constructor() {
    super("User is inactive");
    this.name = "InactiveUserError";
  }
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: Pick<User, "id" | "tenantId" | "email" | "name" | "role" | "branchId">;
}

export async function login(
  deps: AuthDeps,
  email: string,
  password: string,
): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();

  // Login akışı tenant context'i bilmediği için RLS carve-out'u (auth_lookup) ile
  // global User tablosunda email araması yapar. Kontrollü ve transaction-local.
  const user = await withAuthLookup(deps.prisma, (tx) =>
    tx.user.findFirst({ where: { email: normalizedEmail } }),
  );

  if (!user) {
    // Aynı süre içinde başarısız olmak için yine de hash kontrol et (timing attack savunması).
    await argon2.hash("dummy-pass-to-equalize-timing");
    throw new InvalidCredentialsError();
  }

  const passwordOk = await argon2.verify(user.passwordHash, password);
  if (!passwordOk) {
    throw new InvalidCredentialsError();
  }

  if (!user.isActive) {
    throw new InactiveUserError();
  }

  const tokens = deps.issueTokens({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: deps.accessTtl,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
    },
  };
}

export async function refresh(
  deps: AuthDeps,
  payload: { sub: string; tenant: string },
): Promise<{ accessToken: string; refreshToken: string; expiresIn: string }> {
  const user = await withAuthLookup(deps.prisma, (tx) =>
    tx.user.findFirst({
      where: { id: payload.sub, tenantId: payload.tenant },
    }),
  );

  if (!user || !user.isActive) {
    throw new InvalidCredentialsError();
  }

  const tokens = deps.issueTokens({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: deps.accessTtl,
  };
}

export async function getCurrentUser(
  prisma: PrismaClient,
  userId: string,
  tenantId: string,
) {
  // /me endpoint'i auth'lı, ama burada request.db'ye erişimimiz yok; auth
  // context'inden gelen tenantId ile withAuthLookup kullanmak yeterli ve
  // tenantId filter'ı zaten where içinde.
  const user = await withAuthLookup(prisma, (tx) =>
    tx.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
      },
    }),
  );
  return user;
}
