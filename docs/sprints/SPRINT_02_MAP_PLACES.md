# Sprint 2 — Harita Çekirdeği ve Google Places Entegrasyonu

**Süre:** 2 hafta · **Önkoşul:** Sprint 1 tamam · **Bağlı:** PRD § 5.2, § 7.4, ARCHITECTURE § 6, ADR-005

## Hedef

Şube müdürü giriş yapınca kendi şubesinin haritasını görür, etrafında "yarıçap seç → firmaları haritada pin olarak gör" akışı çalışır. Tüm Places çağrıları cache'lenir, cost tracking aktif, aynı bölge tekrar sorgulandığında API çağrılmaz.

## Önkoşul Kontrol

- [ ] Sprint 1 auth + RLS yeşil
- [ ] Google Cloud projesi + Places API (New) + Maps JavaScript SDK enable
- [ ] `GOOGLE_MAPS_API_KEY` (server) + `VITE_GOOGLE_MAPS_API_KEY` (client) `.env`'de
- [ ] Cloud Console'da budget alert aktif ($100/$500/$1000 tier)
- [ ] PostGIS extension Postgres'te yüklü (manuel: `CREATE EXTENSION IF NOT EXISTS postgis;`)

## User Stories

### US-2.1 — Şube merkezli harita (SP: 5)

*Login sonrası ana sayfa şubemin lokasyonuna zoom yapsın.*

**AC:**
- Map sayfası şubenin lat/lng'sine zoom 14
- Şube ikonu merkez pin (özel marker)
- Catchment polygon overlay (varsa, ince çizgi)
- Google Maps SDK lazy load (sadece authentication sonrası)
- Harita hareket ettiğinde URL state senkronize (`?lat=&lng=&zoom=` — nuqs veya manuel)

### US-2.2 — Nearby search backend (SP: 8)

*Backend'de bir koordinat etrafında firma arayan endpoint.*

**AC:**
- `POST /api/v1/places/search/nearby` body: `{ lat, lng, radius, categories?: string[] }`
- Validation: radius 100-5000m, categories whitelist
- Google Places Nearby Search (New API) çağrısı; field mask: `places.id, places.displayName, places.location, places.types, places.primaryType`
- Response cache: Redis key `places:nearby:{geohash6}:{cat-hash}`, TTL 7 gün
- Postgres'e upsert: `Company` modeli `tenantId`, `googlePlaceId` (unique), `name`, `location` (PostGIS Point)
- Cost middleware: her API çağrısı `ApiCostEvent` (provider="google_places", endpoint="nearby_search", costUsd)
- Rate limit: user başına 60 req/dk (Redis token bucket)
- Response envelope: `{ data: PlaceSummary[], meta: { source: "cache"|"api", count } }`

### US-2.3 — Frontend pin render (SP: 8)

*Harita üzerinde search sonuçlarını pin olarak göster.*

**AC:**
- Map sayfasında "Bu Bölgede Ara" butonu → mevcut viewport center + zoom'dan radius hesapla → backend search
- AdvancedMarkerElement kullan (yeni Google API)
- Pin renkleri kategoriye göre (10 kategori, sabit palette)
- Hover tooltip (firma adı, kategori)
- Tıklamada sağ panel placeholder ("Sprint 4'te detay gelecek")
- TanStack Query cache (staleTime 5dk)

### US-2.4 — Pin clustering (SP: 5)

*200+ pin yığıldığında okunabilir kalsın.*

**AC:**
- supercluster kütüphanesi
- Cluster pin custom render (sayı badge)
- Zoom-in cluster patlatır
- Mobil performansta 60fps (Lighthouse smoke test)

### US-2.5 — Yarıçap seçici (SP: 5)

*Müdür 500m / 1km / 2km / 5km arasında seçim yapsın.*

**AC:**
- Alt barda 4 buton (chip stili)
- Seçili yarıçap harita üzerinde transparent daire overlay
- Yarıçap değişimi 800ms debounce, otomatik yeniden search
- Seçim URL'de saklanır (`?radius=2000`)

### US-2.6 — Field mask + cost tracking (SP: 3)

*API çağrılarında alan-bazlı fiyatlama bilinçli kullanılsın.*

**AC:**
- Tüm Places API çağrıları `X-Goog-FieldMask` header ile sadece istenen alanları çeker
- Nearby Search'te `places.id, places.displayName, places.location, places.types` (Pro alanlardan kaçın)
- Cost tracking dashboard (Grafana panel veya basit endpoint `/api/v1/admin/costs/today`)

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/api/prisma/schema.prisma` | `Company` model + `ApiCostEvent` model |
| `apps/api/prisma/migrations/manual/03_postgis_company.sql` | PostGIS extension + `companies.location geography(Point,4326)` + GIST index |
| `apps/api/src/providers/places/PlacesProvider.ts` | Interface |
| `apps/api/src/providers/places/GooglePlacesProvider.ts` | Concrete impl |
| `apps/api/src/providers/places/InMemoryPlacesProvider.ts` | Test mock |
| `apps/api/src/modules/places/places.routes.ts` + `service.ts` + `schema.ts` | Yeni modül |
| `apps/api/src/middleware/costTracking.ts` | Yeni |
| `apps/api/src/middleware/rateLimit.ts` | @fastify/rate-limit Redis store |
| `apps/api/src/infrastructure/cache/redis.ts` | Redis client (ioredis) |
| `apps/web/src/features/map/MapPage.tsx` | Gerçek Google Map + search |
| `apps/web/src/features/map/components/{MapContainer,RadiusSelector,SearchButton,Pin,Cluster}.tsx` | Yeni |
| `apps/web/src/features/map/usePlaceSearch.ts` | TanStack Query hook |
| `apps/web/src/lib/maps/loader.ts` | Maps SDK lazy loader |
| `apps/api/src/__tests__/integration/places.test.ts` | InMemory provider ile testler |

## Test Beklentisi

- `GooglePlacesProvider` unit testi (HTTP mock ile)
- Cache hit/miss behavior testi
- Rate limit testi (Redis ile testcontainer)
- Cost tracking event yazılıyor mu integration test
- Frontend: pin render testi (jsdom, supercluster mock)

## Definition of Done

- [ ] Tüm US AC'leri ✓
- [ ] Cost dashboard'da gerçek API çağrılarının maliyeti görünüyor
- [ ] Cache hit ratio %50+ (smoke test 100 sorgu)
- [ ] PostGIS GIST index aktif (`EXPLAIN ANALYZE` ile doğrulanır)
- [ ] `pnpm lint && pnpm type-check && pnpm test` clean + CI yeşil
- [ ] CLAUDE.md güncel (Places provider notu)

## Demo Senaryosu

1. Müdür login → kendi şubesinin (Kadıköy) haritası
2. "1 km" seç → 200ms içinde dairesel overlay
3. "Bu Bölgede Ara" → 2 saniyede 100+ pin
4. Aynı işlem 2. kere → <500ms (cache hit, network'te API çağrısı yok)
5. Pin'e tıkla → "Sprint 4'te detay gelecek" toast
6. Admin → Cost paneli → bugünkü toplam $X gözüküyor

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 2'yi implement et. Detay için `docs/sprints/SPRINT_02_MAP_PLACES.md`,
`docs/PRD.md` § 5.2 ve § 7.4 (Veri Kaynağı Stratejisi), `docs/ARCHITECTURE.md` § 6
(Provider Interfaces) ve ADR-005'i oku.

Tamamlanacak story'ler:
- US-2.1 — Şube merkezli harita (5 SP)
- US-2.2 — Nearby search backend + cache + cost tracking (8 SP)
- US-2.3 — Frontend pin render (8 SP)
- US-2.4 — Pin clustering (5 SP)
- US-2.5 — Yarıçap seçici (5 SP)
- US-2.6 — Field mask + cost dashboard (3 SP)

Mimari prensipler:
- Provider abstraction: `PlacesProvider` interface, `GooglePlacesProvider`,
  test'te `InMemoryPlacesProvider`. Asla doğrudan Google SDK'sını route handler'da
  çağırma.
- Cache: Redis 7 gün TTL, key `places:nearby:{geohash6}:{cat-hash}`.
- Cost: tüm dış API çağrıları `costTracking` middleware'inden geçer,
  `ApiCostEvent` Postgres tablosuna yazar.
- PostGIS: `Company.location geography(Point,4326)` raw SQL migration ile,
  GIST index zorunlu.
- Field mask: Pro/Enterprise SKU alanlarını bilinçli dışarıda bırak.
- Rate limit: user başı 60 req/dk Redis store ile.

İş akışı:
1. Plan çıkar — hangi yeni Prisma model + migration, hangi paketler
   (ioredis, supercluster, @googlemaps/js-api-loader, geohash gibi).
   Onayımı bekle.
2. Provider abstraction'ı önce kur, sonra route'ları yaz.
3. Backend testleri InMemory provider ile yaz; gerçek Google API'ye dokunma.
4. Frontend lazy load — Google Maps SDK sadece auth sonrası yüklenir.
5. Pin clustering supercluster + custom marker; performans için
   AdvancedMarkerElement (yeni API).
6. URL state için `nuqs` paketi veya manuel useSearchParams.
7. Cost dashboard için basit `/api/v1/admin/costs/today` endpoint —
   Grafana setup Sprint 8'e bırakılır.

Kalite gate'leri:
- Her commit `pnpm lint && pnpm type-check`
- Cache hit/miss test'leri yeşil
- Manuel test: aynı bölgeyi 2. kez ara → network panelinde API call yok
- Cost tracking gerçek event yazıyor (psql ile doğrula)
- CLAUDE.md'ye Places provider + Redis cache notu ekle

Soruların varsa sor. Aksi halde planını ver, sonra başla.
```

---

## Doğrulama

```bash
pnpm install
pnpm db:migrate                                    # Company + ApiCostEvent
pnpm --filter @branchscout/api db:migrate:manual   # PostGIS + GIST index
pnpm test
pnpm dev
# Browser: login → harita → 1km → ara → 200ms cache hit
psql $DATABASE_URL -c 'SELECT count(*), provider FROM "ApiCostEvent" GROUP BY provider;'
```
