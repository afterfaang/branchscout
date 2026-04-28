-- Sprint 2 — RLS for Company + ApiCostEvent
-- Idempotent.

-- ===== Company =====
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Company" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_tenant_isolation ON "Company";
CREATE POLICY company_tenant_isolation ON "Company"
  USING ("tenantId" = current_setting('app.current_tenant', true));

-- ===== ApiCostEvent =====
-- tenantId is nullable (some events are tenant-agnostic, e.g. global cron jobs).
-- Policy: visible if matches current tenant, OR row has no tenant AND caller is in
-- auth_lookup (admin sees global events). Sprint 8'de admin için ayrı bypass yapılacak.
ALTER TABLE "ApiCostEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiCostEvent" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS apicostevent_tenant_isolation ON "ApiCostEvent";
CREATE POLICY apicostevent_tenant_isolation ON "ApiCostEvent"
  USING (
    "tenantId" = current_setting('app.current_tenant', true)
    OR ("tenantId" IS NULL AND current_setting('app.auth_lookup', true) = 'on')
  );
