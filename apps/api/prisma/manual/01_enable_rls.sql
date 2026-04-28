-- BranchScout — Multi-tenant Row-Level Security (RLS)
--
-- Bu manual migration Prisma'nın oluşturduğu temel tablolara RLS aktifleştirir.
-- Çalıştırma:  psql $DATABASE_URL -f apps/api/prisma/migrations/manual/01_enable_rls.sql
-- Idempotent: tekrar çalıştırılırsa hata vermez (DROP POLICY IF EXISTS).
--
-- Yaklaşım:
--   - Tablolar `tenant_id` taşır.
--   - Policy `current_setting('app.current_tenant', true)` ile karşılaştırır.
--   - 3. argüman `true` → eksik setting NULL döner; eksik setting durumunda
--     uygulama-katmanı `tenantId` filtreleri yine güvenlik sağlar (defense in depth).
--   - Sprint 2'de Prisma client extension ile per-request transaction içinde
--     `SET LOCAL app.current_tenant` çağrısı yapılacak; o zaman fallback kaldırılır.

-- ===== Tenants =====
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_self_access ON "Tenant";
CREATE POLICY tenant_self_access ON "Tenant"
  USING (
    "id" = current_setting('app.current_tenant', true)
    OR current_setting('app.current_tenant', true) IS NULL
  );

-- ===== Users =====
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_tenant_isolation ON "User";
CREATE POLICY user_tenant_isolation ON "User"
  USING (
    "tenantId" = current_setting('app.current_tenant', true)
    OR current_setting('app.current_tenant', true) IS NULL
  );

-- ===== Region =====
ALTER TABLE "Region" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Region" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS region_tenant_isolation ON "Region";
CREATE POLICY region_tenant_isolation ON "Region"
  USING (
    "tenantId" = current_setting('app.current_tenant', true)
    OR current_setting('app.current_tenant', true) IS NULL
  );

-- ===== Branch =====
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branch_tenant_isolation ON "Branch";
CREATE POLICY branch_tenant_isolation ON "Branch"
  USING (
    "tenantId" = current_setting('app.current_tenant', true)
    OR current_setting('app.current_tenant', true) IS NULL
  );

-- ===== Helper: setter function (gelecekte plugin tarafından çağrılır) =====
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant', tenant_id, true);
END;
$$ LANGUAGE plpgsql;

-- ===== Smoke check =====
-- Çalıştırma sonrası `SELECT * FROM "Tenant"` (admin role olmadan) NULL setting
-- altında çalışmalı, future "real" tenant context altında sadece kendi satırını
-- döndürmeli. Sprint 2'de integration test ile doğrulanacak.
