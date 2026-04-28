-- BranchScout — Sprint 1.6 RLS hardening
--
-- 01_enable_rls.sql'deki "current_setting IS NULL → görünür" fallback'i kaldırılır.
-- Bunun yerine kontrollü bir auth-lookup carve-out'u eklenir:
--   * `app.current_tenant` set ise → o tenant'ın satırları görünür (normal yol).
--   * `app.auth_lookup = 'on'` set ise → tüm satırlar görünür (login/refresh için).
--   * Hiçbiri set değilse → 0 satır.
--
-- auth_lookup yalnızca apps/api/src/infrastructure/db/tenantPrisma.ts içindeki
-- `withAuthLookup(...)` helper'ı tarafından, sadece tek bir transaction
-- bağlamında açılır; SET LOCAL kullandığımız için commit/rollback sonrası
-- otomatik düşer. Tenant izolasyonu hâlâ uygulama katmanında ek `where`
-- filtreleriyle pekiştirilir.
--
-- Idempotent.

-- ===== Tenant =====
DROP POLICY IF EXISTS tenant_self_access ON "Tenant";
CREATE POLICY tenant_self_access ON "Tenant"
  USING (
    "id" = current_setting('app.current_tenant', true)
    OR current_setting('app.auth_lookup', true) = 'on'
  );

-- ===== User =====
DROP POLICY IF EXISTS user_tenant_isolation ON "User";
CREATE POLICY user_tenant_isolation ON "User"
  USING (
    "tenantId" = current_setting('app.current_tenant', true)
    OR current_setting('app.auth_lookup', true) = 'on'
  );

-- ===== Region =====
DROP POLICY IF EXISTS region_tenant_isolation ON "Region";
CREATE POLICY region_tenant_isolation ON "Region"
  USING ("tenantId" = current_setting('app.current_tenant', true));

-- ===== Branch =====
DROP POLICY IF EXISTS branch_tenant_isolation ON "Branch";
CREATE POLICY branch_tenant_isolation ON "Branch"
  USING ("tenantId" = current_setting('app.current_tenant', true));
