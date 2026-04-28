# Sprint 8 — Ziyaret Listeleri ve Liste Yönetimi

**Süre:** 2 hafta · **Önkoşul:** Sprint 5-7 tamam · **Bağlı:** PRD § 5.4

**🏁 Bu sprint sonu Beta Release** — 3 pilot şubeye açılır.

## Hedef

Müdür firmaları "Ziyaret Listesi"ne ekler, birden fazla liste tutar, listeyi başkasıyla paylaşır, toplu işlem yapar, Excel/CSV export alır.

## User Stories

### US-8.1 — Liste ekle/çıkar (SP: 5)

*Firma kartında tek tıkla liste ekleme.*

**AC:**
- Panel'de "Ziyaret Listesine Ekle" → dropdown (mevcut listelerden seç veya yeni)
- Toast feedback ("Bu Hafta listesine eklendi")
- Aynı firma 2 kere eklenmez (`@@unique([visitListId, companyId])`)

### US-8.2 — Çoklu liste yönetimi (SP: 8)

*Birden fazla liste tutma.*

**AC:**
- `/visit-lists` sayfası: kullanıcının listeleri (kart görünümü)
- Liste oluştur/sil/yeniden adlandır
- Liste detay: içindeki firmalar tablosu (ad, kategori, son ziyaret, etiket)
- Sıralama: ad, eklenme tarihi, kategori
- Filtre: etiket, kategori, MERSİS-bağlı

### US-8.3 — Toplu işlemler (SP: 8)

*Listede seç-uygula akışı.*

**AC:**
- Tablo'da checkbox sütunu
- Toolbar: "Seçili → Toplu MERSİS Lookup", "Toplu Etiket Ekle", "Rota Oluştur (Sprint 9)", "Kaldır"
- Bulk operation queue (tek tek değil batch BullMQ job)
- Progress bar (10/50 işlendi...)

### US-8.4 — Liste paylaşımı (SP: 8)

*Aynı tenant içinde liste paylaşımı.*

**AC:**
- "Paylaş" butonu → modal: kullanıcı seç + read-only/edit
- `VisitListShare` model: visitListId, sharedWithUserId, accessLevel ('READ'|'EDIT')
- "Paylaşılanlar" tab kullanıcının paylaşılan listeleri gösterir
- Edit yetkisi olmayanlar bulk işlem yapamaz

### US-8.5 — Liste export (SP: 5)

*Excel/CSV export.*

**AC:**
- "Dışa Aktar" → modal: alan seç (firma adı, adres, telefon, vergi no, etiket, son ziyaret, ...)
- Format: xlsx (ExcelJS) veya csv
- Async job (büyük listelerde) → email link
- Audit log entry

### US-8.6 — Listeyi haritada göster (SP: 3)

*Liste pin'leri özel renkte.*

**AC:**
- Liste detayda "Haritada Göster" → /map?listId=xxx
- Listedeki firmalar ametist renk pin (override)
- Diğer pin'ler düşük opacity

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/api/prisma/schema.prisma` | `VisitList`, `VisitListItem`, `VisitListShare` |
| `apps/api/src/modules/visit-lists/*` | Yeni modül |
| `apps/worker/src/jobs/bulkOperation.ts` | Yeni |
| `apps/api/src/utils/excel.ts` (ExcelJS wrapper) | Yeni |
| `apps/web/src/features/visit-lists/*` | Yeni feature folder |

## Test Beklentisi

- VisitList CRUD integration test (tenant + share izolasyonu)
- Bulk operation idempotent test
- Excel export schema test (alan seçimine göre kolon)

## DoD

- [ ] Tüm US AC'leri ✓
- [ ] Beta'ya hazır — pilot 3 şubeye URL açılıyor
- [ ] CI yeşil

## Demo

1. Müdür 8 firmayı 3 farklı listeye ekler
2. "VIP Hedefler" listesini bölge müdürüyle paylaşır (read)
3. Bölge müdürü görür ama düzenleyemez
4. Müdür "Bu Hafta" listesini xlsx export → email
5. Liste haritada göster → 8 firma vurgulanır

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 8 — Ziyaret listeleri. Detay:
`docs/sprints/SPRINT_08_VISIT_LISTS.md`, PRD § 5.4.

Story'ler:
- US-8.1 — Add/remove (5 SP)
- US-8.2 — Çoklu liste yönetimi (8 SP)
- US-8.3 — Toplu işlemler + progress UI (8 SP)
- US-8.4 — Paylaşım + access level (8 SP)
- US-8.5 — Excel/CSV export (5 SP)
- US-8.6 — Haritada göster (3 SP)

Önemli:
- Bulk operations BullMQ batch job; UI WebSocket veya polling ile progress.
- Share access RLS uyumlu — paylaşılan kullanıcı görsün ama tenant izolasyon
  kalksın değil; aynı tenant içinde paylaşım.
- Excel: ExcelJS, Türkçe header, alan seçimi modal.
- Beta release sonu — pilot 3 şubeye feature flag ile açılış.

Plan çıkar, onaylat.
```
