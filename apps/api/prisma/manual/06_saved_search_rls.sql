-- Sprint 3 — RLS for SavedSearch
-- Idempotent.

ALTER TABLE "SavedSearch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedSearch" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS savedsearch_tenant_isolation ON "SavedSearch";
CREATE POLICY savedsearch_tenant_isolation ON "SavedSearch"
  USING ("tenantId" = current_setting('app.current_tenant', true));
