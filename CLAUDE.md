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
- PostGIS gerektiren raw SQL'ler: `apps/api/prisma/migrations/manual/` (Sprint 2'de gelecek)
- Tüm yeni tablolar `tenantId` taşır; RLS policy migration'da yazılır

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

## Önemli

- Banka iç sistemleri (SSO, CRM, MERSİS) mock olarak başlar; production'da provider değişir
- Google Maps API key sadece Sprint 2'de devreye girer; o zamana kadar harita placeholder
- Güvenlik: Helmet, CORS, JWT, rate limit Sprint 0'da kuruldu; sıkılaştırma Sprint 15'te
