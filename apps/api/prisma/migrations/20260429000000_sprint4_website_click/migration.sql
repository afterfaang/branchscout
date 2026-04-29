-- Sprint 4 — WebsiteClick model

CREATE TABLE "WebsiteClick" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteClick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteClick_tenantId_createdAt_idx" ON "WebsiteClick"("tenantId", "createdAt");
CREATE INDEX "WebsiteClick_companyId_createdAt_idx" ON "WebsiteClick"("companyId", "createdAt");

ALTER TABLE "WebsiteClick" ADD CONSTRAINT "WebsiteClick_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteClick" ADD CONSTRAINT "WebsiteClick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteClick" ADD CONSTRAINT "WebsiteClick_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
