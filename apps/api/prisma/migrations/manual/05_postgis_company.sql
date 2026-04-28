-- Sprint 2 — PostGIS upgrade for Company.location (gated, idempotent).
--
-- Bu migration sadece PostGIS extension'ı yüklü/yüklenebilir bir Postgres
-- üzerinde anlamlı. Aksi halde sessizce no-op döner. Sprint 2'de Company
-- (lat, lng) Float kolonları + composite index ile gidiyoruz; PostGIS
-- olunca bu migration `location geography(Point,4326)` kolonu + GIST index
-- ekler ve mevcut lat/lng değerlerinden doldurur.
--
-- Çalıştırma: PostGIS olduğunu varsayıp `pnpm db:migrate:manual` veya
-- doğrudan psql ile.

DO $$
BEGIN
  -- Try to enable PostGIS; many managed Postgres images require superuser.
  BEGIN
    CREATE EXTENSION IF NOT EXISTS postgis;
  EXCEPTION WHEN insufficient_privilege OR feature_not_supported THEN
    RAISE NOTICE 'PostGIS extension cannot be enabled here; skipping geography column.';
    RETURN;
  END;

  -- Add `location` column if missing.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Company' AND column_name = 'location'
  ) THEN
    ALTER TABLE "Company" ADD COLUMN location geography(Point, 4326);
  END IF;

  -- Backfill from lat/lng for any rows missing the geography value.
  UPDATE "Company"
  SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  WHERE location IS NULL AND lat IS NOT NULL AND lng IS NOT NULL;

  -- GIST index for fast spatial queries.
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'company_location_gix'
  ) THEN
    CREATE INDEX company_location_gix ON "Company" USING GIST (location);
  END IF;
END
$$;
