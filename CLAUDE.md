# CLAUDE.md — BranchScout için Claude Code Rehberi

Bu doküman Claude Code'un repo üzerinde çalışırken takip edeceği prensipleri içerir.

## Proje

BranchScout — multi-tenant SaaS, banka şube müdürü saha keşif/ziyaret uygulaması.
Stack: Turborepo + pnpm, Vite + React + TS frontend, Fastify + Prisma backend, Postgres + Redis.
Railway üzerinde deploy ediliyor.

## Klasör yapısı

- `apps/api/` — Fastify backend, Prisma schema `apps/api/prisma/schema.prisma`
- `apps/web/` — React frontend, feature-based (`src/features/<area>/`)
- `packages/shared/` — Frontend ve backend arasında paylaşılan tipler ve Zod şemaları
- `packages/config/` — Paylaşılan TS config

## Kod stili

- TypeScript strict, named exports tercih edilir; default export sadece React component'lerde
- Feature-based klasör yapısı (auth, map, places, visits, routes, pipeline, reports)
- ESLint + Prettier zorunlu, her PR'da yeşil
- Türkçe UI metinleri; ileride i18n için key bazlı

## Veritabanı

- Prisma schema tek kaynak: `apps/api/prisma/schema.prisma`
- Migration: `pnpm db:migrate`
- Manual (raw SQL) migration'lar: `apps/api/prisma/manual/` — RLS policy'leri burada; PostGIS Sprint 2'de eklenecek (Prisma `migrate deploy`'in scan path'inden ayrı tutuluyor)
- Manual SQL uygulama: `pnpm --filter @branchscout/api db:migrate:manual`
- Tüm yeni tablolar `tenantId` taşır; RLS policy migration'da yazılır
- Sprint 1: RLS aktif ama "permissive fallback" var — `app.current_tenant` setting yokken read açık. Sprint 2'de Prisma client extension ile per-request `SET LOCAL app.current_tenant` zorunlu hale gelecek

## API kontratı

- Fastify zod schema'larından OpenAPI auto-gen `/docs` altında
- Endpoint eklerken: önce zod schema → sonra route → sonra OpenAPI
- Response envelope: `{ data, meta }`. Hata: RFC 7807 problem-details

## Provider abstraction

Dış servis çağrısı (Google Places, MERSİS, LLM) eklerken:
1. `apps/api/src/providers/<area>/<Area>Provider.ts` interface
2. `Concrete<Area>Provider.ts` implementasyonu
3. Test'te `InMemory<Area>Provider` mock

## Multi-tenant

- Tüm yeni tablolarda `tenantId` zorunlu
- Postgres RLS policy migration'da
- Connection-level `SET app.current_tenant` middleware tarafından

## Cost tracking

Dış API çağrılarında her zaman cost middleware kullan; her çağrı `ApiCostEvent` kaydı bırakmalı (Sprint 2'den itibaren).

## Test

- Vitest unit + integration (`apps/api/src/**/__tests__/`)
- Playwright E2E (Sprint 0 sonrasında)
- Coverage hedef: backend %70, frontend %50, sprint ilerledikçe yükselir

## Commit & PR

- Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`)
- PR'da issue link, AC kontrol listesi yorum olarak

## Sprint planı

`docs/SPRINT_PLAN.md` 16 sprintlik plan. Aktif sprint'in user story'leri ve AC'leri her sprint başında planlanır. Claude Code, ilgili sprint'in story'lerini görerek çalışır.

## Auth modülü (Sprint 1 — tamamlandı)

- JWT plugin: `apps/api/src/plugins/jwt.ts` — access (15dk) + refresh (7gün), HS256, jti
- Role guard: `app.requireRole("ADMIN", "REGION_MANAGER", ...)` preHandler factory'si
- Auth route'ları (prefix `/api/v1/auth`):
    - `POST /login` → 200 ok | 202 mfa_required
    - `POST /login/totp` → MFA tamamlama (mfaToken + 6 hane)
    - `POST /refresh`, `GET /me`
    - `POST /setup-totp` → QR + recovery codes
    - `POST /verify-totp` → TOTP'yi etkinleştir
    - `POST /recover` → recovery code ile TOTP sıfırla
- Invitation route'ları (prefix `/api/v1`):
    - `GET /invitations/:token` (public)
    - `POST /invitations/accept` (public, auto-login)
    - `POST /admin/users/invite`, `GET /admin/users/invitations`, `DELETE /admin/users/invitations/:id` (ADMIN)
- Admin: `GET /admin/users`, branches CRUD `(GET|POST|PATCH|DELETE) /admin/branches[/:id]`
- Regions: `GET /regions/my` — role'e göre erişilebilir bölgeler
- Korumalı endpoint pattern: `preHandler: app.requireAuth` (veya `requireRole`), handler içinde `request.auth!` ve `request.db((tx) => ...)`
- Argon2id parola hash; demo admin (seed): `admin@demo-bank.test` / `admin123!`
- TOTP: otplib (RFC 6238, ±30s tolerance), 10 recovery code (XXXX-XXXX, argon2id-hashed)

## Provider'lar

- Email: `apps/api/src/providers/email/` — InMemory (dev/test default), Mailhog (local SMTP), Postmark (prod). `app.email.send({ to, subject, text, html })`. Env: `POSTMARK_API_TOKEN > MAILHOG_HOST > inmemory`.
- Places: `apps/api/src/providers/places/` — InMemoryPlacesProvider (18 fake firma Kadıköy etrafı, dev/test default), GooglePlacesProvider (Places API New, X-Goog-FieldMask zorunlu, ~$0.004/call). Env: `GOOGLE_MAPS_API_KEY` set ise Google.
- Cache: `apps/api/src/infrastructure/cache/` — RedisCache (ioredis lazy import) veya InMemoryCache (Map + TTL). `app.cache.get/set/del`. Env: `REDIS_URL` set ise Redis.

## Sprint 2 — Maps + Places (tamamlandı)

- `POST /api/v1/places/search/nearby` — auth'lı, geohash6+radius+catHash cache key (7 gün TTL), Postgres'e Company upsert (tenant-scoped), her çağrı `ApiCostEvent` yazar.
- `GET /api/v1/admin/costs/today` — ADMIN, bugünkü API maliyeti (provider+endpoint kırılımı).
- Frontend: `features/map/MapPage.tsx` — Maps SDK lazy loader, AdvancedMarkerElement, supercluster clustering, yarıçap chip seçici, URL state (lat/lng/radius), kategori legend. API key yoksa demo liste paneli (provider abstraction sayesinde aynı backend akışı çalışır).
- Rate limit: `@fastify/rate-limit`, kullanıcı bazında 60/dk; Redis store opsiyonel.
- PostGIS: lat/lng Float kolonları + composite index. PostGIS GEOGRAPHY kolonu Sprint 3+ için `manual/05_postgis_company.sql` (idempotent + permission-tolerant) altında bekliyor.

## RLS — Sprint 1.6 sıkılaştırılmış

- Manual migration `02_drop_permissive_fallback.sql` permissive `current_setting IS NULL` fallback'ini kaldırdı.
- Tenant + User policy'lerinde `app.auth_lookup = 'on'` carve-out: yalnız `withAuthLookup(prisma, fn)` (login/refresh/me) tarafından açılır.
- Tenant'lı endpoint'ler `request.db((tx) => ...)` ile transaction içinde `set_config('app.current_tenant', tenantId, true)` çalıştırır → RLS otomatik filtreler.
- Integration test: `apps/api/src/__tests__/integration/multitenant.test.ts` — `RUN_INTEGRATION=1 DATABASE_URL=... pnpm test` ile çalışır; CI'da Postgres service container.

## Önemli

- Banka iç sistemleri (SSO, CRM, MERSİS) yok — SaaS olarak konumlanıyor; PRD § 7.4 veri kaynağı stratejisi
- Google Maps API key Sprint 2'de devreye girer; o zamana kadar harita placeholder
- Güvenlik: Helmet, CORS, JWT, RLS Sprint 0-1'de kuruldu; sıkılaştırma + pen test Sprint 15'te
