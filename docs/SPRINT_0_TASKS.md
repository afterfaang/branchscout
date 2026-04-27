# Sprint 0 — Hazırlık ve Altyapı: Günlük Görev Listesi

**Süre:** 2 hafta (10 iş günü)
**Hedef:** Sprint 1 başlangıcında ekip "kod yazmaya başlayabilir" durumda olsun.
**Bağlı Dokümanlar:** [PRD.md](PRD.md) · [SPRINT_PLAN.md](SPRINT_PLAN.md) · [ARCHITECTURE.md](ARCHITECTURE.md)

Bu doküman Sprint 0'ı 10 iş gününe böler ve her gün için Claude Code'a verilebilecek prompt'lar içerir. Her görev kendi başına execute edilebilir; bağımlılıklar açıkça yazılı.

---

## Pre-Sprint (Sprint 0'dan 1-2 hafta önce, paralel iş)

Sprint 0 başlamadan önce yapılması gereken **insan-yoğun** işler. Bunlar geliştirme öncesi tamamlanmalı:

**P-01 — Cloud hesabı (AWS veya GCP).** Banka tarafında onay süreci. Hangi cloud, hangi region (Türkiye'de DR/uyum gereği eu-central veya eu-west tercih edilir; eğer Türkiye'de bölge varsa o).

**P-02 — Google Cloud projesi.** Places API (New), Maps JavaScript API, Routes API, Geocoding API enable. Billing account bağlanmış. Quota artırım talebi (50K/gün başlangıç). API key oluşturma + restriction (HTTP referrer + IP).

**P-03 — Domain ve DNS.** `branchscout.app` veya kurum içi `*.banka.com.tr` subdomain. SSL sertifikası (Let's Encrypt veya kurumsal CA).

**P-04 — Sentry, Datadog, LaunchDarkly hesapları.** Trial veya enterprise.

**P-05 — Anthropic API key.** Claude Haiku ve Sonnet erişimi.

**P-06 — MERSİS sözleşme süreci başlatılır** (Sprint 6'ya yetişmesi için).

**P-07 — KVKK aydınlatma metni taslağı** (hukuk ekibi).

**P-08 — Figma workspace.** Design system + ilk wireframe'ler. Tasarımcı pre-sprint başında çalışmaya başlar.

---

## Gün 1 (Pazartesi) — Repo İskeleti ve Workspace Setup

**Görev T-01.1:** Monorepo iskeletini kur.

> **Claude Code prompt (örnek):**
> "Aşağıdaki klasör yapısına sahip bir Turborepo + pnpm monorepo'su kur:
> - apps/web (Vite + React + TypeScript)
> - apps/api (Fastify + TypeScript)
> - apps/worker (Node + TypeScript, BullMQ tüketici)
> - packages/shared (TypeScript types + Zod schemas)
> - packages/ui (shadcn/ui setup, henüz boş)
> - packages/config (paylaşılan tsconfig, eslint, prettier)
>
> Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.editorconfig` yaz. TypeScript strict mode. ESLint + Prettier + Husky pre-commit (lint-staged). Hello-world endpoint'i + sayfası ile çalıştığını doğrula. ARCHITECTURE.md § 2'deki yapıya uy."

**T-01.2:** README.md ve CLAUDE.md temel dokümanları yaz. README'de quick start (clone → install → dev). CLAUDE.md'de ARCHITECTURE.md § 14 içeriğini koy.

**T-01.3:** `.env.example` oluştur. Tüm gerekli env var'ları listele (boş değerlerle).

**Çıktı:** `pnpm dev` çalışır, web'de "Hello BranchScout" görünür, API'de `/health` 200 döner.

---

## Gün 2 (Salı) — Docker Compose ve Local DB Stack

**T-02.1:** `infrastructure/docker/docker-compose.dev.yml` yaz.

> **Claude Code prompt:**
> "Local development için Docker Compose dosyası oluştur. Servisler:
> - postgres-postgis:15 (port 5432, healthcheck, named volume)
> - redis:7-alpine (port 6379, AOF persistence)
> - minio:latest (S3 emulator, port 9000 + 9001 console)
> - mailhog (email test, port 1025 + 8025)
>
> Tüm servisler bir `branchscout-dev` network'ünde. README'ye `pnpm docker:up` script'i ekle (root package.json'da)."

**T-02.2:** Postgres init script'i (PostGIS extension enable, dev kullanıcısı oluştur).

**T-02.3:** Bağlantı string'leri `.env.example`'a ekle.

**Çıktı:** `docker compose up -d` sonrası psql ile bağlanılır, `SELECT PostGIS_Version()` çalışır.

---

## Gün 3 (Çarşamba) — Prisma + İlk Schema + Migration

**T-03.1:** Prisma kurulumu.

> **Claude Code prompt:**
> "apps/api altında Prisma'yı kur. `prisma/schema.prisma` dosyasını ARCHITECTURE.md § 4'teki ilk 3 model (Tenant, User, Branch, Region) ile başlat. PostgreSQL provider, generator @prisma/client. RLS migration için raw SQL'i `prisma/migrations/manual/01_rls.sql` altına yaz (Tenant, User, Branch için RLS aktivasyonu + tenant_isolation policy). package.json'a script'ler ekle: `db:migrate dev`, `db:migrate deploy`, `db:reset`, `db:seed`."

**T-03.2:** İlk seed script'i (`prisma/seed.ts`) — 1 demo tenant, 1 admin user, 2 örnek şube oluştursun.

**T-03.3:** PostGIS için raw SQL helper module yaz (`apps/api/src/infrastructure/db/postgis.ts`) — geography tipi için Prisma.sql template'leri.

**Çıktı:** `pnpm db:migrate dev` çalışır, `pnpm db:seed` test verisi yazar, psql'de tablolar görünür.

---

## Gün 4 (Perşembe) — Fastify Server Skeleton ve Health Endpoint

**T-04.1:** Fastify server iskeleti.

> **Claude Code prompt:**
> "apps/api/src altında Fastify server kur. ARCHITECTURE.md § 2 klasör yapısına uy. Plugin'ler:
> - @fastify/helmet (security headers)
> - @fastify/cors (dev'de localhost:5173 izinli)
> - @fastify/rate-limit (Redis store)
> - @fastify/swagger + swagger-ui (OpenAPI auto-gen, /docs)
> - @fastify/sensible (HTTP error helpers)
> - Custom plugin: pino logger with request ID correlation
> - Custom plugin: Prisma client (decorator olarak)
> - Custom plugin: Redis client (decorator olarak)
>
> İlk modül: `modules/health` — GET /health endpoint'i, DB ve Redis check, response: { status, db, redis, version, uptime }. Server `tsx watch` ile dev mode."

**T-04.2:** Error handler middleware (RFC 7807 problem-details format).

**T-04.3:** Request lifecycle log (request_id, method, path, status, duration).

**Çıktı:** `curl localhost:4000/health` → `{ status: 'ok', db: 'ok', redis: 'ok' }`. `/docs` Swagger UI'da hello endpoint'i görünür.

---

## Gün 5 (Cuma) — Vite + React App Skeleton + Routing

**T-05.1:** Vite + React app iskeleti.

> **Claude Code prompt:**
> "apps/web altında React 18 + TypeScript + Vite app'i kur. Bağımlılıklar:
> - React Router v6 (route bazlı code splitting)
> - TanStack Query v5
> - Zustand
> - Tailwind CSS v3 + shadcn/ui kurulumu (init)
> - react-hook-form + zod + @hookform/resolvers
> - react-i18next + i18next
>
> Klasör yapısı ARCHITECTURE.md § 2'deki gibi. İlk feature'lar boş iskelet:
> - features/auth (Login sayfası placeholder)
> - features/map (Map placeholder)
>
> App shell: header (logo + user menu placeholder), main content, footer. Route'lar: `/login` (public), `/` (private — dummy auth guard).
>
> i18n: `tr.json` ile başla, tüm metinler key'li. shadcn/ui'dan Button, Input, Card komponentlerini ekle."

**T-05.2:** API client kurulumu — `lib/apiClient.ts`, base URL env'den, JWT interceptor placeholder, openapi-typescript ile types.

**T-05.3:** Tailwind tema — design token'ları placeholder, tasarımcıdan gelecek.

**Çıktı:** `pnpm dev` ile http://localhost:5173 açılır, login sayfası görünür, route guard test edilir (giriş yapmadan `/`a gidince login'e redirect).

---

## Hafta 1 sonu — Demo: Çalışan iskelet + Local stack

**Hafta sonu öncesi check:** Tüm ekip `git pull && pnpm install && pnpm docker:up && pnpm dev` ile 10 dakikada local'i ayağa kaldırabilir mi? README adımları test edilir.

---

## Gün 6 (Pazartesi) — CI/CD Pipeline

**T-06.1:** GitHub Actions workflow'ları.

> **Claude Code prompt:**
> "`.github/workflows/` altında şu workflow'ları oluştur:
> - `ci.yml`: PR'da çalışır. Job'lar: install (pnpm cache), lint, type-check, unit-test (Vitest), build, security-scan (npm audit + Semgrep). Matrix: Node 20.
> - `e2e.yml`: PR'da çalışır. Playwright E2E (Postgres + Redis services). Şimdilik sadece bir smoke test (login sayfası açılıyor).
> - `staging-deploy.yml`: main'e merge'te. Docker image build + push (GHCR), kubectl apply (veya placeholder ECS task update).
> - `release.yml`: tag push'ta (v*). Production deploy.
>
> Concurrency group ile aynı PR'ın eski run'larını cancel et. Tüm workflow'lar pnpm cache kullanmalı. Secret referansları (GITHUB_TOKEN, AWS_*, GHCR_TOKEN) placeholder."

**T-06.2:** Branch protection rules dokümante et (README'de) — main'e direct push yok, PR review gerekli, status check'ler zorunlu.

**T-06.3:** PR template (`.github/PULL_REQUEST_TEMPLATE.md`) — özet, değişiklikler, test edildi mi, screenshot, breaking change?

**Çıktı:** Test PR açılır, tüm CI yeşil yanar, merge sonrası staging deploy job'ı tetiklenir (placeholder olsa bile).

---

## Gün 7 (Salı) — Terraform IaC İskeleti

**T-07.1:** Terraform module'ları.

> **Claude Code prompt:**
> "infrastructure/terraform/ altında AWS için module'lar oluştur (eu-central-1 region):
> - modules/vpc: VPC, public + private subnet'ler, NAT gateway
> - modules/database: RDS PostgreSQL 15 (Multi-AZ false dev'de, true prod'da), parameter group ile PostGIS aktif
> - modules/cache: ElastiCache Redis 7
> - modules/storage: S3 bucket (versioning, encryption, lifecycle)
> - modules/compute: ECS Fargate cluster + service definitions (api, worker)
> - modules/ingress: ALB + target group + ACM certificate
>
> Environments:
> - environments/dev/main.tf — küçük instance'lar
> - environments/staging/main.tf
> - environments/prod/main.tf
>
> Backend S3 + DynamoDB lock. Variables tüm sensitive değerler için. Outputs: endpoint'ler. README'de `terraform init && plan && apply` adımları."

**T-07.2:** Cost estimate dokümanı (AWS Calculator çıktısı, dev/staging/prod için).

**T-07.3:** Disaster recovery plan taslağı (RTO 1 saat, RPO 15 dk, snapshot stratejisi).

**Çıktı:** `terraform plan` dev environment için clean (henüz apply etmiyoruz).

---

## Gün 8 (Çarşamba) — Observability Setup

**T-08.1:** Sentry entegrasyonu.

> **Claude Code prompt:**
> "Hem apps/web hem apps/api'ye Sentry SDK ekle. DSN env'den. apps/web'de @sentry/react + browser tracing. apps/api'de @sentry/node + @sentry/integrations (HTTP, Postgres). Source map upload script'i CI'a entegre. Environment ve release tag'i otomatik. Bir test error endpoint'i ekle (apps/api'de GET /debug/error) ve Sentry'de göründüğünü doğrula."

**T-08.2:** Pino structured logging (apps/api). Daha önce kuruldu — şimdi production formatı (JSON) ve correlation ID middleware ekle.

**T-08.3:** Prometheus metrics endpoint. apps/api'de `/metrics` (prom-client). HTTP request duration histogram, error counter.

**T-08.4:** Grafana dashboard JSON'ları (`infrastructure/grafana/`):
- system-health.json (CPU, memory, request rate, error rate)
- api-performance.json (per-endpoint latency P50/P95/P99)
- provider-costs.json (Sprint 2'den itibaren dolacak)

**Çıktı:** Sentry'de test hata kaydı görünür. `/metrics` Prometheus formatında metrik döndürür. Grafana'da dashboard'lar import edilebilir.

---

## Gün 9 (Perşembe) — Test Altyapısı + Storybook

**T-09.1:** Vitest setup.

> **Claude Code prompt:**
> "Vitest'i monorepo geneline kur. apps/api için Node environment, apps/web için jsdom. Testcontainers ile integration test setup (her test'te taze Postgres + Redis container, alternatif olarak setup-once strategy). Bir örnek test yaz:
> - apps/api: health endpoint integration test (gerçek DB hit)
> - apps/web: bir component test (Button render)
>
> Coverage threshold: backend %70, frontend %50 (sprint ilerledikçe yükseltilecek). CI'da coverage report yüklensin (Codecov)."

**T-09.2:** Playwright E2E setup.

> **Claude Code prompt:**
> "Playwright'i kur (apps/web'de). Smoke test: 'login sayfası açılır, başlık görünür'. baseURL env'den. CI'da Playwright service container'lar (Postgres, Redis, app) ile çalışsın. Trace + screenshot fail durumunda."

**T-09.3:** Storybook setup (packages/ui).

> **Claude Code prompt:**
> "packages/ui'da Storybook 8 kur. Tailwind config import. İlk story'ler: Button, Input, Card. Chromatic için CI workflow (.github/workflows/chromatic.yml). Visual regression için baseline build."

**Çıktı:** `pnpm test`, `pnpm test:e2e`, `pnpm storybook` üç komut çalışır.

---

## Gün 10 (Cuma) — Security Baseline + Sprint 0 Demo

**T-10.1:** Security tooling.

> **Claude Code prompt:**
> "Güvenlik baseline'ı kur:
> - `.semgrepignore` ve Semgrep CI step
> - Snyk action (Github Actions)
> - Dependency review action
> - SECURITY.md dosyası (vulnerability disclosure süreci)
> - Helmet config'i sıkılaştır (CSP whitelist Google Maps + Sentry için)
> - bcrypt yerine argon2id kullanılacağını dokümante et
> - Secret scan: gitleaks pre-commit hook"

**T-10.2:** ADR'ları yaz.

> **Claude Code prompt:**
> "docs/adr/ altında 5 ADR yaz (her biri 1-2 sayfa, MADR formatı):
> - ADR-001: Monorepo with Turborepo + pnpm
> - ADR-002: Fastify over Express
> - ADR-003: Prisma + raw SQL hybrid (PostGIS for location)
> - ADR-004: Multi-tenant via RLS (not separate DB per tenant)
> - ADR-005: Provider Abstraction Pattern for external services
>
> Her ADR şunları içersin: Bağlam, Karar, Alternatifler, Sonuçlar (artılar/eksiler)."

**T-10.3:** Onboarding dokümanı.

> **Claude Code prompt:**
> "docs/ONBOARDING.md dosyası yaz: yeni geliştirici ilk gün ne yapar, ne kurar, hangi okumaları yapar, nereden yardım ister. README'den daha detaylı, repo'da nereye baktığında ne bulacağı."

**T-10.4:** Sprint 0 demo + retro hazırlığı.

Demo gündemi: Repo gezisi (5dk). Local stack canlı çalıştırma (5dk). CI pipeline gösterimi (3dk). Storybook + Sentry + Grafana turu (5dk). Sprint 1 hazırlığı, riskler (5dk).

**Çıktı:** Sprint 0 ekibi tarafımızdan hazır kabul edilir. Sprint 1 planlama Pazartesi sabah başlar.

---

## Sprint 0 Definition of Done — Kontrol Listesi

**Repo & Build**
- [ ] Monorepo iskeleti (apps/web, apps/api, apps/worker, packages/shared, packages/ui, packages/config)
- [ ] Turborepo + pnpm workspaces çalışıyor
- [ ] TypeScript strict mode tüm paketlerde
- [ ] ESLint + Prettier + Husky pre-commit
- [ ] `pnpm dev` ile tüm app'ler paralel çalışıyor

**Local Dev Stack**
- [ ] Docker Compose: Postgres + PostGIS + Redis + MinIO + Mailhog
- [ ] `pnpm docker:up` tek komut
- [ ] Yeni geliştirici 10 dakikada local'i ayağa kaldırabiliyor

**Database**
- [ ] Prisma kurulu, ilk 3 model migrate edilmiş
- [ ] PostGIS extension aktif
- [ ] RLS policy'leri Tenant/User/Branch için yazılmış
- [ ] Seed script demo verisi yazıyor

**Backend Skeleton**
- [ ] Fastify server, plugin'ler, /health, /docs (Swagger UI)
- [ ] Pino logger + correlation ID
- [ ] Error handler RFC 7807 formatında
- [ ] Test endpoint'i Sentry'ye hata düşürüyor

**Frontend Skeleton**
- [ ] React + Vite + Tailwind + shadcn/ui kurulu
- [ ] Router çalışıyor, /login + / route'ları, route guard placeholder
- [ ] TanStack Query + Zustand + react-i18next entegre
- [ ] API client (typed) iskelet

**CI/CD**
- [ ] GitHub Actions: ci.yml, e2e.yml, staging-deploy.yml, release.yml
- [ ] Test PR yeşil yanıyor
- [ ] Staging deploy script (placeholder bile olsa) çalışıyor

**Infrastructure**
- [ ] Terraform module'ları (VPC, RDS, Redis, S3, ECS, ALB)
- [ ] dev/staging/prod environment ayrımı
- [ ] State backend (S3 + DynamoDB)
- [ ] Cost estimate dokümante

**Observability**
- [ ] Sentry frontend + backend
- [ ] Prometheus /metrics endpoint
- [ ] Grafana dashboard JSON'ları (system, api, costs)
- [ ] Pino structured log

**Test**
- [ ] Vitest unit test çalışıyor
- [ ] Testcontainers integration test örneği
- [ ] Playwright E2E smoke test
- [ ] Coverage threshold CI'da (backend %70, frontend %50)
- [ ] Storybook + Chromatic baseline

**Security**
- [ ] Helmet + CSP
- [ ] Semgrep + Snyk + npm audit CI step'leri
- [ ] gitleaks pre-commit
- [ ] SECURITY.md

**Dokümantasyon**
- [ ] README.md (quick start)
- [ ] CLAUDE.md (Claude Code rehberi)
- [ ] ONBOARDING.md (yeni geliştirici)
- [ ] 5 ADR yazılmış
- [ ] PR template

**Pre-Sprint kontrolleri**
- [ ] Cloud hesabı (AWS veya GCP) onaylandı, kullanıcılar oluşturuldu
- [ ] Google Cloud projesi açıldı, Places API + Maps SDK enable, billing alarm
- [ ] Domain + SSL sertifikası
- [ ] Sentry, Datadog, LaunchDarkly hesapları aktif
- [ ] Anthropic API key
- [ ] MERSİS sözleşme süreci başladı
- [ ] KVKK aydınlatma metni hukuk ekibinde
- [ ] Figma workspace + ilk wireframe'ler

---

## Sprint 0 Sonu Demo Akışı (45 dakika)

(0:00) Açılış — Sprint 0 hedefleri, neyi neden yaptık. (5:00) Repo turu — klasör yapısı, monorepo, paylaşılan paketler. (10:00) Canlı kurulum — yeni laptop'ta `git clone → pnpm install → docker compose up → pnpm dev`, 10 dakika geri sayım. (20:00) Database + Migration — Prisma Studio ile şema, seed verisi, RLS test. (25:00) CI/CD — örnek PR'da pipeline akışı. (30:00) Observability — Sentry'ye hata düşür, Grafana dashboard'da requests/sec gözle. (35:00) Storybook — UI komponent kütüphanesi turu. (38:00) Pre-sprint check — cloud, Google API, MERSİS, KVKK durumu. (42:00) Sprint 1'e hazırız mı? Riskler, blocker'lar. (45:00) Kapanış.

---

## Sprint 0 → Sprint 1 Hand-off

Sprint 0 retro çıktısı + hazır olmayan kalemler Sprint 1 backlog'una eklenir veya parking lot'a taşınır. Ekip Sprint 1 planlama sabahı (Pazartesi 09:30) toplanır, ilk story'leri çekmeye başlar.

Sprint 1 ilk story (US-1.1, "Admin tenant oluşturma") için Claude Code prompt taslağı:

> "ARCHITECTURE.md § 4'teki Tenant ve User modellerini referans alarak, super-admin rolünün yeni tenant + admin user oluşturabildiği akışı implement et: Prisma migration (gerekirse genişlet), `apps/api/src/modules/tenants/` altında service + repository + routes (POST /api/v1/admin/tenants), Zod request/response schema, audit log entry, integration test (Testcontainers ile gerçek DB). Frontend tarafında `features/admin/CreateTenant.tsx` formu, react-hook-form + zod, başarılı oluşturmada davet email'i gönderme (placeholder, henüz email service yok). PR'da AC kontrol listesini yorum olarak yaz."

---

*Bu dokümanın amacı her sabah ekipten birinin "bugün ne yapacağız?" sorusuna 10 saniyede cevap verebilmektir. Sprint sonunda update edilir.*
