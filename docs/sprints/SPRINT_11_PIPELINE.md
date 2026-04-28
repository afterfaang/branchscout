# Sprint 11 — Pipeline ve Kanban

**Süre:** 2 hafta · **Önkoşul:** Sprint 10 tamam · **Bağlı:** PRD § 5.6

## Hedef

Müdür ziyaret edilen firmaları satış aşamalarına göre kanban'da takip eder: Keşif → İletişim → Toplantı → Teklif → Kazanıldı/Kaybedildi.

## User Stories

### US-11.1 — Kanban board (SP: 13)

**AC:**
- 6 sütun: Keşif, İletişim, Toplantı, Teklif, Kazanıldı, Kaybedildi
- @dnd-kit/core ile firma kartları sürüklenir
- Optimistic UI; backend persist sonra
- Real-time güncelleme (WebSocket veya polling 30s)

### US-11.2 — Aşama geçişi zorunlu alanlar (SP: 8)

**AC:**
- Geçişte modal: tarih + not zorunlu
- "Kazanıldı" için ek: ürün (multi-select), tahmini hacim TL
- "Kaybedildi" için: kayıp nedeni (dropdown: fiyat, rakip, ihtiyaç yok, zamanlama, diğer)

### US-11.3 — Filtreler (SP: 5)

**AC:**
- Tarih aralığı, etiket, ürün
- URL'de saklanır

### US-11.4 — Pipeline timeline (SP: 5)

*Firma kartında aşama geçmişi.*

**AC:**
- Kart detayında zaman çizelgesi: her aşama geçişi tarih + not + kullanıcı
- `PipelineEvent` tablosundan

### US-11.5 — "Sıkışan" firma uyarısı (SP: 5)

**AC:**
- 14+ gün aynı aşamada → uyarı badge
- Dashboard'a uyarı kartı (Sprint 12'de)
- Otomatik scheduled job (her gün 08:00)

### US-11.6 — Pipeline metrikleri (SP: 5)

**AC:**
- Sayfa altında: dönüşüm oranı (Keşif → Kazanıldı %), ortalama aşama süresi, kayıp nedenleri pasta grafik
- Recharts

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/api/prisma/schema.prisma` | `PipelineEvent`, `Company.pipelineStage` enum |
| `apps/api/src/modules/pipeline/*` | Yeni |
| `apps/worker/src/jobs/stalePipelineCheck.ts` | Daily scheduled |
| `apps/web/src/features/pipeline/*` | Kanban + drag-drop |

## DoD

- [ ] 100 firmalı kanban'da drag-drop akıcı (<200ms feedback)
- [ ] Stale check job çalışıyor
- [ ] CI yeşil

## Demo

Tek bir firmayı Keşif'ten Kazanıldı'ya kadar sürüklenmiş haldeyatif metriklerle birlikte göster.

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 11 — Pipeline kanban. Detay:
`docs/sprints/SPRINT_11_PIPELINE.md`, PRD § 5.6.

Story'ler: US-11.1 (13) US-11.2 (8) US-11.3 (5) US-11.4 (5) US-11.5 (5) US-11.6 (5)

Önemli:
- @dnd-kit/core; her drag commit'te API call (debounce 100ms).
- PipelineEvent tablosu append-only; aşama değişimi delete değil yeni event.
- Stale check günlük job, 14+ gün eşik konfigüre edilebilir.
- Optimistic UI: drag esnasında UI hemen güncellenir; backend reject ederse
  rollback + toast.

Plan çıkar, onaylat.
```
