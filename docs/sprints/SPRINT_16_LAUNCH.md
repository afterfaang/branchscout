# Sprint 16 — Lansman, Eğitim, Stabilizasyon

**Süre:** 2 hafta · **Önkoşul:** Sprint 15 tamam · **Bağlı:** PRD § 13.1

**🏁 GA Release** — tüm banka rollout.

## Hedef

Tüm banka şubelerini sisteme alır, müdür eğitim materyallerini yayınlar, ilk 2 hafta günlük stabilizasyon takibi.

## User Stories

### US-16.1 — Eğitim materyalleri (SP: 8)

**AC:**
- 10dk Türkçe video (intro + ana akışlar): kayıt, harita, ziyaret, pipeline
- Kullanıcı el kitabı PDF (50+ sayfa, ekran görüntülü)
- Video host: Loom veya self-hosted

### US-16.2 — In-app onboarding (SP: 5)

**AC:**
- İlk girişte 5 adımlı tour (intro.js veya shepherd.js)
- "Atla" opsiyonu
- Tekrar görmek için Help menüsü

### US-16.3 — Help center (SP: 5)

**AC:**
- 30+ FAQ
- Search'lenebilir
- Video embed'ler
- `/help` route

### US-16.4 — Rollout planı (SP: 5)

**AC:**
- LaunchDarkly feature flag ile haftalık %20'şer açılış
- Her dalgada gözlem (DAU, error rate, NPS)
- Pilot şube → bölge müdürleri → tüm banka

### US-16.5 — Support kanalı (SP: 5)

**AC:**
- In-app chat (Intercom/Crisp) veya email + Slack uyarı
- SLA: P0 1 saat, P1 4 saat, P2 24 saat
- Ticket triage süreci

### US-16.6 — Stabilizasyon ve hotfix (SP: 13)

*Buffer.*

**AC:**
- İlk 2 hafta günlük review
- P0/P1 bug'lar 24h içinde fix
- Postmortem her major incident için

### US-16.7 — Lansman sonrası retro (SP: 3)

**AC:**
- Tüm ekip + ürün sahibi
- Kazanımlar/kayıplar/sonraki çeyrek roadmap önerileri
- Sprint 17+ planning

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/web/src/features/onboarding/*` | Yeni |
| `apps/web/src/features/help/*` | Yeni |
| `docs/training/*.md` | El kitabı kaynak |
| `docs/runbooks/*.md` | Support runbook'ları |

## DoD

- [ ] Tüm banka şubeleri (~600) sistemde aktif
- [ ] İlk hafta DAU > %60
- [ ] NPS > 30
- [ ] Hiç P0 ortalama 30 gün
- [ ] **GA Release** ✓

## Demo

Genel müdürlük lansman event — yöneticilere canlı demo + soru-cevap.

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 16 — Lansman + eğitim. Detay:
`docs/sprints/SPRINT_16_LAUNCH.md`, PRD § 13.1.

Story'ler: US-16.1 (8) US-16.2 (5) US-16.3 (5) US-16.4 (5) US-16.5 (5)
US-16.6 (13) US-16.7 (3)

Önemli:
- Onboarding library: shepherd.js veya intro.js — minimal CSS/JS impact.
- Help center CMS-light: markdown dosyaları + Meilisearch indeksi.
- LaunchDarkly progressive rollout config kodda; UI'da kim ne görüyor değişir.
- Support entegrasyonu opsiyonel — Sprint 16 başında ürün ekibi ile karar.
- Buffer (US-16.6) sprint kapasitesinin %30'u — beklenmedik bug'lar için.

Plan çıkar, onaylat.
```

---

## GA Release Sonrası

`docs/SPRINT_PLAN.md` § 6'daki Sprint 17+ önerilerini değerlendir:
- Native mobil app (React Native)
- LinkedIn public profile linking
- OCR kartvizit scan
- A/B test altyapısı
- White-label markalama
- Çoklu dil (EN, DE)
