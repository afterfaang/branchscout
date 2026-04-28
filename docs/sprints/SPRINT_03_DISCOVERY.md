# Sprint 3 — Keşif: Alan Çizimi, Kategori Filtresi, Adres Arama

**Süre:** 2 hafta · **Önkoşul:** Sprint 2 tamam · **Bağlı:** PRD § 5.2, § 5.3

## Hedef

Müdür haritada serbest poligon çizebilir, kategoriye göre filtreleyebilir, adres yazıp gidebilir, aramasını kaydedip sonra geri yükleyebilir. Yoğun pin görünümü heatmap olarak görünür.

## Önkoşul Kontrol

- [ ] Sprint 2 harita + Places çekirdeği çalışıyor
- [ ] PostGIS `ST_Contains` GIST index aktif

## User Stories

### US-3.1 — Polygon search (SP: 13)

*Haritada serbest poligon çizip içindeki firmaları listele.*

**AC:**
- "Alan Çiz" butonu → Google Drawing Manager → kullanıcı poligon kapatır
- `POST /api/v1/places/search/polygon` body: `{ polygon: GeoJSON.Polygon, categories?: string[] }`
- Validation: poligon alanı max 100 km² (geohash bazlı kontrol)
- PostGIS `ST_Contains(ST_GeomFromGeoJSON(?), location)` ile cache'ten dön
- Eğer cache yetersizse poligon merkezinde bbox bazlı fresh search (ücret kontrolü)
- Frontend: çizim sonrası loading → pin'ler ekranda

### US-3.2 — Kategori filtresi (SP: 5)

*10 ana kategori multi-select.*

**AC:**
- 10 kategori chip (Restoran, Perakende, İmalat, Sağlık, Eğitim, Hizmet, Otomotiv, İnşaat, Toptan, Diğer)
- Filtreler URL query'de (`?cats=restaurant,retail`)
- Client-side filtering (cache'ten); backend filtreleme search'lerde uygulanır
- Filtreler kalıcı (kullanıcı bazlı `UserPreferences` tablosu opsiyonel)

### US-3.3 — Adres autocomplete (SP: 5)

*Adres yazınca harita oraya gitsin.*

**AC:**
- Üst barda search input + Google Places Autocomplete
- Türkiye ile sınırlı (`componentRestrictions: { country: 'tr' }`)
- Seçilen adres haritayı oraya pan + zoom 15
- Opsiyonel: otomatik nearby search (toggle)
- Autocomplete ücreti: session token kullan (cost optimization)

### US-3.4 — Kayıtlı aramalar (SP: 5)

*Müdür aramayı isimlendirip kaydetsin.*

**AC:**
- `SavedSearch` model: id, tenantId, userId, name, queryJson, createdAt
- "Aramayı Kaydet" butonu → modal: ad
- Sol panelde "Kayıtlı Aramalarım" listesi
- Tıklamada query yüklenir (poligon + filtre + zoom)
- Silme + yeniden adlandırma

### US-3.5 — Heatmap toggle (SP: 5)

*Geniş zoom'da heatmap, dar zoom'da pin.*

**AC:**
- Zoom < 13 → heatmap layer (google.maps.visualization)
- Zoom ≥ 13 → pin'ler
- Üst barda manuel toggle ("Yoğunluk Haritası" switch)
- Heatmap intensity company yoğunluğuna göre

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/api/prisma/schema.prisma` | `SavedSearch` model |
| `apps/api/src/modules/places/places.service.ts` | searchInPolygon |
| `apps/api/src/modules/saved-searches/*` | Yeni modül |
| `apps/api/src/utils/geo.ts` | Poligon alan hesabı |
| `apps/web/src/features/map/components/{DrawingTools,CategoryFilter,AddressSearch,SavedSearchPanel,HeatmapToggle}.tsx` | Yeni |
| `apps/web/src/features/map/useSavedSearches.ts` | TanStack Query hook |

## Test Beklentisi

- Polygon area validation testi (100 km² aşımı reject)
- `ST_Contains` query performans testi (10K firma, < 500ms)
- SavedSearch CRUD integration testi (tenant izolasyonu)
- Frontend: drawing manager mock + polygon submission testi

## Definition of Done

- [ ] Tüm US AC'leri ✓
- [ ] PostGIS poligon sorguları P95 < 500ms (10K firma)
- [ ] Autocomplete session token ile çalışıyor (Google billing'de görünür)
- [ ] CI yeşil

## Demo Senaryosu

1. Müdür "Alan Çiz" → Bağdat Caddesi'nin bir mahalle kısmını çizer
2. Filtreden "Restoran + Kafe" seçer → 80 firma görünür
3. "Bağdat Cd Restoranlar" diye kaydet
4. Logout/login → kayıtlı arama tek tık ile geri gelir
5. Zoom out → heatmap → zoom in → pin'ler

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 3'ü implement et. Detay: `docs/sprints/SPRINT_03_DISCOVERY.md`,
PRD § 5.2-5.3, ARCHITECTURE § 6.

Story'ler:
- US-3.1 — Polygon search (13 SP)
- US-3.2 — Kategori filtresi (5 SP)
- US-3.3 — Adres autocomplete + session token (5 SP)
- US-3.4 — Kayıtlı aramalar (5 SP)
- US-3.5 — Heatmap toggle (5 SP)

Önemli:
- Polygon backend'i PostGIS `ST_Contains` ile; cache'i öncelikle dene, fresh
  search son çare. Cost middleware'den geçir.
- Polygon area validation backend'de — 100 km² aşımı 400 + Türkçe açıklama.
- SavedSearch tablosu `tenantId` taşır, RLS uyumlu.
- Heatmap layer Google Maps Visualization library'sinden.
- Autocomplete için Google session token (cost optimization) — her arama
  oturumunda yeni token, place selected'te token tüketilir.
- URL state önemli — paylaşılabilir link.

Plan çıkar, onaylat, sonra başla. Her commit Conventional Commits.
Test coverage hedefi: backend %75, frontend %50.
```

---

## Doğrulama

```bash
pnpm test
pnpm dev
# Browser: alan çiz → kategori filtrele → kaydet → çıkış/giriş → tekrar yükle
# Heatmap toggle çalışıyor mu, zoom seviyesinde otomatik geçiş yapıyor mu
```
