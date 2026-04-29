-- Sprint 4 — RLS for WebsiteClick
-- Idempotent.

ALTER TABLE "WebsiteClick" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebsiteClick" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS websiteclick_tenant_isolation ON "WebsiteClick";
CREATE POLICY websiteclick_tenant_isolation ON "WebsiteClick"
  USING ("tenantId" = current_setting('app.current_tenant', true));
