# Sprint 12 — Dashboard ve Raporlama

**Süre:** 2 hafta · **Önkoşul:** Sprint 11 tamam · **Bağlı:** PRD § 5.7

## Hedef

Şube müdürü kendi performansını, bölge müdürü tüm şubeleri tek ekranda görür. Haftalık PDF rapor otomatik email.

## User Stories

### US-12.1 — Şube müdürü dashboard (SP: 8)

**AC:**
- 4 KPI kart (haftalık keşif, ziyaret, pipeline değeri TL, dönüşüm %)
- 12 haftalık trend grafiği (Recharts)
- Sıkışan firma uyarı paneli (Sprint 11)
- "Bu hafta öneri" placeholder (Sprint 13)

### US-12.2 — Bölge müdürü dashboard (SP: 13)

**AC:**
- Şube karşılaştırma tablosu (sıralanabilir)
- Bölgesel ısı haritası (yoğunluk: ziyaret, dönüşüm)
- Şube başı bar chart
- Drill-down: şubeye tıkla → şube müdürü dashboard view

### US-12.3 — Liderlik tablosu (SP: 5)

*Top-10 müdür gamification.*

**AC:**
- Bölge içinde ziyaret/dönüşüm metriklerinde sıralama
- "Madalyalar": en çok ziyaret, en yüksek dönüşüm, en hızlı pipeline

### US-12.4 — Excel export (SP: 5)

**AC:**
- Dashboard verisi seçilen tarih aralığı için xlsx
- Çoklu sheet: KPI özet, ziyaret listesi, pipeline detay

### US-12.5 — PDF haftalık rapor (SP: 8)

*Otomatik email.*

**AC:**
- Her cumartesi 06:00 BullMQ job
- Puppeteer ile dashboard sayfasını PDF'e
- Email ile gönderilir (kullanıcı opt-in)
- Kapak sayfası + 4 KPI + grafikler + öneriler

### US-12.6 — Custom rapor builder (basit) (SP: 8)

**AC:**
- Form: tarih aralığı, şubeler (multi), kategoriler, metrikler
- Preview + export

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/api/src/modules/reports/*` | Yeni |
| `apps/api/prisma/migrations/manual/04_materialized_views.sql` | Dashboard MV (gece refresh) |
| `apps/worker/src/jobs/{weeklyReport,refreshDashboardMV}.ts` | Yeni |
| `apps/web/src/features/dashboard/*` | Yeni feature |

## DoD

- [ ] Dashboard sayfaları P95 < 2s (MV ile)
- [ ] PDF rapor email görseliyle hazır
- [ ] CI yeşil

## Demo

Bölge müdürü 25 şubelik pilot dashboard'u — şube karşılaştırma + ısı haritası + drill-down.

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 12 — Dashboards. Detay:
`docs/sprints/SPRINT_12_DASHBOARDS.md`, PRD § 5.7.

Story'ler: US-12.1 (8) US-12.2 (13) US-12.3 (5) US-12.4 (5) US-12.5 (8) US-12.6 (8)

Önemli:
- Materialized View'lar PostgreSQL'de — gece 02:00 refresh job. OLTP'yi yormaz.
- Recharts kütüphanesi.
- PDF generation: Puppeteer headless Chromium worker pod'unda.
- Read replica DB opsiyonel — Sprint 15'te ekleneceği için şimdilik primary.
- Dashboard data API'leri cache'li (5dk TTL).

Plan çıkar, onaylat.
```
