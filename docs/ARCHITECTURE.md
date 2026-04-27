# BranchScout — Teknik Mimari

**Versiyon:** 1.0
**Tarih:** 24 Nisan 2026
**Bağlı Dokümanlar:** [PRD.md](PRD.md), [SPRINT_PLAN.md](SPRINT_PLAN.md)
**Hedef:** Geliştirici ve Claude Code için "bu sistemin nasıl inşa edileceğini" anlatan referans.

---

## 1. Mimari Prensipler

**Monorepo, paylaşımlı tipler.** Frontend ve backend aynı kod tabanında, paylaşılan TypeScript tipleri ile. API kontratı tek kaynak (OpenAPI + Zod) — frontend ondan client otomatik üretir.

**Domain-Driven, hafif.** Kod modülleri iş alanlarına göre (auth, places, visits, routes, pipeline, reports). Anemic data model değil; iş kuralları service katmanında.

**Provider abstraction zorunluluk.** Her dış servis (Google Places, MERSİS, News, LLM) `Provider` interface'i arkasındadır. Test'lerde mock, production'da gerçek implementasyon. Provider değişimi tek konfigürasyonla yapılır.

**Multi-tenant by default.** Her tablo `tenant_id` taşır. Postgres Row-Level Security (RLS) zorunlu. Tüm sorgular bağlamından `tenant_id` alır; uygulama kodunda `WHERE tenant_id = ?` yazılması gerekmez.

**Event-driven side effects.** "Firma keşfedildi" gibi olaylar event olarak yayılır; enrichment, notification, analytics gibi side effect'ler abone olur. Senkron API yanıtı kısa kalır.

**Cost-aware her API çağrısı.** Her dış servis çağrısı tek bir cost-tracking middleware'den geçer; firma başı, kullanıcı başı, tenant başı maliyet izlenir.

**Optimistic UI, pessimistic data.** Kullanıcı işlemleri anında UI'da gözükür; backend hata verirse rollback. Veri tutarlılığı her zaman backend kontrol eder.

---

## 2. Repo Yapısı (Monorepo)

```
branchscout/
├── apps/
│   ├── web/                       # React + Vite + TypeScript (frontend)
│   │   ├── src/
│   │   │   ├── app/               # routing, app shell
│   │   │   ├── features/          # feature-based slices
│   │   │   │   ├── auth/
│   │   │   │   ├── map/
│   │   │   │   ├── places/
│   │   │   │   ├── visits/
│   │   │   │   ├── routes/
│   │   │   │   ├── pipeline/
│   │   │   │   └── reports/
│   │   │   ├── components/        # shared ui (shadcn-based)
│   │   │   ├── hooks/
│   │   │   ├── lib/               # api client, auth helpers
│   │   │   └── styles/
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── api/                       # Node.js + Fastify + TypeScript (backend)
│   │   ├── src/
│   │   │   ├── modules/           # domain modules
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.repository.ts
│   │   │   │   │   └── auth.schema.ts (zod)
│   │   │   │   ├── tenants/
│   │   │   │   ├── places/
│   │   │   │   ├── visits/
│   │   │   │   ├── routes/
│   │   │   │   ├── pipeline/
│   │   │   │   └── reports/
│   │   │   ├── providers/         # external service adapters
│   │   │   │   ├── places/
│   │   │   │   │   ├── PlacesProvider.ts (interface)
│   │   │   │   │   └── GooglePlacesProvider.ts
│   │   │   │   ├── mersis/
│   │   │   │   ├── news/
│   │   │   │   └── llm/
│   │   │   ├── infrastructure/
│   │   │   │   ├── db/            # prisma client, migrations
│   │   │   │   ├── cache/         # redis client
│   │   │   │   ├── queue/         # bullmq
│   │   │   │   ├── events/        # event bus
│   │   │   │   └── observability/ # sentry, logger, metrics
│   │   │   ├── middleware/        # auth, tenant, rate-limit, error
│   │   │   ├── plugins/           # fastify plugins
│   │   │   ├── server.ts
│   │   │   └── index.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   └── worker/                    # background job runner (BullMQ consumer)
│       ├── src/
│       │   ├── jobs/
│       │   │   ├── enrichWebsite.ts
│       │   │   ├── enrichMersis.ts
│       │   │   ├── enrichNews.ts
│       │   │   ├── photoMirror.ts
│       │   │   ├── leadScoring.ts
│       │   │   └── weeklyReport.ts
│       │   └── index.ts
│       └── package.json
│
├── packages/
│   ├── shared/                    # types & contracts shared between web/api
│   │   ├── src/
│   │   │   ├── api-contracts/     # OpenAPI-generated types + zod
│   │   │   ├── domain/            # Place, Visit, Route, ... types
│   │   │   └── constants/
│   │   └── package.json
│   │
│   ├── ui/                        # shadcn/ui primitive komponentler
│   │   └── src/
│   │
│   └── config/                    # tsconfig, eslint, prettier base
│
├── infrastructure/
│   ├── terraform/                 # IaC: AWS/GCP modules
│   ├── docker/                    # docker-compose dev, Dockerfile prod
│   └── k8s/                       # helm charts (prod)
│
├── docs/
│   ├── adr/                       # Architecture Decision Records
│   ├── runbooks/
│   └── api/                       # OpenAPI specs
│
├── scripts/                       # dev tools, seed scripts
├── .github/workflows/             # CI/CD
├── turbo.json                     # Turborepo config
├── pnpm-workspace.yaml
├── package.json
├── README.md
└── CLAUDE.md                      # Claude Code rehberi
```

**Build sistemi:** Turborepo + pnpm workspaces. Cache'li build, paralel test, paylaşılan deps.

---

## 3. Teknoloji Seçimleri ve Gerekçeleri

### 3.1 Frontend

**React 18 + TypeScript:** Banka iç ekiplerinde yaygın, geniş ekosistem. **Vite:** Hızlı dev experience, esbuild + Rollup. **TailwindCSS + shadcn/ui:** Hızlı, tutarlı, design token'larla ölçeklenebilir; banka brand kit'ine uyarlanabilir. **TanStack Query:** Sunucu state, otomatik cache, retry, optimistic update. **Zustand:** Client state (filtreler, UI toggles). **React Router v6:** Route bazlı code splitting. **react-hook-form + Zod:** Form yönetimi + tip-güvenli validation; aynı Zod schema backend'le paylaşılır. **Google Maps JavaScript SDK:** Resmi SDK, AdvancedMarkerElement (yeni API). **react-i18next:** i18n altyapısı (TR ana, EN ileride).

### 3.2 Backend

**Node.js 20 LTS + Fastify:** Express'ten daha hızlı, plugin mimarisi temiz, OpenAPI auto-gen iyi. **TypeScript strict mode:** Hata yüzeyini azaltır, refactoring güvenli. **Prisma ORM:** Tip-güvenli, migration güçlü, PostGIS için raw query desteği var. **Zod:** Request validation + paylaşılan tipler. **BullMQ:** Redis tabanlı job queue, retry, scheduled jobs, monitoring. **Pino:** Hızlı, structured logger, Datadog/ELK uyumlu.

### 3.3 Veritabanı ve Cache

**PostgreSQL 15 + PostGIS:** Coğrafi sorgular (`ST_DWithin`, `ST_Contains`, `geohash`), GiST index. **Redis 7:** Cache (Place Details), session blacklist, rate limit, BullMQ broker. **S3 (veya MinIO dev):** Foto, kartvizit, audio kayıtları. **OpenSearch/Meilisearch (S12+):** Firma serbest metin arama (sprint 12'de raporlama için).

### 3.4 DevOps

**Docker + Docker Compose (dev):** Tek komut ile tam stack. **Kubernetes (prod) + Helm:** Banka mevcut infra'sı varsa onu kullan; yoksa AWS ECS + Fargate alternatif. **Terraform:** IaC tüm cloud kaynakları için. **GitHub Actions (veya GitLab CI):** Lint, test, build, security scan, deploy. **Sentry:** Frontend + backend hata izleme. **Datadog veya Grafana + Prometheus + Loki:** APM, metrik, log. **LaunchDarkly veya Unleash:** Feature flag.

### 3.5 Test ve Kalite

**Vitest:** Unit + integration test (jsdom + Node). **Playwright:** E2E. **Testcontainers:** Integration test için gerçek Postgres + Redis. **Storybook:** UI komponent kütüphanesi + visual regression (Chromatic). **k6:** Yük testi. **Semgrep + Snyk + npm audit:** Güvenlik tarama. **axe-core:** A11y test.

---

## 4. Veri Modeli (Prisma Schema — Özet)

```prisma
// schema.prisma — özet, ilk 5 sprint için yeterli

generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql" url = env("DATABASE_URL") }

model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  users     User[]
  branches  Branch[]
  companies Company[]
}

model User {
  id           String    @id @default(cuid())
  tenantId     String
  email        String
  passwordHash String
  totpSecret   String?
  name         String
  role         Role      // ADMIN, REGION_MANAGER, BRANCH_MANAGER, ANALYST
  branchId     String?
  regionId     String?
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  tenant       Tenant    @relation(fields: [tenantId], references: [id])
  branch       Branch?   @relation(fields: [branchId], references: [id])
  visits       Visit[]
  visitLists   VisitList[]
  notes        CompanyNote[]

  @@unique([tenantId, email])
  @@index([tenantId])
}

enum Role { ADMIN REGION_MANAGER BRANCH_MANAGER ANALYST }

model Region {
  id       String   @id @default(cuid())
  tenantId String
  name     String
  branches Branch[]
}

model Branch {
  id                String  @id @default(cuid())
  tenantId          String
  regionId          String?
  code              String
  name              String
  address           String
  // PostGIS GEOGRAPHY(Point) - Prisma'da Unsupported, raw SQL ile
  // location        Unsupported("geography(Point,4326)")
  catchmentPolygon  Json?   // GeoJSON Polygon
  createdAt         DateTime @default(now())
  tenant            Tenant @relation(fields: [tenantId], references: [id])
  region            Region? @relation(fields: [regionId], references: [id])
  users             User[]

  @@unique([tenantId, code])
}

model Company {
  id                  String   @id @default(cuid())
  tenantId            String
  googlePlaceId       String   @unique
  name                String
  formattedAddress    String?
  // location          geography(Point,4326)  -- raw SQL
  phone               String?
  website             String?
  category            String?  // primary type from places API
  types               String[] // all types
  googleRating        Float?
  googleReviewCount   Int?
  photosJson          Json?    // [{ url, attributions, ... }]
  openingHoursJson    Json?
  // Enrichment alanları (Sprint 5+)
  websiteSummaryText  String?
  websiteSummaryJson  Json?
  // Sprint 6 — MERSİS
  mersisNo            String?
  vergiNo             String?
  ticariUnvan         String?
  sermaye             Decimal? @db.Decimal(18,2)
  kurulusTarihi       DateTime?
  naceKodu            String?
  ortaklarJson        Json?
  // Sprint 7 — News
  newsMentionsJson    Json?    // [{ title, source, date, url, sentiment, summary }]
  // Sprint 13 — Lead Score
  leadScore           Int?
  leadScoreBreakdown  Json?
  lastEnrichedAt      DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  tenant              Tenant @relation(fields: [tenantId], references: [id])
  visits              Visit[]
  notes               CompanyNote[]
  tags                CompanyTag[]
  visitListItems      VisitListItem[]
  pipelineEvents      PipelineEvent[]

  @@index([tenantId])
  // PostGIS index raw SQL ile: CREATE INDEX ON companies USING GIST (location);
}

model Tag {
  id        String      @id @default(cuid())
  tenantId  String
  name      String
  color     String       // hex
  createdAt DateTime    @default(now())
  companies CompanyTag[]

  @@unique([tenantId, name])
}

model CompanyTag {
  companyId String
  tagId     String
  addedById String
  addedAt   DateTime @default(now())
  company   Company  @relation(fields: [companyId], references: [id])
  tag       Tag      @relation(fields: [tagId], references: [id])

  @@id([companyId, tagId])
}

model CompanyNote {
  id        String   @id @default(cuid())
  companyId String
  userId    String
  body      String   // markdown
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  company   Company @relation(fields: [companyId], references: [id])
  user      User    @relation(fields: [userId], references: [id])
}

model VisitList {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  name      String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  items     VisitListItem[]
  routes    Route[]
}

model VisitListItem {
  id           String    @id @default(cuid())
  visitListId  String
  companyId    String
  addedAt      DateTime  @default(now())
  visitList    VisitList @relation(fields: [visitListId], references: [id])
  company      Company   @relation(fields: [companyId], references: [id])

  @@unique([visitListId, companyId])
}

model Route {
  id              String       @id @default(cuid())
  tenantId        String
  userId          String
  visitListId     String?
  date            DateTime
  startsAt        DateTime
  totalDistanceM  Int?
  totalDurationS  Int?
  status          RouteStatus  @default(PLANNED)
  createdAt       DateTime     @default(now())
  visitList       VisitList?   @relation(fields: [visitListId], references: [id])
  stops           RouteStop[]
}

enum RouteStatus { PLANNED IN_PROGRESS COMPLETED CANCELLED }

model RouteStop {
  id                String   @id @default(cuid())
  routeId           String
  companyId         String
  orderIndex        Int
  plannedStartTime  DateTime
  plannedDurationM  Int      @default(45)
  visit             Visit?
  route             Route    @relation(fields: [routeId], references: [id])

  @@unique([routeId, orderIndex])
}

model Visit {
  id                  String         @id @default(cuid())
  tenantId            String
  routeStopId         String?        @unique
  companyId           String
  userId              String
  visitedAt           DateTime
  contactPersonName   String?
  contactPersonRole   String?
  notes               String?
  interestedProducts  String[]
  outcome             VisitOutcome
  followUpDate        DateTime?
  audioTranscript     String?
  photosJson          Json?
  geoVerified         Boolean        @default(false)
  routeStop           RouteStop?     @relation(fields: [routeStopId], references: [id])
  company             Company        @relation(fields: [companyId], references: [id])
  user                User           @relation(fields: [userId], references: [id])
  createdAt           DateTime       @default(now())
}

enum VisitOutcome { INTERESTED MAYBE NOT_INTERESTED NO_CONTACT }

model PipelineEvent {
  id         String   @id @default(cuid())
  tenantId   String
  companyId  String
  userId     String
  fromStage  PipelineStage?
  toStage    PipelineStage
  note       String?
  createdAt  DateTime @default(now())
  company    Company  @relation(fields: [companyId], references: [id])
}

enum PipelineStage { DISCOVERY CONTACTED MEETING PROPOSAL WON LOST }

model AuditLog {
  id           String   @id @default(cuid())
  tenantId     String
  userId       String?
  action       String
  resourceType String
  resourceId   String?
  ip           String?
  userAgent    String?
  metadata     Json?
  createdAt    DateTime @default(now())

  @@index([tenantId, createdAt])
  @@index([userId, createdAt])
}

model ApiCostEvent {
  id          String   @id @default(cuid())
  tenantId    String?
  userId      String?
  provider    String   // "google_places", "claude", "serpapi", ...
  endpoint    String   // "nearby_search", "place_details", ...
  costUsd     Decimal  @db.Decimal(12,6)
  metadata    Json?
  createdAt   DateTime @default(now())

  @@index([tenantId, createdAt])
  @@index([provider, createdAt])
}
```

**RLS migration örneği (raw SQL):**
```sql
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON companies
  USING (tenant_id = current_setting('app.current_tenant')::text);
```

Connection-level olarak `SET app.current_tenant = '...'` her request'te middleware tarafından setlenir.

---

## 5. API Tasarımı (OpenAPI)

API kontratı tek kaynak: `docs/api/openapi.yaml`. Backend'de Fastify zod schema'larından OpenAPI auto-gen edilir; frontend'de `openapi-typescript` ile typed client üretilir.

**Convention'lar:**
- Versioning: URL path `/api/v1/...`. Major version değişikliklerinde v2.
- Auth: JWT Bearer token, `Authorization: Bearer <token>` header.
- Tenant context: token içinde `tenant_id` claim'i; ayrıca custom header değil.
- Pagination: cursor-based (`cursor`, `limit` query params), response'da `next_cursor`.
- Error format: RFC 7807 problem-details (`{ type, title, status, detail, instance, errors[] }`).
- Response envelope: `{ data, meta: { request_id, timestamp } }`.
- Idempotency: `POST` mutating endpoint'lerde `Idempotency-Key` header opsiyonel destek.

**Önemli endpoint'ler (özet — full spec OpenAPI'de):**

```
# Auth
POST   /api/v1/auth/login                  → { accessToken, refreshToken }
POST   /api/v1/auth/refresh                → { accessToken }
POST   /api/v1/auth/logout                 → 204
GET    /api/v1/auth/me                     → User
POST   /api/v1/auth/setup-totp             → { qrCode, recoveryCodes }
POST   /api/v1/auth/verify-totp            → 200
POST   /api/v1/invitations/accept          → User

# Tenants & Users (admin)
POST   /api/v1/admin/tenants               → Tenant
POST   /api/v1/admin/users/invite          → Invitation
GET    /api/v1/admin/users                 → User[]
GET    /api/v1/admin/branches              → Branch[]
POST   /api/v1/admin/branches              → Branch

# Places (search & details)
POST   /api/v1/places/search/nearby        → { places: PlaceSummary[], nextCursor? }
POST   /api/v1/places/search/polygon       → { places: PlaceSummary[] }
GET    /api/v1/places/:placeId             → PlaceDetail
POST   /api/v1/places/:placeId/refresh     → PlaceDetail

# Saved searches
GET    /api/v1/saved-searches              → SavedSearch[]
POST   /api/v1/saved-searches              → SavedSearch

# Tags & Notes
GET    /api/v1/tags                        → Tag[]
POST   /api/v1/companies/:id/tags          → CompanyTag
POST   /api/v1/companies/:id/notes         → CompanyNote
GET    /api/v1/companies/:id/notes         → CompanyNote[]

# Enrichment (sprint 5-7)
POST   /api/v1/companies/:id/enrich/website   → 202 (job queued)
POST   /api/v1/companies/:id/enrich/mersis    → 202
POST   /api/v1/companies/:id/enrich/news      → 202
GET    /api/v1/companies/:id/enrichment-status → { website, mersis, news }

# Visit Lists
GET    /api/v1/visit-lists                 → VisitList[]
POST   /api/v1/visit-lists                 → VisitList
POST   /api/v1/visit-lists/:id/items       → VisitListItem
DELETE /api/v1/visit-lists/:id/items/:itemId → 204
POST   /api/v1/visit-lists/:id/share       → VisitListShare

# Routes
POST   /api/v1/routes/optimize             → Route
GET    /api/v1/routes/:id                  → Route
GET    /api/v1/routes/:id/export.ics       → ICS file
PATCH  /api/v1/routes/:id/stops/:stopId    → RouteStop (manuel sıralama)

# Visits
POST   /api/v1/visits                      → Visit
PATCH  /api/v1/visits/:id                  → Visit
GET    /api/v1/visits                      → Visit[] (filtre)
POST   /api/v1/visits/:id/photos           → multipart upload
POST   /api/v1/visits/:id/audio            → multipart upload (Whisper auto-trigger)

# Pipeline
GET    /api/v1/pipeline                    → CompanyByStage[]
PATCH  /api/v1/pipeline/:companyId/stage   → PipelineEvent

# Reports
GET    /api/v1/reports/branch/:id/weekly   → BranchReport
GET    /api/v1/reports/region/:id/summary  → RegionReport
GET    /api/v1/reports/exports/excel       → xlsx file

# Recommendations (Sprint 13)
GET    /api/v1/recommendations             → RecommendedCompany[]
GET    /api/v1/companies/:id/approach-strategy → { strategy: string }
```

---

## 6. Provider Interfaces

```typescript
// packages/shared/src/providers/places.ts
export interface PlacesProvider {
  searchNearby(params: NearbySearchParams): Promise<PlaceSummary[]>;
  searchInPolygon(polygon: GeoJSON.Polygon, filters: PlaceFilters): Promise<PlaceSummary[]>;
  getDetails(placeId: string, fields: PlaceField[]): Promise<PlaceDetail>;
  getPhoto(photoRef: string, maxWidth: number): Promise<{ url: string; expiresAt: Date }>;
}

// packages/shared/src/providers/mersis.ts
export interface MersisProvider {
  search(query: { name?: string; vergiNo?: string; mersisNo?: string }): Promise<MersisCandidate[]>;
  getRecord(mersisNo: string): Promise<MersisRecord>;
}

// packages/shared/src/providers/news.ts
export interface NewsProvider {
  search(query: string, opts: { from?: Date; to?: Date; limit?: number }): Promise<NewsItem[]>;
}

// packages/shared/src/providers/llm.ts
export interface LLMProvider {
  summarize(text: string, schema: ZodSchema): Promise<unknown>;
  generateApproach(company: Company): Promise<string>;
}

// packages/shared/src/providers/transcription.ts
export interface TranscriptionProvider {
  transcribe(audio: Buffer, language: string): Promise<{ text: string; confidence: number }>;
}
```

Her provider için `XxxProvider` interface + `ConcreteXxxProvider` (örn. `GooglePlacesProvider`, `AnthropicLLMProvider`) + test'lerde `InMemoryXxxProvider` mock.

---

## 7. Request Lifecycle (Tipik Bir Çağrı)

Bir kullanıcının bir firma kartına tıkladığı durum:

```
[Browser]
   └─► GET /api/v1/places/{placeId}
       │
       ▼
[NGINX] (TLS, rate limit IP başı, request id ekle)
   │
   ▼
[Fastify auth middleware]
   ├─ JWT decode → user_id, tenant_id
   ├─ JWT blacklist check (Redis)
   └─ Postgres connection'a SET app.current_tenant
       │
       ▼
[Tenant middleware]
   └─ RLS context kuruldu, tüm sonraki sorgular tenant_id-filtreli
       │
       ▼
[Cost middleware]
   └─ Provider çağrısı olacaksa kontrol et (rate limit user başı)
       │
       ▼
[places.controller.getDetail]
   ├─ Postgres'te company var mı?
   │   ├─ EVET ve last_enriched_at < 30 gün
   │   │   └─► dön (DB hit, 50ms)
   │   └─ HAYIR veya stale
   │       ├─ Redis cache check (place_details:{placeId})
   │       │   ├─ HIT → companies tablosuna upsert + dön (200ms)
   │       │   └─ MISS
   │       │       └─ GooglePlacesProvider.getDetails(placeId, fields)
   │       │           ├─ Cost event: places.api.cost(0.017 USD)
   │       │           ├─ Redis'e yaz (TTL 30 gün)
   │       │           ├─ Postgres'e upsert
   │       │           └─ dön (1.5s)
   │       │
   │       └─ Event yayınla: "company.discovered" (BullMQ)
   │           ├─► enrichWebsite job (varsa websiteUri)
   │           ├─► enrichMersis job (otomatik flag açıksa)
   │           └─► enrichNews job
   │
   ▼
[Response]
   ├─ Audit log: "view_company"
   └─ JSON envelope: { data: PlaceDetail, meta: {...} }
```

---

## 8. Event ve Background Job'lar

**Event'ler (Redis Streams + BullMQ):**

| Event | Üretici | Tüketici | Aksiyon |
|-------|---------|----------|---------|
| `company.discovered` | places.service | enrichment workers | website/mersis/news enrichment |
| `company.enriched` | enrichment workers | scoring worker | lead score güncelle |
| `visit.created` | visits.service | pipeline auto-advance | pipeline aşamasını "İletişim"e taşı |
| `pipeline.stage_changed` | pipeline.service | scoring worker, audit | skor + audit |
| `route.created` | routes.service | calendar worker | iCal generate |
| `weekly.summary.tick` | scheduler | report worker | her cumartesi sabah |

**Scheduled Jobs (BullMQ repeatable):**

- `tbb-bddk-import` — aylık 1.gün 03:00, sektör verisi ETL
- `lead-scoring-rebuild` — her gece 02:00
- `weekly-report-generation` — her Cumartesi 06:00
- `stale-pipeline-check` — her gün 08:00, 14+ gün sıkışan firma uyarısı
- `photo-mirror` — saatlik, expired Google Photo URL'lerini yenile
- `cost-budget-check` — saatlik, aylık bütçe %80'e yaklaşıyorsa alert

---

## 9. Güvenlik Mimarisi

**Authentication:** JWT (RS256, 15dk access + 7gün refresh), refresh rotation (her refresh yeni token), refresh token Redis'te hash'li, logout'ta blacklist.

**Authorization:** RBAC + RLS. Her endpoint'te middleware role kontrolü (`requireRole('ADMIN')`); her DB sorgusu RLS ile tenant izolasyonu.

**Input Validation:** Tüm input Zod ile validate. SQL injection: Prisma parametreli; raw SQL'lerde `Prisma.sql` template literals.

**Output Encoding:** React JSX otomatik escape; markdown render'da DOMPurify.

**Headers:** Helmet middleware — CSP, HSTS, X-Frame-Options, X-Content-Type-Options.

**Rate Limiting:** IP bazlı (NGINX), user bazlı (Redis token bucket), provider bazlı (Google API quota guard).

**Secrets:** AWS Secrets Manager veya HashiCorp Vault. Asla repo'da, `.env` sadece dev.

**Audit Log:** Login, view_company, export, role_change, invitation, settings_change. KVKK gereği 5 yıl saklanır.

**KVKK / Privacy:** Veri minimizasyonu (sadece gerekli field'lar), kullanıcı silme hakkı (soft delete + 30 gün sonra hard delete), data export endpoint'i, processing record'u.

**Vulnerability Scanning:** Her PR'da Snyk + Semgrep + npm audit. Sprint 15'te 3. parti pen test.

---

## 10. Observability

**Logging:** Pino, JSON structured, request_id correlation. Log seviyesi: prod INFO, staging DEBUG.

**Metrics (Prometheus formatında):** HTTP request latency, error rate (per endpoint), DB query duration, cache hit ratio, provider API call count + cost, queue depth, job duration.

**Tracing:** OpenTelemetry SDK, Jaeger veya Datadog APM backend.

**Error Tracking:** Sentry (frontend + backend), source map upload CI'da otomatik.

**Dashboards:** Grafana — System Health, API Performance, Provider Costs, User Activity, Business KPIs.

**Alerting:** PagerDuty entegrasyonu — P0 (sistem down), P1 (error rate > 1%), P2 (latency P95 > 2s 5dk), P3 (bütçe %80).

**SLO'lar:** Availability 99.9% (aylık), API P95 < 1s, Map first-paint < 2s.

---

## 11. CI/CD Pipeline

```
[git push] → [PR open]
   ├─► Lint (eslint, prettier)
   ├─► Type check (tsc)
   ├─► Unit + Integration test (Vitest, testcontainers)
   ├─► E2E test (Playwright headless, gerekli sayfalarda)
   ├─► Storybook visual regression (Chromatic)
   ├─► Security scan (Semgrep, npm audit, Snyk)
   ├─► Bundle size check (size-limit)
   └─► Build (Docker images)

[PR merge to main] → [staging deploy]
   ├─► Docker push (ECR/GCR)
   ├─► Helm upgrade (k8s)
   ├─► Run migrations
   ├─► Smoke test (curl /health, basic E2E)
   └─► Slack notify

[Release tag (v1.x.x)] → [prod deploy]
   ├─► Blue-green deploy (ArgoCD)
   ├─► Canary (5% traffic 10dk → 50% → 100%)
   ├─► Rollback otomatik (error rate %1 üzeri)
   └─► PagerDuty silent ön notify
```

---

## 12. Local Development Akışı

İlk kurulum:
```bash
git clone ...
cd branchscout
pnpm install
cp .env.example .env  # dev secrets fill
docker compose up -d  # postgres, redis, minio
pnpm db:migrate
pnpm db:seed
pnpm dev              # tüm app'ler paralel
```

`pnpm dev` Turbo ile şunları çalıştırır:
- `apps/web` Vite dev server (port 5173)
- `apps/api` Fastify dev mode (port 4000, tsx watch)
- `apps/worker` BullMQ dev mode

Test:
```bash
pnpm test               # unit + integration
pnpm test:e2e           # Playwright
pnpm storybook          # UI
```

---

## 13. Mimari Karar Kayıtları (ADR — İlk 5)

ADR'lar `docs/adr/` altında. Her büyük teknik karar için ADR yazılır. İlk 5 öneri:

**ADR-001: Monorepo with Turborepo + pnpm.** Karar gerekçesi, alternatifler (multirepo, Lerna, Nx), trade-off'lar.

**ADR-002: Fastify over Express.** Performans, plugin sistemi, OpenAPI auto-gen.

**ADR-003: Prisma + raw SQL hybrid (PostGIS için).** Tip güvenliği vs PostGIS gücü.

**ADR-004: Multi-tenant via RLS (not separate DB per tenant).** Performans, izolasyon, ops kolaylığı dengesi.

**ADR-005: Provider Abstraction Pattern.** Test'lenebilirlik, geleceğe yön bağımlılığı azaltma.

Sonraki ADR'lar sprint ilerledikçe yazılır (state management, deployment topology, vs).

---

## 14. Claude Code Çalışma Rehberi (CLAUDE.md taslağı)

Repo köküne konacak `CLAUDE.md` dosyası Claude Code'a aşağıdaki bağlamı verir:

Proje BranchScout — multi-tenant SaaS, banka şube müdürü saha keşif/ziyaret uygulaması. Stack: Turborepo + pnpm, Vite + React + TS frontend, Fastify + Prisma backend, Postgres + PostGIS + Redis + S3, BullMQ jobs.

Kod stili: TypeScript strict, named exports tercih, default export sadece React component'lerde. ESLint + Prettier zorunlu. Klasör yapısı feature-based.

Test: Vitest unit (backend modules + frontend hooks), Playwright E2E. TDD önerilir ama zorunlu değil; her PR test içermeli.

Veri tabanı: Prisma schema her zaman `apps/api/prisma/schema.prisma`. Migration'lar `pnpm db:migrate dev`. PostGIS query'leri için `Prisma.sql` raw template kullan.

API kontratı: `docs/api/openapi.yaml` tek kaynak. Endpoint eklerken önce zod schema, sonra route, sonra OpenAPI auto-gen.

Provider'lar: dış servis çağrısı eklerken provider interface yaz, `Concrete...Provider` implementasyonu ayrı dosya, test'te mock yaz.

Multi-tenant: tüm yeni tablolarda `tenantId` kolonu zorunlu, RLS policy migration'da yazılır.

Cost tracking: dış API çağrılarında her zaman `costMiddleware` kullan; her çağrı `ApiCostEvent` kaydı bırakmalı.

Commit mesajları: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`). PR'da issue link.

Sprint planı `SPRINT_PLAN.md`'de — Claude Code, ilgili sprint'in user story'lerini ve acceptance criteria'larını görerek çalışır.

---

*Bu doküman canlıdır; her major kararla güncellenir. Mimari değişiklikler ADR ile kayıt altına alınır.*
