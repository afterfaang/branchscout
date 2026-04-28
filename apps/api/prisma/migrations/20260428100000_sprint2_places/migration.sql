-- Sprint 2 — Places + cost tracking schema
-- Adds: Company (cache + enrichment), ApiCostEvent (outbound API cost log)

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "googlePlaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formattedAddress" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "category" TEXT,
    "types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "photosJson" JSONB,
    "hoursJson" JSONB,
    "websiteUri" TEXT,
    "phone" TEXT,
    "websiteSummaryText" TEXT,
    "mersisNo" TEXT,
    "vergiNo" TEXT,
    "leadScore" INTEGER,
    "lastEnrichedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCostEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "costUsd" DECIMAL(12,6) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiCostEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_googlePlaceId_key" ON "Company"("googlePlaceId");

-- CreateIndex
CREATE INDEX "Company_tenantId_idx" ON "Company"("tenantId");

-- CreateIndex
CREATE INDEX "Company_tenantId_category_idx" ON "Company"("tenantId", "category");

-- CreateIndex
CREATE INDEX "Company_tenantId_lat_lng_idx" ON "Company"("tenantId", "lat", "lng");

-- CreateIndex
CREATE INDEX "ApiCostEvent_tenantId_createdAt_idx" ON "ApiCostEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiCostEvent_provider_createdAt_idx" ON "ApiCostEvent"("provider", "createdAt");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
