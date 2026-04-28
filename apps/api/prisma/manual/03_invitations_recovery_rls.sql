-- BranchScout — RLS for Sprint 1 new tables (Invitation, RecoveryCode)
--
-- Invitation: tenant-scoped, isolation by tenantId.
-- RecoveryCode: user-scoped (no tenantId column); join via User.tenantId.
--   Policy enforces that the owning user is in the active tenant.
-- Idempotent.

-- ===== Invitation =====
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitation_tenant_isolation ON "Invitation";
CREATE POLICY invitation_tenant_isolation ON "Invitation"
  USING ("tenantId" = current_setting('app.current_tenant', true));

-- ===== RecoveryCode =====
ALTER TABLE "RecoveryCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecoveryCode" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recovery_code_tenant_isolation ON "RecoveryCode";
CREATE POLICY recovery_code_tenant_isolation ON "RecoveryCode"
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."id" = "RecoveryCode"."userId"
        AND u."tenantId" = current_setting('app.current_tenant', true)
    )
  );
