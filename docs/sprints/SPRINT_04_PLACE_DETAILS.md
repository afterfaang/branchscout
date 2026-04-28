# Sprint 4 — Firma Detay Paneli, Place Details Cache, Foto Galeri

**Süre:** 2 hafta · **Önkoşul:** Sprint 3 tamam · **Bağlı:** PRD § 5.3, § 7.4

## Hedef

Müdür bir pin'e tıklayınca firmanın tüm Google verilerini sağ panelde görür; aynı firmayı 2. kez açtığında API çağrısı tetiklenmez (30 günlük cache). Foto galeri, açılış saatleri görselleştirmesi, kalıcı foto mirror.

**🏁 Bu sprint sonu Alpha Release** — iç ekibe açılır.

## Önkoşul Kontrol

- [ ] Sprint 2-3 Places + map çalışıyor
- [ ] S3 / MinIO bucket hazır (foto mirror için)
- [ ] BullMQ + Redis çalışıyor (foto mirror job için)

## User Stories

### US-4.1 — Sağ panel açılış (SP: 8)

*Pin'e tıkla → sağ panel slide-in.*

**AC:**
- Pin click → 320px slide-in panel (sağdan)
- "Genel" sekmesi: isim, adres, telefon, web, açılış saatleri, rating, review sayısı, kategori
- Mobile: full-screen modal (responsive breakpoint)
- ESC veya panel dışı tık → kapat
- URL'de açık panel state (`?placeId=xxx`)

### US-4.2 — Place Details + cache (SP: 8)

*30 günlük cache ile API call minimum.*

**AC:**
- `GET /api/v1/places/:placeId`
- Önce Postgres `Company` kontrol → `last_enriched_at < 30 gün` ise dön (DB hit)
- Yoksa veya stale → Redis cache → cache miss ise Google Places Details
- Field mask: `displayName, formattedAddress, nationalPhoneNumber, websiteUri, regularOpeningHours, rating, userRatingCount, photos[10]`
- Cache: Redis `place_details:{placeId}` TTL 30 gün
- Postgres'e tüm alanları upsert
- Cost tracking event
- Response time hedefi: cache hit P95 < 200ms, miss < 1.5s

### US-4.3 — Foto galeri + S3 mirror (SP: 8)

*Google'ın imzalı URL'leri 1 saatte expire — kalıcı erişim için S3'e mirror.*

**AC:**
- İlk 10 foto thumbnail panelde
- Tıklayınca lightbox (yet-another-react-lightbox)
- Background BullMQ job: foto'yu Google'dan fetch → S3'e yaz → DB'ye permanent URL
- Job idempotent (aynı foto 2 kere mirror'lanmaz)
- Kullanıcı UI'da hep en güncel URL'yi görür (Google signed URL veya S3, hangisi mevcutsa)

### US-4.4 — Açılış saatleri görselleştirme (SP: 3)

*Bugün açık/kapalı + haftalık tablo.*

**AC:**
- Bugün açık ise yeşil "Açık" badge + "saat 19'a kadar"
- Kapalıysa kırmızı badge + "yarın 09'da açılır"
- Hover/click → haftalık tablo (Pzt-Paz, Türkçe gün adları)
- Açılış saati formatı 24h Türkiye locale

### US-4.5 — Web sitesi tıklama metriği (SP: 2)

*Dış link tıklamalarını ölç.*

**AC:**
- Web sitesi linkine tıklama event'i `WebsiteClick` tablosuna yazılır
- Sprint 13 lead scoring için input

### US-4.6 — "Detayları Yenile" butonu (SP: 3)

*Kullanıcı manuel cache invalidate edebilsin.*

**AC:**
- Panel altında "Detayları Yenile" linki
- Tıklamada Redis cache + DB `last_enriched_at` invalidate → fresh fetch
- "Son güncelleme: 23 dakika önce" formatında gösterilir
- Rate limit: kullanıcı başı saatte max 30 yenileme

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/api/src/modules/places/places.routes.ts` | `GET /:placeId`, `POST /:placeId/refresh` |
| `apps/api/src/providers/places/GooglePlacesProvider.ts` | `getDetails(placeId, fields)` |
| `apps/api/src/providers/places/GooglePlacesProvider.ts` | `getPhoto(photoRef)` |
| `apps/worker/src/jobs/photoMirror.ts` | Yeni BullMQ job |
| `apps/api/prisma/schema.prisma` | `Company.photosJson` enriched, `WebsiteClick` model |
| `apps/api/src/infrastructure/storage/s3.ts` | S3/MinIO client |
| `apps/web/src/features/places/components/{PlaceDetailsPanel,PhotoGallery,OpeningHours,RefreshButton}.tsx` | Yeni |
| `apps/web/src/features/places/usePlaceDetails.ts` | TanStack Query hook |

## Test Beklentisi

- Cache hit/miss path testleri
- Photo mirror job idempotency testi (aynı foto 2 kez kuyruğa atılınca tek mirror)
- Frontend: PlaceDetailsPanel render testi (loading, error, success states)
- Manual: 1000 unique pin tıklaması → 1000 API call, sonraki 1000 → 0 call

## Definition of Done

- [ ] Tüm US AC'leri ✓
- [ ] Cache hit ratio %70+ (5 müdür 1 hafta kullanım simülasyonu)
- [ ] Foto S3'te mirror ediliyor, public URL döner
- [ ] Lighthouse: panel açılış 200ms (cache hit)
- [ ] CI yeşil

## Demo Senaryosu

1. Müdür Bağdat Cd haritada → restoran pin'i tıklar
2. Sağ panel 1.5s'de açılır, ilk yükleme (cache miss)
3. Panel kapatıp aynı pin'e tıkla → 200ms (cache hit, network'te API yok)
4. Foto galeri lightbox aç → fotoğraflar S3'ten geliyor
5. Açılış saatleri "Bugün açık, 22:00'a kadar" gösterir
6. "Detayları Yenile" tıklayınca fresh fetch + last update tarihi güncellenir

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 4'ü implement et. Detay: `docs/sprints/SPRINT_04_PLACE_DETAILS.md`,
PRD § 5.3 ve § 7.4 (cost optimization).

Story'ler:
- US-4.1 — Sağ panel açılış + URL state (8 SP)
- US-4.2 — Place Details + 30g cache + cost tracking (8 SP)
- US-4.3 — Foto galeri + S3 mirror BullMQ job (8 SP)
- US-4.4 — Açılış saatleri görselleştirme (3 SP)
- US-4.5 — Web sitesi tıklama metriği (2 SP)
- US-4.6 — Detayları Yenile (rate-limited) (3 SP)

Mimari:
- Cache stratejisi: DB → Redis → Google API. Field mask zorunlu.
- BullMQ worker `apps/worker` altında; foto mirror job `photoMirror.ts`.
- S3 abstraction: `StorageProvider` interface, `S3StorageProvider` ve
  `MinioStorageProvider` (dev için). Test'te `InMemoryStorageProvider`.
- Lightbox: yet-another-react-lightbox.
- Açılış saatleri Türkçe locale (date-fns/tr).
- Refresh rate limit Redis token bucket (kullanıcı başı 30/saat).

Plan çıkar, onaylat. Test coverage hedef %70 backend, %50 frontend.
Sprint sonu **Alpha release** — iç ekibe açılacak; smoke test akışı doğrula.
```

---

## Doğrulama + Alpha Release

```bash
pnpm test
pnpm dev
# Browser: 5 farklı pin tıkla → her biri 1.5s yüklenir
# Aynı pin'leri 2. kez tıkla → her biri 200ms (cache hit)
# psql: SELECT count(*), provider FROM "ApiCostEvent" WHERE created_at > NOW() - INTERVAL '1 hour';
# MinIO console: branchscout-photos bucket'ında dosyalar görünüyor mu?
```

Alpha release notification ekibe e-mail veya Slack ile.
