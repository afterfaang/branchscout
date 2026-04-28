# Sprint 5 — Web Site Summarizer, Etiket ve Not Sistemi

**Süre:** 2 hafta · **Önkoşul:** Sprint 4 tamam · **Bağlı:** PRD § 5.3, ARCHITECTURE § 6 (LLM provider)

## Hedef

Firma detayında firmanın websiteUri'si üzerinden otomatik LLM özetlemesi görünür. Müdür kendi etiket ve notlarını ekler, ekiple paylaşır. Etik tarama (robots.txt, rate limit, kullanıcı-agent).

## Önkoşul Kontrol

- [ ] Sprint 4 firma detay paneli çalışıyor
- [ ] `ANTHROPIC_API_KEY` `.env`'de
- [ ] BullMQ + Redis aktif

## User Stories

### US-5.1 — Web sitesi LLM özetleme (SP: 13)

*websiteUri'si olan firmalar için otomatik özet.*

**AC:**
- Background BullMQ job `enrichWebsite`: pin tıklandığında veya manuel "Özetle" butonu ile tetiklenir
- Playwright headless Chromium ile ana sayfa + iletişim sayfası fetch (timeout 10s)
- robots.txt parse, disallow ise atla
- User-agent: `BranchScoutBot/1.0 (+https://branchscout.app/bot)`
- Rate limit: aynı domain'e 1 req/sec
- LLM provider abstraction: `LLMProvider` interface, `AnthropicLLMProvider`
- Claude Haiku ile JSON output, Zod schema doğrulama
- Output schema: `{ activity: string, products: string[], email?: string, phone?: string, socialLinks: { linkedin?, instagram?, facebook?, twitter? }, languages: string[] }`
- DB'ye `companies.websiteSummaryText` (markdown) + `websiteSummaryJson` (structured) yazılır
- Frontend panelde "Web Sitesi" sekmesi

### US-5.2 — Job durumu UI (SP: 5)

*Kullanıcı özetleme süresinde feedback alsın.*

**AC:**
- 4 durum: `queued`, `running`, `completed`, `failed`
- "Özet hazırlanıyor..." spinner (queued/running)
- Failed durumda "Tekrar dene" butonu + hata mesajı
- WebSocket veya polling (5s interval)

### US-5.3 — Etiket sistemi (SP: 8)

*Serbest tag ekleme.*

**AC:**
- Panel'de "Etiketler" bölümü, multi-select autocomplete (mevcut tag'lerden + yeni)
- `Tag` model: id, tenantId, name, color (hex)
- Aynı tenant içinde tag'ler ortak havuzda
- Tag rengi otomatik atanır (palette'ten round-robin)
- Pin renkleri tag'e göre opsiyonel (legend toggle)
- `CompanyTag` join tablo (companyId, tagId, addedById, addedAt)

### US-5.4 — Firma notu (markdown) (SP: 5)

*Serbest metin not.*

**AC:**
- "Notlar" sekmesi
- Markdown editor (Tiptap minimal: bold, italic, list, link)
- Max 5000 karakter
- Kim ne zaman yazdı + revision history
- `CompanyNote` + `CompanyNoteRevision` tablolar

### US-5.5 — Robots.txt + etik scrape (SP: 5)

*Saygılı tarama.*

**AC:**
- `robots-parser` paketi
- Disallow ise job `failed` ile bırakılır (`reason: "robots.txt disallowed"`)
- Aynı domain'e ardışık istek 1s bekler (per-domain Redis lock)
- Blacklist: bilinen low-quality / spam siteler `domain_blacklist` Redis set
- Hata loglanır (Sentry)

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/api/prisma/schema.prisma` | `Tag`, `CompanyTag`, `CompanyNote`, `CompanyNoteRevision` |
| `apps/api/src/providers/llm/LLMProvider.ts` + `AnthropicLLMProvider.ts` | Yeni |
| `apps/api/src/providers/scraper/WebScraperProvider.ts` + `PlaywrightScraperProvider.ts` | Yeni |
| `apps/worker/src/jobs/enrichWebsite.ts` | Yeni |
| `apps/api/src/modules/tags/*` + `notes/*` | Yeni modüller |
| `apps/web/src/features/places/components/{WebsiteSummaryTab,TagPicker,NotesTab,JobStatusBadge}.tsx` | Yeni |
| `apps/api/src/utils/robots.ts` | Yeni |

## Test Beklentisi

- LLM provider unit test (mock Anthropic SDK, Zod validation)
- Scraper unit test (mock Playwright)
- robots.txt allow/disallow test
- Tag CRUD integration test (tenant izolasyonu)
- Note revision history test
- Manual: 100 firma için summarizer çalıştır → %80 başarı oranı

## Definition of Done

- [ ] Tüm US AC'leri ✓
- [ ] LLM token maliyeti $/firma izleniyor (cost tracking event)
- [ ] Robots.txt'ye saygı ispatlı (disallow domain test)
- [ ] CI yeşil
- [ ] CLAUDE.md'ye LLM provider notu eklendi

## Demo Senaryosu

1. Müdür bir restoran pin'ine tıklar → "Web Sitesi" sekmesi → "Özet hazırlanıyor..."
2. 15 saniye sonra özet görünür: "İtalyan restoranı, pizza + makarna, ailelere uygun..."
3. Müdür "Yüksek Öncelik" etiketi ekler → tag oluşturulur, autocomplete çalışır
4. "Notlar" sekmesi → "Sahibi 2025'te ticari kredi başvurmuş" yazar (markdown)
5. Diğer kullanıcı aynı firmaya bakınca etiket + not görür

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 5'i implement et. Detay: `docs/sprints/SPRINT_05_WEB_SUMMARIZER.md`,
PRD § 5.3, ARCHITECTURE § 6.

Story'ler:
- US-5.1 — Web summarizer (Playwright + Anthropic Haiku) (13 SP)
- US-5.2 — Job durumu UI (5 SP)
- US-5.3 — Etiket sistemi (8 SP)
- US-5.4 — Firma notu (Tiptap markdown) (5 SP)
- US-5.5 — Robots.txt + etik scrape (5 SP)

Önemli:
- Provider abstraction: `LLMProvider` (Anthropic) + `WebScraperProvider`
  (Playwright). Test'te InMemory mock'lar.
- Anthropic Claude Haiku — output token max 500, structured JSON schema
  Zod validation.
- LLM cost tracking event'i her çağrıda.
- Playwright headless Chromium dev'de Docker container; prod'da Worker
  service'i ayrı pod (veya Lambda Layer).
- Rate limit per-domain Redis lock (1 req/sec).
- Tiptap markdown editor — minimal extension set (StarterKit + Link).
- Tag rengi auto-assign (palette: 12 renk, round-robin).
- Note revision: her edit yeni revision row, eski silinmez.

Plan çıkar, onaylat. Anthropic API key olmadan da test'ler geçmeli (mock).
```

---

## Doğrulama

```bash
pnpm test
pnpm dev
# Worker container ayrı: cd apps/worker && pnpm dev
# Browser: pin tıkla → web sekmesi → 15s içinde özet
# psql: SELECT name, color FROM "Tag";
# Sentry'de robots.txt-disallow log'ları görünüyor mu (test için bilerek bir disallow domain dene)
```
