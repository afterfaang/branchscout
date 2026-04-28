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
- Manual (raw SQL) migration'lar: `apps/api/prisma/migrations/manual/` — RLS policy'leri burada; PostGIS Sprint 2'de eklenecek
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

## Auth modülü (Sprint 1)

- JWT plugin: `apps/api/src/plugins/jwt.ts` — access (15dk) + refresh (7gün), HS256, jti
- Auth route'ları: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`
- Korumalı endpoint pattern: route definition'ında `preHandler: app.requireAuth`, handler içinde `request.auth!`
- Argon2id parola hash; seed'deki demo admin: `admin@demo-bank.test` / `admin123!`
- TOTP / MFA: Sprint 1 user story US-1.3'ün ikinci PR'ında eklenecek

## Önemli

- Banka iç sistemleri (SSO, CRM, MERSİS) yok — SaaS olarak konumlanıyor; PRD § 7.4 veri kaynağı stratejisi
- Google Maps API key Sprint 2'de devreye girer; o zamana kadar harita placeholder
- Güvenlik: Helmet, CORS, JWT, RLS Sprint 0-1'de kuruldu; sıkılaştırma + pen test Sprint 15'te
