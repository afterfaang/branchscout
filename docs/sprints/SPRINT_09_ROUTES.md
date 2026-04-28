# Sprint 9 — Rota Optimizasyonu ve Takvim Entegrasyonu

**Süre:** 2 hafta · **Önkoşul:** Sprint 8 tamam · **Bağlı:** PRD § 5.4

## Hedef

Müdür liste seçer + tarih girer, sistem optimum rotayı (TSP) hesaplar, harita üzerinde polyline + zaman çizelgesi gösterir, iCal export ile takvime aktarır.

## Önkoşul Kontrol

- [ ] Google Routes API enable
- [ ] Sprint 8 visit lists çalışıyor

## User Stories

### US-9.1 — Rota optimizasyonu (SP: 13)

*Liste + tarih → optimum sıralama.*

**AC:**
- `POST /api/v1/routes/optimize` body: `{ visitListId, date, startsAt, durationPerStopMinutes? }`
- Backend: Google Routes API "Compute Routes" (waypoint optimization)
- 2-15 firma destekler
- Response: ordered stops + total distance + total duration
- Cache 24 saat (aynı liste + tarih için tekrar hesaplama)
- Cost tracking event

### US-9.2 — Görselleştirme (SP: 8)

*Harita + zaman çizelgesi.*

**AC:**
- Map üzerinde polyline (sıralı rota)
- Pin'lerde sıra numarası (1, 2, 3, ...)
- Sağ panel: zaman çizelgesi — her durakta tahmini varış saati + 45dk varsayılan blok
- Toplam: X km, Y saat

### US-9.3 — Manuel düzenleme (SP: 5)

*Sürükle-bırak ile sıra değiştir.*

**AC:**
- Zaman çizelgesi durakları @dnd-kit ile sürüklenebilir
- Sıra değişince rota anlık recompute (debounce 500ms)
- "İlk Optimum'a Dön" butonu

### US-9.4 — iCal export (SP: 5)

*Takvime aktar.*

**AC:**
- "Takvime Aktar" → .ics dosyası
- Her durak ayrı event: konu (firma adı), lokasyon (adres), açıklama (telefon + not)
- ical-generator paketi
- Smoke test: Google Calendar / Outlook / Apple Calendar import

### US-9.5 — Rota geçmişi (SP: 3)

*Geçmiş rotalar saklanır.*

**AC:**
- `/routes` sayfası: kullanıcının rotaları (tarih sıralı)
- Tıklayınca detay + tekrar export
- Status: PLANNED, IN_PROGRESS, COMPLETED, CANCELLED

### US-9.6 — Trafik tahminli süre (SP: 3)

*Realistic ETAs.*

**AC:**
- Routes API'da `departure_time` gönderilir
- Saat 09:00 başlangıç → 09:00 trafiği hesaba katılır

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/api/prisma/schema.prisma` | `Route`, `RouteStop` |
| `apps/api/src/providers/routing/RoutingProvider.ts` + `GoogleRoutingProvider.ts` | Yeni |
| `apps/api/src/modules/routes/*` | Yeni |
| `apps/api/src/utils/ical.ts` | ical-generator wrapper |
| `apps/web/src/features/routes/*` | Yeni feature |

## Test Beklentisi

- TSP optimization unit test (mock provider, 5/10/15 stop)
- iCal export format test (Google Calendar import smoke)
- Manuel düzenleme recompute test

## DoD

- [ ] 10 firmalı rota 3 saniyede oluşur
- [ ] iCal Google/Outlook/Apple Calendar'a import edilebilir
- [ ] CI yeşil

## Demo

1. Müdür "Bu Hafta" listesi (8 firma) → "Rota Oluştur" → Çarşamba 09:00
2. 3 saniye sonra polyline + zaman çizelgesi
3. 5. ve 6. durağı yer değiştir → recompute
4. iCal export → Google Calendar'a import → 8 event

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 9 — Routes. Detay: `docs/sprints/SPRINT_09_ROUTES.md`,
PRD § 5.4.

Story'ler:
- US-9.1 — Optimize endpoint + cache (13 SP)
- US-9.2 — Görselleştirme (8 SP)
- US-9.3 — DnD manuel sıra (5 SP)
- US-9.4 — iCal export (5 SP)
- US-9.5 — Rota geçmişi (3 SP)
- US-9.6 — Trafik (3 SP)

Önemli:
- RoutingProvider abstraction; GoogleRoutingProvider primary, OR-Tools-based
  fallback Sprint 9'da yazma — sadece Google.
- Cache key: `route:opt:{listId}:{date}:{startsAt}` 24h TTL.
- @dnd-kit/core + sortable; her sürükleme sonrası 500ms debounce recompute.
- ical-generator: timezone Europe/Istanbul, UID stable per stop.
- Cost tracking event her optimize'da.

Plan çıkar, onaylat.
```
