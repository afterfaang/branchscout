# Sprint 7 — Haber Taraması ve Sektör Verisi

**Süre:** 2 hafta · **Önkoşul:** Sprint 4 tamam (S5-S6 ile paralel) · **Bağlı:** PRD § 5.3, § 7.4

## Hedef

Müdür firma hakkında son 12 ay haber özetlerini ve NACE bazlı bölgesel sektör benchmark'ını görür. Haberler sentiment-etiketli, sektör verisi TBB/BDDK aylık batch'ten gelir.

## Önkoşul Kontrol

- [ ] Sprint 4-5 tamam
- [ ] SerpAPI veya Google News RSS provider seçimi yapıldı
- [ ] TBB/BDDK açık veri portalı CSV erişimi test edildi

## User Stories

### US-7.1 — Haber taraması (SP: 8)

*Firma adına son 12 ay Google News.*

**AC:**
- Panel'de "Haberler" sekmesi → ilk açılışta `enrichNews` job tetiklenir
- `NewsProvider` interface, `SerpApiNewsProvider` veya `GoogleNewsRssProvider`
- Son 12 ay, dil TR, max 5 sonuç
- Cache 7 gün
- Her sonuç: title, source, date, url, snippet

### US-7.2 — Haber özetleme + sentiment (SP: 8)

*Her haber 1-2 cümle özet + sentiment etiketi.*

**AC:**
- Claude Haiku ile per-news summarization
- Sentiment: positive/neutral/negative
- DB'ye `companies.newsMentionsJson` array
- UI'da renkli badge + özet
- Negatif sentiment'ta panel'de uyarı (örn. dava haberi)

### US-7.3 — Sektör benchmark (NACE bazlı) (SP: 8)

*Firma NACE kodu varsa sektörel karşılaştırma.*

**AC:**
- "Sektör" sekmesi
- TBB/BDDK aylık ETL: `sector_benchmarks` tablosu (NACE × bölge × ay): kredi penetrasyonu, ortalama mevduat, sektörel büyüme
- Firma NACE kodu eşlenince benchmark gösterimi
- Türkiye geneli + il/bölge filtresi

### US-7.4 — Bölgesel sektör yoğunluğu (SP: 5)

*Müdür "bu mahallede en yoğun sektörler" görmesi.*

**AC:**
- Map sayfasında sağ alt widget: "Bu Bölgede" sektörel dağılım bar chart
- Cache'teki firmalardan kategori bazlı agregasyon
- Recharts ile horizontal bar

### US-7.5 — News provider abstraction (SP: 3)

**AC:**
- `NewsProvider` interface
- En az 1 concrete impl + InMemory mock

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/api/prisma/schema.prisma` | `SectorBenchmark` model + `companies.newsMentionsJson` |
| `apps/api/src/providers/news/*` | NewsProvider + concrete |
| `apps/worker/src/jobs/{enrichNews,tbbBddkImport}.ts` | Yeni |
| `apps/api/src/modules/news/*` + `sectors/*` | Yeni modüller |
| `apps/web/src/features/places/components/{NewsTab,SectorTab,RegionalSectorWidget}.tsx` | Yeni |

## Test Beklentisi

- News provider unit test
- Sentiment classifier prompt test (sabit input → beklenen output)
- TBB/BDDK ETL idempotent test
- Manuel: 50 firma haber sekmesi anlamlı sonuç

## Definition of Done

- [ ] Tüm US AC'leri ✓
- [ ] LLM token maliyeti $/firma metrik
- [ ] CI yeşil

## Demo Senaryosu

1. Tanınmış bir restoran zinciri pin'ine tıkla → Haberler sekmesi
2. 5 başlık + sentiment badge'leri
3. Sektör sekmesi → "Yiyecek-İçecek hizmetleri" Türkiye geneli kredi penetrasyonu %X
4. Map sayfası "Bu Bölgede" widget → restoran %40, perakende %30, ...

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 7 — News + Sektör. Detay: `docs/sprints/SPRINT_07_NEWS_SECTOR.md`,
PRD § 5.3.

Story'ler:
- US-7.1 — News fetch (8 SP)
- US-7.2 — LLM summarize + sentiment (8 SP)
- US-7.3 — TBB/BDDK ETL + sektör benchmark (8 SP)
- US-7.4 — Bölgesel yoğunluk widget (5 SP)
- US-7.5 — News provider abstraction (3 SP)

Önemli:
- News provider abstraction; SerpAPI veya RSS — config bazlı seçim.
- Sentiment classifier Claude Haiku, output `'positive'|'neutral'|'negative'`,
  Zod enum.
- TBB/BDDK CSV ingestion BullMQ scheduled job (aylık 1.gün 03:00); idempotent
  (aynı dosyayı 2 kez işlerse aynı sonuç).
- Sector benchmark (NACE × bölge × ay) tablosu; firma NACE'i match edince join.
- "Bu Bölgede" widget Recharts horizontal bar.
- Cache: news 7 gün, sector benchmark aylık bir kez.

Plan çıkar, onaylat.
```
