// Multi-tenant RLS integration testi.
//
// Gerçek bir Postgres'e bağlanır, iki tenant + iki branch oluşturur ve
// `withTenant(...)` altında Tenant A bağlamından Tenant B verisinin
// görünmediğini doğrular. Manual migration'ların (01 + 02 + 03) uygulanmış
// olması gerekir.
//
// Çalıştırma:
//   RUN_INTEGRATION=1 DATABASE_URL=postgres://... pnpm --filter @branchscout/api test
//
// CI'da PG service container ile çalışır; lokalde DATABASE_URL varsa flag ile
// açılır. Aksi halde test atlanır.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { withTenant } from "../../infrastructure/db/tenantPrisma.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const shouldRun = !!(process.env.RUN_INTEGRATION && process.env.DATABASE_URL);
const describeIf = shouldRun ? describe : describe.skip;

describeIf("multi-tenant RLS isolation", () => {
  let prisma: PrismaClient;
  let tenantA: { id: string; slug: string };
  let tenantB: { id: string; slug: string };

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Migration'ların uygulandığını varsayıyoruz; manual SQL'leri burada
    // tekrar uygulayarak idempotent şekilde garantiliyoruz.
    const manualDir = join(__dirname, "..", "..", "..", "prisma", "migrations", "manual");
    for (const file of ["01_enable_rls.sql", "02_drop_permissive_fallback.sql", "03_invitations_recovery_rls.sql"]) {
      const sql = readFileSync(join(manualDir, file), "utf-8");
      await prisma.$executeRawUnsafe(sql);
    }

    // Test fixture: 2 tenant + 1 branch each. Auth_lookup carve-out ile yazılır.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.auth_lookup', 'on', true)`);
      // tenant A
      tenantA = await tx.tenant.upsert({
        where: { slug: "rls-test-a" },
        update: {},
        create: { name: "Tenant A", slug: "rls-test-a" },
      });
      // tenant B
      tenantB = await tx.tenant.upsert({
        where: { slug: "rls-test-b" },
        update: {},
        create: { name: "Tenant B", slug: "rls-test-b" },
      });
    });

    // Branches: auth_lookup Branch policy'sinde yok; current_tenant ile yazılmalı.
    await withTenant(prisma, tenantA.id, async (tx) => {
      await tx.branch.upsert({
        where: { tenantId_code: { tenantId: tenantA.id, code: "RLS-A1" } },
        update: {},
        create: {
          tenantId: tenantA.id,
          code: "RLS-A1",
          name: "Tenant A Branch",
          address: "A street",
        },
      });
    });
    await withTenant(prisma, tenantB.id, async (tx) => {
      await tx.branch.upsert({
        where: { tenantId_code: { tenantId: tenantB.id, code: "RLS-B1" } },
        update: {},
        create: {
          tenantId: tenantB.id,
          code: "RLS-B1",
          name: "Tenant B Branch",
          address: "B street",
        },
      });
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.auth_lookup', 'on', true)`);
        await tx.branch.deleteMany({
          where: { OR: [{ tenantId: tenantA.id }, { tenantId: tenantB.id }] },
        });
        await tx.tenant.deleteMany({
          where: { OR: [{ id: tenantA.id }, { id: tenantB.id }] },
        });
      });
      await prisma.$disconnect();
    }
  });

  it("Tenant A context only sees Tenant A branches", async () => {
    const branches = await withTenant(prisma, tenantA.id, (tx) => tx.branch.findMany());
    expect(branches).toHaveLength(1);
    expect(branches[0]?.code).toBe("RLS-A1");
  });

  it("Tenant B context only sees Tenant B branches", async () => {
    const branches = await withTenant(prisma, tenantB.id, (tx) => tx.branch.findMany());
    expect(branches).toHaveLength(1);
    expect(branches[0]?.code).toBe("RLS-B1");
  });

  it("Cross-tenant query returns 0 rows even with explicit where", async () => {
    // Tenant A bağlamından Tenant B'nin branchini ID ile sorgulasak bile
    // RLS policy filtreliyor → null dönmeli.
    const tenantBBranch = await withTenant(prisma, tenantB.id, (tx) =>
      tx.branch.findFirst({ where: { code: "RLS-B1" } }),
    );
    expect(tenantBBranch).not.toBeNull();
    const branchId = tenantBBranch!.id;

    const fromA = await withTenant(prisma, tenantA.id, (tx) =>
      tx.branch.findFirst({ where: { id: branchId } }),
    );
    expect(fromA).toBeNull();
  });

  it("Without app.current_tenant, Branch policy returns 0 rows", async () => {
    const branches = await prisma.branch.findMany({
      where: { OR: [{ tenantId: tenantA.id }, { tenantId: tenantB.id }] },
    });
    expect(branches).toHaveLength(0);
  });
});

describe.skipIf(shouldRun)("multi-tenant RLS isolation (skipped — set RUN_INTEGRATION=1 + DATABASE_URL)", () => {
  it.skip("requires Postgres + RUN_INTEGRATION", () => {});
});
