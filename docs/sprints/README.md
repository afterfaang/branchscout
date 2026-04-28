# Sprintler — Claude Code İş Akışı

Her sprint, repoyu PRD/ARCHITECTURE/SPRINT_PLAN ile birlikte okuyan Claude Code session'ı için bir brief'tir. Bir sprint dosyası iki şey içerir:

1. **İnsan tarafı:** sprint hedefi, user story'ler, acceptance criteria, etkilenen dosyalar, DoD.
2. **Claude Code prompt'u:** dosyanın en altında, doğrudan kopyala-yapıştır edilebilir tek-atış brief.

## Önerilen Akış

Sprint başında:

```bash
cd "Yeni Proje/Google Maps"
git checkout -b sprint-N-short-name
claude  # veya `claude code`
```

Claude Code session'ında:

> Lütfen `docs/sprints/SPRINT_NN_xxx.md` dosyasını oku ve "Claude Code'a Tek-Atış Prompt" bölümündeki işi yap. Önce kendi planını çıkar, onayımı al, sonra story story PR-ready commit'lerle ilerle.

Her story bittiğinde yerel kontrol:

```bash
pnpm lint && pnpm type-check && pnpm test
```

Sprint sonunda PR aç, CI yeşil, mergele, sonraki sprinte geç.

## Sprintler

| # | Başlık | Süre | Bağımlılık | Çıktı |
|---|--------|------|------------|-------|
| 0 | Hazırlık & Altyapı | 2h | — | Monorepo iskeleti (TAMAM) |
| 1 | Auth & Multi-tenant | 2h | S0 | Login + JWT + RLS + 3 admin endpoint |
| 2 | Harita & Google Places | 2h | S1 | Nearby search + pin render + cache |
| 3 | Keşif: alan, filtre, autocomplete | 2h | S2 | Polygon, kategori, kayıtlı arama, heatmap |
| 4 | Firma Detay + Place Details | 2h | S3 | Sağ panel, foto galeri, 30g cache |
| 5 | Web Site Summarizer + Etiket/Not | 2h | S4 | LLM özet + tag/note sistemi |
| 6 | MERSİS Entegrasyonu | 2h | S4 | Resmi kayıt sekmesi |
| 7 | Haber & Sektör Verisi | 2h | S4 | Google News + TBB/BDDK benchmark |
| 8 | Ziyaret Listeleri | 2h | S5-7 | List CRUD + paylaşım + export |
| 9 | Rota Optimizasyonu | 2h | S8 | TSP + iCal export |
| 10 | Saha Ziyaret Kaydı | 2h | S9 | Form + foto + Whisper sesli not |
| 11 | Pipeline & Kanban | 2h | S10 | 6 sütun, drag-drop, history |
| 12 | Dashboard & Raporlama | 2h | S11 | KPI, ısı haritası, PDF/Excel |
| 13 | AI Lead Scoring | 2h | S12 | 0-100 skor + yaklaşım önerisi |
| 14 | PWA + Offline + Push | 2h | S13 | Service worker + IndexedDB sync |
| 15 | Hardening | 2h | S14 | Yük testi + pen test + KVKK |
| 16 | Lansman & Eğitim | 2h | S15 | Onboarding + rollout + stabilizasyon |

## Notlar

- Her sprint'in detaylı yol haritası `docs/SPRINT_PLAN.md`'de.
- Mimari kararlar için `docs/ARCHITECTURE.md`.
- Ürün gereksinimleri için `docs/PRD.md`.
- Provider abstraction zorunlu (PRD § 7, ADR-005).
- Test coverage: backend ≥ %70, frontend ≥ %50, sprint ilerledikçe yükselir.
- Tüm yeni tablolar `tenantId` taşır (PRD § 6.2).
