// RLS-aware Prisma helper.
//
// Postgres Row-Level Security (RLS) kullanıyoruz. Policy'ler
// `current_setting('app.current_tenant', true)` üzerinden tenant_id'yi okur.
// Bu setting yalnızca o transaction veya o session bağlamında geçerli; her
// HTTP isteğinde request bağlamında set edilmelidir.
//
// `withTenant(prisma, tenantId, fn)` bir Prisma transaction açar, içinde
// `SET LOCAL app.current_tenant = ...` çalıştırır ve callback'i o tx ile
// çağırır. Transaction sonunda Postgres kendi LOCAL setting'ini düşürür.
//
// Auth gerektirmeyen endpoint'ler (login, refresh) global `prisma` üzerinden
// gider; bunlar kullanıcıyı tenant context kurulmadan önce bulmak zorunda.
// RLS policy'leri Sprint 1'de "permissive fallback" ile bu durumu destekler;
// Sprint 1.6 sonrası fallback kaldırılır ve auth endpoint'leri ilgili
// sorgularda kendi user-bound tx'ini açar.

import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

export type TenantBoundClient = Prisma.TransactionClient;

export async function withTenant<T>(
  prisma: PrismaClient,
  tenantId: string,
  fn: (tx: TenantBoundClient) => Promise<T>,
): Promise<T> {
  if (!tenantId || typeof tenantId !== "string") {
    throw new Error("withTenant: tenantId is required");
  }
  return prisma.$transaction(async (tx) => {
    // SET LOCAL only valid inside a transaction; auto-rolls back at COMMIT.
    // Use parametrized query to avoid SQL injection from tenantId.
    await tx.$executeRaw(Prisma.sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`);
    return fn(tx);
  });
}

// withAuthLookup — login / refresh akışları için kontrollü RLS carve-out.
// `app.auth_lookup = 'on'` set edilir, böylece Tenant + User policy'leri tüm
// satırları döndürür. SADECE auth servisi tarafından çağrılmalı; her çağrı
// kendi transaction'ında izole. Diğer modüller bu helper'a doğrudan
// erişmemeli — referansını sınırlı tutmak için exports'tan çıkarılmadı ama
// auth.service'in import etmesi yeterli.
export async function withAuthLookup<T>(
  prisma: PrismaClient,
  fn: (tx: TenantBoundClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT set_config('app.auth_lookup', 'on', true)`);
    return fn(tx);
  });
}
