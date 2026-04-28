# Sprint 13 — AI Lead Scoring ve Akıllı Öneriler

**Süre:** 2 hafta · **Önkoşul:** Sprint 12 tamam · **Bağlı:** PRD § 15

## Hedef

Sistem her firmayı 0-100 skorlar (rule-based v1). Ana sayfada müdüre "Bu Hafta İçin Önerilenler" widget'ı + firma detayında LLM tabanlı yaklaşım önerisi gösterir.

## User Stories

### US-13.1 — Lead scoring v1 (rule-based) (SP: 13)

**AC:**
- Skorlama formülü: Google rating × açılış saatleri varlığı × web sitesi varlığı × MERSİS aktiflik × sermaye tier × son haber sentiment × sektör penetrasyon trendi → 0-100
- Tenant-level konfigüre edilebilir ağırlıklar (`ScoringConfig` tablosu)
- Günlük scheduled job rebuild
- Manuel "Yeniden Hesapla" admin endpoint

### US-13.2 — Skor UI'da görünür (SP: 5)

**AC:**
- Firma panel: 0-100 ring (yeşil/sarı/kırmızı)
- Hover'da "Skor bileşenleri" açıklama
- Ana harita: skor 80+ pin'leri yıldız ikon

### US-13.3 — "Bu Hafta Önerilenler" widget (SP: 8)

**AC:**
- Ana sayfada üstte 10 firma listesi
- Filtre: yüksek skor + henüz keşfedilmemiş + müdürün geçmiş tercihlerine yakın
- "Ziyarete ekle" tek tıkla

### US-13.4 — LLM yaklaşım önerisi (SP: 8)

**AC:**
- Firma panelinde "Yaklaşım Stratejisi" butonu
- Claude (Sonnet ya da Haiku) ile öneri: "Bu firmaya nasıl yaklaşmalı?"
- Input: firma özeti + sektör verisi + haber sentiment + Google rating + (anonim) önceki başarılı ziyaret notları
- Output: 3-5 maddelik strateji + örnek açılış cümlesi
- Cache 7 gün

### US-13.5 — Geri besleme döngüsü (SP: 3)

**AC:**
- Her öneri kartında 👍/👎
- Sinyal `RecommendationFeedback` tablosuna
- Sprint 14+ ML modeli için input

### US-13.6 — Skor şeffaflığı (SP: 5)

**AC:**
- Her skor için "neden bu skor" açıklaması
- Admin UI'da ağırlık ayarı

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/api/prisma/schema.prisma` | `LeadScore`, `ScoringConfig`, `RecommendationFeedback` |
| `apps/api/src/modules/scoring/*` | Yeni |
| `apps/worker/src/jobs/leadScoringRebuild.ts` | Daily |
| `apps/api/src/providers/llm/AnthropicLLMProvider.ts` | `generateApproachStrategy` |
| `apps/web/src/features/recommendations/*` | Yeni |

## DoD

- [ ] Pilotta öneri widget'ı kullanıcıların %60'ı haftalık 1+ ziyaret yapıyor
- [ ] LLM strateji prompt cache'i hit ratio %80
- [ ] CI yeşil

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 13 — AI lead scoring. Detay:
`docs/sprints/SPRINT_13_AI_SCORING.md`, PRD § 15.

Story'ler: US-13.1 (13) US-13.2 (5) US-13.3 (8) US-13.4 (8) US-13.5 (3) US-13.6 (5)

Önemli:
- Scoring rule-based v1 — açıklanabilir, ML değil.
- Ağırlıklar `ScoringConfig` tablosunda; admin UI ile düzenlenebilir.
- LLM yaklaşım önerisi prompt cache'li (input hash → output 7 gün).
- Tüm LLM çağrıları cost tracking event.

Plan çıkar, onaylat.
```
