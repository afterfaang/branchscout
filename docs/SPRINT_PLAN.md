# BranchScout — Sprint Planı

**Versiyon:** 1.0
**Tarih:** 24 Nisan 2026
**Bağlı Doküman:** [PRD.md](PRD.md)
**Toplam Süre:** 16 sprint × 2 hafta = 32 hafta (~8 ay)
**Geliştirme Modeli:** Scrum, 2 haftalık sprint, Claude Code destekli pair programming

---

## 1. Yöntem ve Çerçeve

### 1.1 Sprint Ritüelleri

Her sprint Pazartesi sabahı planlama ile açılır, ikinci Cuma demo + retro ile kapanır. Sprint içinde Pazartesi/Çarşamba/Cuma 15dk daily stand-up, hafta ortası refinement (1 saat). Sprint demo'ya tüm ekip + ürün sahibi + en az 1 pilot şube müdürü davet edilir — gerçek kullanıcı geri bildirimi sprint sonunda alınır.

### 1.2 Definition of Ready (DoR)

Bir story sprint'e alınmadan önce: kabul kriterleri yazılmış, tasarım (Figma) hazır veya N/A olduğu işaretlenmiş, teknik bağımlılıkları çözülmüş, story point tahmin edilmiş (Planning Poker, Fibonacci 1-13), test edilebilir bir senaryosu var.

### 1.3 Definition of Done (DoD)

Bir story tamamlandı sayılması için: kod review onayı (en az 1 kişi), unit test coverage ≥ %70, integration test yeşil, lint + type-check temiz, security scan (Semgrep + npm audit) clean, Storybook (varsa UI komponenti) güncel, OpenAPI spec güncel, Sentry'de yeni hata yok, accessibility audit (axe) clean, docs/Confluence güncel, staging'e deploy edilmiş ve smoke test geçmiş.

### 1.4 Ekip Yapısı

1× Product Manager, 1× Tech Lead, 2× Frontend Developer (React + TypeScript), 2× Backend Developer (Node.js + TypeScript), 1× DevOps/SRE, 1× UI/UX Designer, 1× QA Engineer (otomasyon ağırlıklı), 0.5× Security Engineer (güvenlik review'ları ve kritik sprint'lerde), 0.5× Data Engineer (Sprint 6+ MERSİS/News pipeline'ı için). Claude Code, geliştiriciler tarafından boilerplate, test üretimi, schema migrasyonu ve refactoring'de kullanılır.

### 1.5 Sprint Kapasitesi

Ekip kapasitesi sprint başına ~80 story point (4 dev × ~20 SP). %20 buffer ayrılır (incident, teknik borç, support). Her sprint en az 1 teknik borç / refactor task'ı içermeli.

### 1.6 Sürüm Stratejisi

**Alpha (Sprint 4 sonu):** İç ekip kullanır, sahada test yok. **Beta (Sprint 8 sonu):** 3 pilot şube. **GA-RC (Sprint 13 sonu):** 25 şube genişletilmiş pilot. **GA (Sprint 16 sonu):** Tüm banka rollout. Her sürümde feature flag (LaunchDarkly veya self-hosted Unleash) kullanılır.

---

## 2. Sprint Bağımlılık Grafiği

```
S0 (Setup)
 └─► S1 (Auth + Multi-tenant)
      ├─► S2 (Harita + Places çekirdek)
      │    └─► S3 (Keşif: alan, filtre, cluster)
      │         └─► S4 (Firma Detay + Cache)
      │              ├─► S5 (Web Summarizer + Etiket)
      │              ├─► S6 (MERSİS)        [paralel]
      │              ├─► S7 (News + Sektör) [paralel]
      │              └─► S8 (Ziyaret Listeleri)
      │                   └─► S9 (Rota + Takvim)
      │                        └─► S10 (Ziyaret Kaydı)
      │                             └─► S11 (Pipeline)
      │                                  └─► S12 (Dashboard)
      │                                       └─► S13 (AI Lead Scoring)
      │                                            └─► S14 (PWA + Offline)
      │                                                 └─► S15 (Hardening)
      │                                                      └─► S16 (Lansman)
      └─► S0 boyunca paralel: design system, infra
```

S6 ve S7, S5 ile paralel çalışılabilir (farklı ekip üyeleri). S2-S4 çekirdek, geri kalan sprint'ler S4'ün üstüne bina edilir.

---

## 3. Sprint Detayları

### Sprint 0 — Hazırlık ve Altyapı (Hafta 1-2)

**Hedef:** Ekibin Sprint 1'de kod yazmaya başlamak için tam donanımlı olması.

**Kapsam:** Repo (monorepo, Turborepo veya Nx) kurulumu — `apps/web`, `apps/api`, `apps/worker`, `packages/shared`, `packages/ui`. Docker Compose ile local dev environment (Postgres + PostGIS, Redis, MinIO/S3 mock). CI/CD pipeline (GitHub Actions veya GitLab CI) — lint, test, build, security scan, staging deploy. Cloud altyapı: dev + staging + prod environment'ları (AWS veya GCP), Terraform ile IaC. Google Cloud projesi açılışı, Places API + Maps JS SDK + Directions API enable, billing alarms ($500/$2000/$5000 tier). Design system iskeleti (Figma): renk paleti, tipografi, base komponentler. Storybook kurulumu. Sentry, Datadog/Grafana, log aggregation kurulumu. Claude Code workspace dokümantasyonu (CLAUDE.md, kod stil rehberi).

**Teknik Görevler:**
- Monorepo + Turborepo skeleton, ESLint + Prettier + Husky pre-commit
- TypeScript strict mode, path aliases, base tsconfig
- Prisma init + ilk migration (boş schema)
- Docker Compose: postgres-postgis:15, redis:7, minio
- GitHub Actions: lint/test/build/deploy matrix
- Terraform modules: VPC, RDS, ElastiCache, ECS/EKS, S3, Cloudfront
- Sentry SDK entegrasyonu (frontend + backend)
- OpenAPI generator + zod validator
- Figma design tokens → Tailwind config sync

**Definition of Done:** Bir geliştirici `git clone` + `pnpm install` + `docker compose up` ile 10 dakikada local'de çalışan bir hello-world görür. CI'da örnek bir PR yeşil yanar. Staging URL gezilebilir (404 sayfası).

**Demo:** Ekip içi infra tour, design system Storybook turu.

**Riskler:** Cloud hesap onayı banka tarafında gecikebilir → Sprint 0 öncesi 2 hafta erken talep. Google API quota onayı 24-72 saat → Sprint 0 başında talep.

---

### Sprint 1 — Auth, Multi-tenant ve Kullanıcı Yönetimi (Hafta 3-4)

**Hedef:** Bir admin tenant açıp kullanıcı davet edebilir, kullanıcı login olabilir.

**User Stories:**

US-1.1 *Admin olarak yeni bir tenant (banka) ve admin hesap oluşturabilmeliyim* — AC: super-admin paneli, tenant adı + slug + admin email, davet email'i gider. SP: 5

US-1.2 *Admin olarak şube müdürünü davet edebilmeliyim* — AC: kullanıcı email + rol + atanan şube; davet linki 24h geçerli; ilk girişte parola belirleme + MFA setup. SP: 8

US-1.3 *Kullanıcı olarak email + parola + TOTP ile giriş yapabilmeliyim* — AC: argon2id parola, JWT access (15dk) + refresh (7gün), TOTP zorunlu, 5 başarısız denemede 15dk lockout. SP: 8

US-1.4 *Admin olarak şube tanımlayabilmeliyim* — AC: şube kodu, adı, adresi (Google geocoding), catchment polygon (Figma'da çizilen poligon koordinatlarını yapıştırma veya harita üzerinde çizme — basit versiyon). SP: 5

US-1.5 *Bölge müdürü olarak kendine bağlı şubeleri görebilmeliyim* — AC: bölge → şubeler many-to-many tablo, ekran sadece liste. SP: 3

US-1.6 *Tüm tablolarda tenant_id kolonu ve row-level security* — AC: Postgres RLS policy, her sorguda otomatik tenant filtresi. SP: 8

**Teknik Görevler:**
- Prisma schema: tenants, users, branches, regions, region_branches, invitations
- Email servisi (Postmark veya Resend), şablonlar (davet, parola sıfırlama)
- TOTP (otplib), QR kod oluşturma, recovery codes (10 adet, hash'lenmiş)
- Audit log middleware (her auth eventini logla)
- API: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/setup-totp`, `/invitations/accept`
- Frontend: Login, Setup MFA, Accept Invitation, Admin/Users, Admin/Branches sayfaları
- Cypress E2E: tam invite-to-login flow

**Definition of Done:** 1 admin + 1 bölge müdürü + 2 şube müdürü hesabı oluşturulup giriş yapılır. Tenant izolasyonu test edilir (Tenant A kullanıcısı Tenant B verisini sorgulayamaz — pen test scenario).

**Demo:** Admin panel turu, yeni şube müdürü davet → giriş senaryosu canlı.

**Riskler:** RLS performans etkisi → benchmark Sprint 1'de yapılmalı, indeksleme gerekirse Sprint 2'ye taşınır.

---

### Sprint 2 — Harita Çekirdeği ve Google Places Entegrasyonu (Hafta 5-6)

**Hedef:** Şube müdürü giriş yapınca kendi şubesinin haritasını görür ve etrafında firmaları pin olarak görür.

**User Stories:**

US-2.1 *Şube müdürü olarak login sonrası kendi şubemin merkez olduğu haritayı görmeliyim* — AC: harita zoom 14, şube ikonu merkez, kullanıcının catchment polygonu ince çizgili overlay. SP: 5

US-2.2 *Haritada belirli bir koordinat etrafında nearby search yapabilmeliyim (backend)* — AC: `GET /api/places/search?lat=&lng=&radius=&category=`, Google Places Nearby Search çağrısı, max 200 sonuç, Postgres'e place_id + temel alanlar yazılır (cache). SP: 8

US-2.3 *Frontend'de search sonuçlarını pin olarak görebilmeliyim* — AC: pin renkleri kategoriye göre, hover'da tooltip (firma adı), zoom-in pin; >50 pin durumunda supercluster ile clustering. SP: 8

US-2.4 *Place ID kalıcılaştırma ve dedupe* — AC: aynı place_id 2 kere yazılmaz; mevcut kayıt update edilir, last_enriched_at güncellenir. SP: 3

US-2.5 *Field mask ve cost-efficient API çağrıları* — AC: Nearby Search'te sadece `places.id, places.displayName, places.location, places.types` istenir; Place Details ayrı endpoint'te (Sprint 4). SP: 3

US-2.6 *Yarıçap seçici (500m, 1km, 2km, 5km)* — AC: harita üzerinde daire overlay, yarıçap değişince yeni search tetiklenir, debounce 800ms. SP: 5

**Teknik Görevler:**
- Google Maps JavaScript SDK lazy load, AdvancedMarkerElement kullan (yeni API)
- Backend `PlacesProvider` interface + `GooglePlacesProvider` implementasyonu
- Redis cache wrapper (TTL 30 gün, key pattern `places:nearby:{geohash6}:{cat}`)
- Postgres `companies` tablosu + PostGIS GIST index (`location`)
- supercluster integrasyonu, cluster pin custom render
- Rate limiter (express-rate-limit + Redis store): user başı 60/dk
- Cost tracking middleware: her Places API çağrısını ayrı tabloya logla (analytics için)

**Definition of Done:** Kadıköy'de bir test şubesi açılır, harita Kadıköy merkezine zoom yapar, "1km yarıçap" seçildiğinde Bağdat Caddesi'ndeki ~150 firma 2 saniyede pin olarak gelir.

**Demo:** Canlı, "haritayı kaydır → yeni search → pin'ler güncelleniyor" akışı.

**Riskler:** Places API New vs Legacy farkı → New API kullan (Mart 2025'te Legacy deprecate edildi). Quota aşımı pilot sırasında → Sprint 2 sonu Cloud Console'da budget alert + hard cap test edilir.

---

### Sprint 3 — Keşif: Alan Çizimi, Kategori Filtresi, Adres Arama (Hafta 7-8)

**Hedef:** Müdür haritada serbest poligon çizebilir, kategoriye göre filtreleyebilir, adres yazıp gidebilir.

**User Stories:**

US-3.1 *Haritada serbest poligon çizip o alandaki firmaları listeleyebilmeliyim* — AC: "Alan Çiz" butonu → Google Drawing Manager → poligon kapatıldığında poligon koordinatları backend'e gönderilir, içine düşen firmalar listelenir (PostGIS `ST_Contains` cache'ten + gerekirse fresh search). SP: 13

US-3.2 *Kategori multi-select filtresi* — AC: 10 ana kategori (Restoran, Perakende, İmalat, Sağlık, Eğitim, Hizmet, Otomotiv, İnşaat, Toptan, Diğer), filtreler URL query'de tutulur (paylaşılabilir), sadece istemci-side filtreleme (cache'ten). SP: 5

US-3.3 *Adres arama (autocomplete)* — AC: Google Places Autocomplete component, seçilen yer haritayı oraya pan/zoom eder, opsiyonel olarak o noktada otomatik yarıçap search'i tetiklenir. SP: 5

US-3.4 *Kayıtlı aramalar* — AC: müdür "Kadıköy Bağdat Cd. - Restoran" gibi adlandırıp kaydeder, sol panelde liste, tek tık ile geri yüklenir. SP: 5

US-3.5 *Pin yoğunluk haritası (heatmap toggle)* — AC: zoom < 13 olduğunda heatmap, üstünde pin; zoom > 13'te sadece pin. SP: 5

**Teknik Görevler:**
- Google Maps Drawing Library entegrasyonu, polygon serialize/deserialize (GeoJSON)
- Backend `POST /api/places/search/polygon` endpoint
- PostGIS `ST_Contains(polygon, location)` query optimizasyonu (GIST index zorunlu)
- Frontend filtre state (Zustand), URL sync (nuqs library)
- `saved_searches` tablosu: id, user_id, name, query_json, created_at
- Heatmap layer (google.maps.visualization.HeatmapLayer)
- E2E test: poligon çiz → kategori filtrele → kaydet → çıkış → tekrar yükle

**Definition of Done:** Müdür Kadıköy'ün belirli bir mahallesini poligonla işaretler, "Restoran + Kafe" filtresi ile o mahallede 80 firma görür, "Mahalle X Restoranlar" diye kaydeder.

**Demo:** Poligon çizimi + filtre + kayıtlı arama yükleme akışı canlı.

**Riskler:** Çok büyük poligon (>50 km²) abuse → backend'de poligon alanı validation (max 100 km²), aşıldıysa kullanıcıya küçültme önerisi.

---

### Sprint 4 — Firma Detay Paneli, Place Details Cache, Foto Galeri (Hafta 9-10)

**Hedef:** Müdür bir pine tıklayınca firmanın tüm Google verilerini görür; aynı firmayı 2. kez açtığında API çağrısı tetiklenmez.

**User Stories:**

US-4.1 *Pin'e tıklayınca sağ panel açılsın, firma detayı görünsün* — AC: slide-in animation, ana sekme "Genel" (isim, adres, telefon, web, açılış saatleri, rating, review sayısı, kategori). SP: 8

US-4.2 *Place Details API çağrısı + 30 günlük cache* — AC: ilk tıklamada Google Place Details (field mask: displayName, formattedAddress, nationalPhoneNumber, websiteUri, regularOpeningHours, rating, userRatingCount, photos[ilk 10]); response Redis'e + Postgres'e yazılır; 2. tıklama 100ms cache'ten döner. SP: 8

US-4.3 *Fotoğraf galerisi* — AC: ilk 10 foto thumbnail, tıklayınca lightbox; foto URL'leri 1 saatlik signed URL (Google Place Photos), arka planda S3'e mirror için job (foto'nun kalıcı linki için). SP: 8

US-4.4 *Açılış saatleri görselleştirme* — AC: bugün açık/kapalı badge, hover'da haftalık tablo, Türkçe gün adları. SP: 3

US-4.5 *Web sitesi linkine tıklama metriği* — AC: dış link tıklama event'i analytics'e yazılır (pipeline analizi için). SP: 2

US-4.6 *"Detayları Yenile" butonu* — AC: cache invalidate + fresh fetch, son güncelleme tarihi gösterilir. SP: 3

**Teknik Görevler:**
- BullMQ worker: foto mirror job (Google Photo URL → S3)
- `place_details_cache` Redis structure, TTL 30 gün
- API cost monitoring dashboard (Grafana panel)
- Lightbox component (yet-another-react-lightbox)
- Signed URL refresh logic (TTL bittiğinde otomatik yeni URL)

**Definition of Done:** İlk tıklamada panel 1.5 saniyede açılır, 2. tıklamada 200ms'de açılır. Cost tracking'de "1000 unique pin tıklaması = 1000 Place Details çağrısı, sonraki 1000 = 0 çağrı" doğrulanır.

**Demo:** Cache miss vs cache hit ölçümü canlı (DevTools network panelinde).

**🏁 Alpha Release:** Sprint 4 sonunda iç ekip için kullanılabilir alpha. Henüz saha kullanımı için hazır değil.

---

### Sprint 5 — Web Site Summarizer, Etiket ve Not Sistemi (Hafta 11-12)

**Hedef:** Firma detayında firmanın kendi web sitesinden çıkarılmış kısa özet görünür; müdür kendi etiket ve notunu ekler.

**User Stories:**

US-5.1 *Firmanın websiteUri'si varsa, ana sayfa + iletişim sayfası fetch edilip LLM ile özetlensin* — AC: arka plan job (BullMQ), headless Chromium ile 2 sayfa fetch (timeout 10s, robots.txt respect), Anthropic Claude Haiku ile JSON output (faaliyet, ürün/hizmet listesi, e-posta, tel, sosyal medya); özet `companies.website_summary_text` kolonuna yazılır; UI'da panelde "Web Sitesi Özeti" sekmesi. SP: 13

US-5.2 *Özetleme job'unun durumu* — AC: 4 durum (queued, running, completed, failed); UI'da kullanıcıya "Özet hazırlanıyor..." spinner; 30s sonra failed olursa "Tekrar dene" butonu. SP: 5

US-5.3 *Etiket (tag) sistemi* — AC: kullanıcı serbest tag ekler ("Yüksek Öncelik", "Aile Şirketi"); aynı tenant içinde tag'ler ortak havuzda autocomplete'lenir; pinler tag'e göre renklendirilebilir (legend). SP: 8

US-5.4 *Firma notu* — AC: serbest metin (markdown destekli, max 5000 karakter); kim ne zaman yazdı görünür; düzenleme history'si tutulur. SP: 5

US-5.5 *Robots.txt ve etik tarama* — AC: scrape öncesi robots.txt parse, disallow ise atlanır; user-agent "BranchScoutBot/1.0 (+url)"; rate limit aynı domain'e 1 req/sec. SP: 5

**Teknik Görevler:**
- Playwright headless Chromium + sandbox container (isolation)
- robots-parser kütüphanesi
- Anthropic SDK entegrasyonu, prompt template + Zod schema doğrulama
- LLM cost tracking ($/firma metriği)
- `tags` ve `company_tags` tabloları
- Markdown editor (Tiptap veya Lexical)
- `company_notes` + `company_note_revisions` tabloları

**Definition of Done:** 100 firma için web summarizer çalıştırılır, %80 başarı oranı, ortalama özet kalitesi (manuel review) 4/5.

**Demo:** Bir firma seç → özet gel → etiket ekle → not yaz → diğer kullanıcı görsün.

**Riskler:** LLM token maliyeti → Haiku kullan (Sonnet pahalı), output tokens 500 max. Hatalı/spam web siteler → blacklist + manuel skip.

---

### Sprint 6 — MERSİS / Ticaret Sicil Entegrasyonu (Hafta 13-14)

**Hedef:** Firma detayında "Resmi Kayıt" sekmesinde MERSİS verileri görünür.

**User Stories:**

US-6.1 *Firma için MERSİS lookup tetikle (manuel)* — AC: panel'de "Resmi Kaydı Çek" butonu; Telefon veya unvan + adres ile aday eşleşmeler listelenir; kullanıcı doğru kaydı seçer. SP: 13

US-6.2 *MERSİS kayıt gösterimi* — AC: ticari unvan, vergi no, MERSİS no, kuruluş tarihi, sermaye, NACE kodu + açıklaması, ortaklar tablosu, temsilciler tablosu. SP: 8

US-6.3 *Otomatik MERSİS enrichment job (opsiyonel toggle)* — AC: bir firma ziyaret listesine eklendiğinde, MERSİS lookup arka planda otomatik tetiklenir (yüksek confidence eşleşme varsa otomatik bağla, yoksa kullanıcıya sor). SP: 8

US-6.4 *Yıllık yenileme* — AC: MERSİS verisi 12 ay sonra "stale" işaretlenir, panelde "Güncelle" CTA. SP: 3

US-6.5 *Birden fazla provider abstraction* — AC: `MersisProvider` interface, ilk implementasyon doğrudan MERSİS, ikinci implementasyon 3. parti API (KobiEfor/Dinamo); config bazlı seçim. SP: 5

**Teknik Görevler:**
- MERSİS resmi servisi (varsa) WSDL/REST research; alternatif olarak lisanslı 3. parti sözleşmesi
- Provider adapter pattern, fallback chain
- `mersis_lookups` tablosu (lookup history audit için)
- Ortak/temsilci verisi için ayrı tablolar (companies_partners, companies_representatives)
- Veri kalitesi raporu (eşleşme oranı, hatalı eşleşme yüzdesi)

**Definition of Done:** Pilot şubedeki 200 firma manuel MERSİS lookup yapılır, %85+ başarı oranı.

**Demo:** Bir firma için MERSİS çekme akışı canlı.

**Riskler:** MERSİS resmi servisi açık olmayabilir → 3. parti sağlayıcı plan B; Sprint 0'da bu yol açılmış olmalı (sözleşme).

---

### Sprint 7 — Haber Taraması (Google News) ve Sektör Verisi (TBB/BDDK) (Hafta 15-16)

**Hedef:** Müdür firma hakkında son haberleri ve sektör penetrasyonunu görür.

**User Stories:**

US-7.1 *Firma adı ile son 12 ay Google News taraması* — AC: panel'de "Haberler" sekmesi, 5 başlık + tarih + source + link; sonuçlar 7 gün cache. SP: 8

US-7.2 *Haber özetleme (LLM)* — AC: her haberin 1-2 cümle özeti (Claude Haiku); pozitif/nötr/negatif sentiment etiketi. SP: 8

US-7.3 *NACE kodu bazlı sektör benchmark'ı* — AC: TBB/BDDK'dan aylık batch ile çekilen sektörel veri (kredi penetrasyonu, ortalama mevduat); panel'de "Sektör" sekmesi, firma NACE kodu varsa karşılaştırma. SP: 8

US-7.4 *Bölgesel sektör yoğunluğu* — AC: müdür "bu mahallede en yoğun sektör nedir?" sorusunu görsel olarak cevaplayan bar chart. SP: 5

US-7.5 *News provider abstraction* — AC: `NewsProvider` interface, ilk impl Google News RSS / SerpAPI; gelecekte alternatifler. SP: 3

**Teknik Görevler:**
- News fetch service (SerpAPI veya Google News RSS), rate limit
- News cache tablosu + Redis warm cache
- Sentiment classifier prompt + Zod schema
- TBB/BDDK CSV ingestion ETL pipeline (BullMQ scheduled job, aylık)
- `sector_benchmarks` tablosu (NACE × bölge × ay)

**Definition of Done:** Pilot şubedeki 50 firma için haber sekmesi anlamlı sonuç döndürür (manuel review).

**Demo:** İyi bilinen bir firma örneğinde (örn. yerel bir restoran zinciri) haber + sentiment + sektör paneli.

---

### Sprint 8 — Ziyaret Listeleri ve Liste Yönetimi (Hafta 17-18)

**Hedef:** Müdür firmaları "Ziyaret Listesine" ekler, listeleri yönetir.

**User Stories:**

US-8.1 *Firmayı ziyaret listesine ekle/çıkar* — AC: panel'deki "Ziyaret Listesine Ekle" butonu, dropdown ile mevcut listelerden seç veya yeni liste oluştur. SP: 5

US-8.2 *Birden fazla liste yönetimi* — AC: kullanıcı birden fazla liste oluşturabilir ("Bu Hafta", "İmalatçılar", "VIP Hedefler"); her listede firmalar görüntülenir. SP: 8

US-8.3 *Listede toplu işlemler* — AC: liste içinde firmaları seç → toplu MERSİS lookup, toplu rota oluştur, toplu silme, toplu etiket. SP: 8

US-8.4 *Liste paylaşımı* — AC: aynı tenant içinde liste başka bir kullanıcıyla paylaşılabilir (read-only veya edit); paylaşılan listeler "Paylaşılanlar" sekmesinde. SP: 8

US-8.5 *Liste export (CSV/Excel)* — AC: liste içeriği seçilen alanlarla export edilir (firma adı, adres, telefon, vergi no, etiket vs). SP: 5

US-8.6 *Liste haritada* — AC: listedeki firmalar haritada özel renkte pin olarak gösterilebilir (toggle). SP: 3

**Teknik Görevler:**
- `visit_lists`, `visit_list_items`, `visit_list_shares` tabloları
- Bulk operation queue (tek tek API yerine batch)
- ExcelJS ile xlsx üretimi
- Paylaşım için tenant + user RLS uyumu

**Definition of Done:** 1 müdür 3 farklı liste oluşturur, birini bölge müdürü ile paylaşır, bölge müdürü görebilir ve üzerinde rota oluşturabilir.

**Demo:** Liste yaratma → bulk MERSİS → paylaşım → export akışı.

**🏁 Beta Release:** Sprint 8 sonunda 3 pilot şubeye açılır.

---

### Sprint 9 — Rota Optimizasyonu ve Takvim/iCal Entegrasyonu (Hafta 19-20)

**Hedef:** Müdür liste seçer, "Çarşamba günü için rota oluştur" der, optimize edilmiş rotayı takvimine alır.

**User Stories:**

US-9.1 *Rota optimizasyonu* — AC: kullanıcı liste + tarih + başlangıç saati + ziyaret başına süre seçer; backend Google Directions API ile şube → tüm firmalar → şube optimum sırasını hesaplar (TSP); 2-15 firma destekler. SP: 13

US-9.2 *Rota görselleştirme* — AC: harita üzerinde polyline çizgisi, sıra numarası ile pin'ler, sağda zaman çizelgesi; her duraktaki tahmini varış saati. SP: 8

US-9.3 *Manuel sıra düzenleme* — AC: kullanıcı sırayı sürükle-bırak ile değiştirebilir; rota anlık yeniden hesaplanır. SP: 5

US-9.4 *iCal export* — AC: rotanın .ics dosyası download edilir; Google Calendar/Outlook/Apple Calendar import edilebilir; her ziyaret 1 event (45dk default, kullanıcı düzenleyebilir). SP: 5

US-9.5 *Rota geçmişi* — AC: oluşturulan rotalar "Rotalarım" sayfasında saklanır; tıklayınca gösterilir, tekrar export edilir. SP: 3

US-9.6 *Trafik tahminli süre* — AC: Directions API'da `departure_time` gönderilir, gerçekçi süreler. SP: 3

**Teknik Görevler:**
- Google Routes API (Compute Routes / Compute Route Matrix)
- Held-Karp veya OR-Tools (yaklaşık) TSP fallback (Routes API native sıralama yetmezse)
- ICS dosya üretimi (ical-generator npm)
- `routes` + `route_stops` tabloları
- Cost: Routes API ~$5/1000 request → cache 24h, aynı liste + tarih için yeniden hesaplama

**Definition of Done:** 10 firmalı bir liste için rota 3 saniyede oluşur, iCal Google Calendar'a import edilir.

**Demo:** 8 firma için rota → manuel düzenleme → iCal export → telefonda Calendar'da görünme.

---

### Sprint 10 — Ziyaret Kaydı ve Mobil Saha Akışı (Hafta 21-22)

**Hedef:** Müdür sahada bir firmayı ziyaret ettikten sonra mobilden 30 saniyede kaydeder.

**User Stories:**

US-10.1 *Ziyaret formu (mobil-öncelikli tasarım)* — AC: rotadaki bir durağa "Ziyaret Yap" → form: görüşülen kişi adı + pozisyonu, notlar (ses-metin destekli textarea), ilgilendiği ürünler (multi-select), takip tarihi, sonuç (ilgileniyor / ilgilenmiyor / belki). SP: 13

US-10.2 *Fotoğraf/kartvizit ekleme* — AC: kameradan veya galeriden, max 5 foto, S3'e upload, EXIF temizliği (GPS koordinatı saklanır opsiyonel). SP: 8

US-10.3 *Sesli not (Whisper transcripti)* — AC: 60 saniyeye kadar ses kaydı, OpenAI Whisper veya yerel Whisper API ile metne çevrilir, kullanıcı düzenleyebilir. SP: 8

US-10.4 *Konum doğrulaması* — AC: ziyaret kaydı sırasında cihaz GPS'i firmanın koordinatından max 200m içinde mi kontrol edilir; değilse uyarı (kullanıcı "evet, ziyaret ettim" override edebilir). SP: 5

US-10.5 *Ziyaret listesi (geçmiş ziyaretler)* — AC: müdürün tüm ziyaret kayıtları kronolojik liste, filtre (tarih, sonuç, ürün ilgisi). SP: 5

US-10.6 *Ziyaret bildirimi (rotada)* — AC: rotadaki saatten 15dk önce push notification (PWA + email). SP: 5

**Teknik Görevler:**
- React mobile-first responsive layout (zaten var, ama form özel)
- Browser MediaRecorder API ses kaydı
- Whisper API entegrasyonu
- EXIF cleanup (sharp veya exifreader)
- Web Push API + service worker (basit hatırlatıcılar)
- `visits` + `visit_photos` + `visit_audio_notes` tabloları

**Definition of Done:** 5 pilot müdür sahada toplam 100 ziyaret kaydı yapar, hata oranı %5'in altında.

**Demo:** Telefondan canlı ziyaret kaydı (önceden kaydedilmiş video destekli).

---

### Sprint 11 — Pipeline ve Kanban (Hafta 23-24)

**Hedef:** Müdür ziyaret ettikleri firmaları satış aşamalarına göre takip eder.

**User Stories:**

US-11.1 *Kanban board (5 sütun)* — AC: Keşif, İletişim, Toplantı, Teklif, Kazanıldı, Kaybedildi; firma kartları sütunlar arası sürüklenebilir. SP: 13

US-11.2 *Aşama geçişinde zorunlu alanlar* — AC: her geçişte tarih + not zorunlu; "Kazanıldı"da ek alanlar (ürün, tahmini hacim TL). SP: 8

US-11.3 *Pipeline filtreleri* — AC: tarih aralığı, etiket, ürün; URL'de saklanır. SP: 5

US-11.4 *Pipeline geçmişi (timeline)* — AC: her firmanın aşama değişiklik history'si zaman çizelgesi olarak görünür. SP: 5

US-11.5 *"Sıkışan" firma uyarısı* — AC: 14 günden uzun aynı aşamada kalan firmalar dashboard'da uyarı kartı. SP: 5

US-11.6 *Pipeline metrikleri* — AC: dönüşüm oranları (Keşif → Kazanıldı %), ortalama aşama süresi, kayıp nedenleri pasta grafik. SP: 5

**Teknik Görevler:**
- @dnd-kit/core veya react-beautiful-dnd
- `pipeline_events` tablosu (audit + timeline için)
- Otomatik staleness job (her gece 14+ gün kontrol)
- Optimistik UI (drag-drop sırasında)

**Definition of Done:** Pilot grubun 1 ay sonunda her birinde aktif pipeline; en az 1 "Kazanıldı" aşaması.

**Demo:** Kanban'da bir firma Keşif'ten Kazanıldı'ya kadar tüm akış.

---

### Sprint 12 — Dashboard ve Raporlama (Hafta 25-26)

**Hedef:** Şube müdürü kendi performansını, bölge müdürü tüm şubeleri tek ekranda görür.

**User Stories:**

US-12.1 *Şube müdürü dashboard'ı* — AC: 4 KPI kartı (haftalık keşif, ziyaret, pipeline değer, dönüşüm), trend grafiği son 12 hafta. SP: 8

US-12.2 *Bölge müdürü dashboard'ı* — AC: şubeler tablosu (sıralanabilir), karşılaştırma bar chart, bölgesel ısı haritası (yoğunluk). SP: 13

US-12.3 *Liderlik tablosu (gamification)* — AC: bölge içinde ziyaret/dönüşüm sayısına göre top-10 müdür. SP: 5

US-12.4 *Excel export (rapor)* — AC: dashboard verisi formatlı .xlsx export. SP: 5

US-12.5 *PDF rapor (haftalık özet)* — AC: her cumartesi sabah müdüre haftalık özet PDF email gönderilir. SP: 8

US-12.6 *Custom rapor builder (basit)* — AC: kullanıcı "tarih, şube, kategori, metrik" seçip kendi raporunu oluşturur. SP: 8

**Teknik Görevler:**
- Recharts veya Tremor dashboard component'leri
- Backend reporting service + materialized view (gece refresh)
- Email rapor için Puppeteer (HTML → PDF)
- BullMQ scheduled jobs
- Read replica DB (raporlama OLTP'yi yormasın)

**Definition of Done:** 25 şubelik genişletilmiş pilotta dashboard'lar bölge müdürü tarafından haftalık review'lara sokulur.

**Demo:** Bölge müdürü gözüyle dashboard turu, gerçek pilot verisi.

---

### Sprint 13 — AI Lead Scoring ve Akıllı Öneriler (Hafta 27-28)

**Hedef:** Sistem, müdüre "şu firmayı bu hafta ziyaret etmelisin" diye öneri yapar.

**User Stories:**

US-13.1 *Lead scoring modeli (rule-based v1)* — AC: skorlama formülü: Google rating (yüksek + → +), açılış saatleri var mı, web sitesi var mı, MERSİS'te aktif mi, sermaye büyüklüğü, son haber sentiment, sektör penetrasyon trendi. Skor 0-100. SP: 13

US-13.2 *Skoru panelde göster* — AC: firma detayında 0-100 ring, hover'da skor bileşenleri açıklaması. SP: 5

US-13.3 *"Bu Hafta İçin Önerilenler" widget'ı* — AC: ana sayfada müdüre 10 firma önerilir (yüksek skor + henüz keşfedilmemiş + müdürün geçmişine göre). SP: 8

US-13.4 *LLM tabanlı yaklaşım önerisi* — AC: firma detayında "Yaklaşım Stratejisi" butonu, Claude ile bu firmaya nasıl yaklaşılması gerektiği öneri metni (3-5 madde, web özeti + sektör verisi + haber temelinde). SP: 8

US-13.5 *Geri besleme döngüsü* — AC: müdür önerinin yararlı olup olmadığını işaretler (👍/👎); sinyal v2 modeli için saklanır. SP: 3

US-13.6 *Skor şeffaflığı* — AC: skor bileşenleri ve ağırlıkları admin tarafından konfigüre edilebilir; kullanıcıya "neden bu skor" açıklaması. SP: 5

**Teknik Görevler:**
- Scoring service (Node), unit test edilmiş kurallar
- `lead_scores` tablosu + günlük rebuild job
- Claude API ile yaklaşım stratejisi prompt + cache
- Recommendation widget UI
- Feedback collection event'leri

**Definition of Done:** Pilot kullanıcılarının %60'ı haftada en az 1 kez "Önerilenler"den ziyaret yapar.

**Demo:** Müdür login → "Bu hafta ziyaret etmelisin" listesi → bir firmaya tıkla → AI yaklaşım önerisi.

---

### Sprint 14 — PWA, Offline ve Bildirimler (Hafta 29-30)

**Hedef:** Mobil cihazda app gibi davranır, internet kesilse bile temel özellikler çalışır.

**User Stories:**

US-14.1 *Progressive Web App (PWA) kurulum* — AC: manifest.json, service worker, "Ana Ekrana Ekle" prompt'u; iOS Safari + Android Chrome desteği. SP: 5

US-14.2 *Offline ziyaret kaydı* — AC: internet yokken ziyaret formu doldurulur, IndexedDB'ye yazılır; bağlantı geri gelince sync. SP: 13

US-14.3 *Offline harita ön-yükleme* — AC: kullanıcı şubesinin etrafındaki son aramayı offline cache'ler. SP: 8

US-14.4 *Push notification altyapısı* — AC: kullanıcı opt-in eder; sunucudan push gönderilir (Firebase Cloud Messaging veya self-hosted Web Push). SP: 8

US-14.5 *Bildirim tipleri* — AC: rota hatırlatıcı, takip tarihi yaklaştı, sıkışan firma uyarısı, haftalık özet hazır. SP: 5

US-14.6 *Bildirim merkezi (in-app)* — AC: zil ikonu, son 30 bildirim, okundu/okunmadı state. SP: 5

**Teknik Görevler:**
- Workbox ile service worker
- IndexedDB wrapper (Dexie.js)
- Background Sync API
- Web Push protokolü (web-push npm)
- Notification preference UI

**Definition of Done:** İstanbul-Anadolu Yakası'nda metroda offline ziyaret kaydı testi başarılı (gerçek pilot).

**Demo:** Wi-Fi kapatılır, uygulama hala çalışır, ziyaret kaydedilir, Wi-Fi açılır, sync gerçekleşir.

---

### Sprint 15 — Hardening: Performans, Güvenlik, Yük Testi (Hafta 31-32)

**Hedef:** GA için tüm non-functional gereksinimler karşılanmış olmalı.

**User Stories:**

US-15.1 *Yük testi* — AC: 5000 eş zamanlı kullanıcı simülasyonu (k6 veya Locust); P95 latency < 1s; backend hata oranı < 0.1%. SP: 13

US-15.2 *Penetrasyon testi (3. parti firma)* — AC: OWASP Top 10 kapsamı, kritik bulgu yok; orta bulgular fix edilmiş. SP: 13

US-15.3 *Veri tabanı index ve query optimizasyonu* — AC: tüm slow query'ler (>500ms) profillenir, index/refactor edilir. SP: 8

US-15.4 *Frontend bundle optimization* — AC: ana bundle < 300KB gz, code splitting, lazy load harita. SP: 5

US-15.5 *Disaster Recovery testi* — AC: prod DB simulated failure, restore < 1 saat. SP: 8

US-15.6 *KVKK uyum dokümantasyonu* — AC: veri işleme aydınlatması, kişisel veri envanteri, silme/erişim hakkı API'leri. SP: 8

US-15.7 *Audit log review* — AC: her kritik işlem (login, veri görüntüleme, export) loglanıyor mu test edilir. SP: 5

US-15.8 *Monitoring + Alerting tamamlanması* — AC: SLO'lar (availability 99.9%, P95 1s) tanımlı, PagerDuty bağlı, runbook'lar yazılı. SP: 5

**Teknik Görevler:**
- k6 senaryoları
- pgBadger ile query analizi
- Bundle analyzer
- Security headers (CSP, HSTS, X-Frame-Options)
- Backup + restore otomasyonu testi

**Definition of Done:** Tüm non-functional gereksinimler (PRD § 6) karşılanmış, security signoff alınmış.

**🏁 GA-RC:** Sprint 15 sonunda Release Candidate hazır.

---

### Sprint 16 — Lansman, Eğitim, Stabilizasyon (Hafta 33-34)

**Hedef:** Tüm banka rollout, müdür eğitimi, ilk 2 hafta stabilizasyon.

**User Stories:**

US-16.1 *Eğitim materyalleri* — AC: 10dk video (Türkçe), interaktif onboarding tour (Intro.js), kullanıcı el kitabı PDF. SP: 8

US-16.2 *In-app onboarding* — AC: ilk girişte 5 adımlı tour, kullanıcı atlayabilir. SP: 5

US-16.3 *Help center* — AC: 30+ FAQ, search'lenebilir, video embeded. SP: 5

US-16.4 *Pilot → tüm banka rollout planı* — AC: feature flag ile kademeli açılış (haftalık %20'şer), her dalgada gözlem. SP: 5

US-16.5 *Support kanalı* — AC: in-app chat (Intercom/Crisp) veya email + Slack uyarı. SP: 5

US-16.6 *Stabilizasyon ve hotfix* — AC: ilk 2 hafta günlük review, P0/P1 bug'lar 24h içinde düzeltilir. SP: 13 (buffer)

US-16.7 *Lansman sonrası retro* — AC: tüm ekip + ürün sahibi, kazanımlar, kayıplar, sonraki çeyrek roadmap önerileri. SP: 3

**Teknik Görevler:**
- Onboarding component
- Help center CMS (Notion veya self-hosted)
- LaunchDarkly progressive rollout config
- Status page (statuspage.io veya self-hosted)

**Definition of Done:** Tüm banka şubeleri (~600) sistemde aktif, ilk hafta DAU > %60, NPS > 30.

**🏁 GA Release:** Sprint 16 sonunda genel kullanıma açık.

---

## 4. Cross-cutting Konular (Her Sprint'te Sürekli)

### 4.1 Test Stratejisi

Her PR'da unit test (Vitest), integration test (testcontainers ile gerçek Postgres + Redis), E2E test (Playwright). Her sprint en az 1 yeni E2E senaryo. Coverage hedefi backend %80, frontend %60. Critical path E2E'leri (login, search, route, visit) her CI run'da çalışır.

### 4.2 Güvenlik

Her sprint Snyk + Semgrep + npm audit otomatik. Her quarter pen test. KVKK kontrol listesi her veri toplama özelliğinde gözden geçirilir. Sprint 15'te full audit.

### 4.3 Performans

Her sprint sonunda Lighthouse CI run, kritik sayfa P95 < 2s. Backend P95 endpoint başına izlenir. Sprint 4'ten itibaren Datadog APM aktif.

### 4.4 Erişilebilirlik (a11y)

Her UI sprint'inde axe DevTools + manuel keyboard navigasyon test. WCAG 2.1 AA hedefi.

### 4.5 Lokalizasyon

İlk sürüm sadece Türkçe. i18n altyapısı (react-i18next) Sprint 1'de kurulur, tüm metinler key bazlı (gelecek İngilizce desteği için).

### 4.6 Teknik Borç Yönetimi

Her sprint capacity'sinin %20'si teknik borç + refactor. Tech debt board ayrı; en yüksek 5 öğe her planlama'da değerlendirilir.

### 4.7 Dokümantasyon

Confluence: ürün dokümanı, API referansı (OpenAPI auto-gen), runbook, ADR (Architecture Decision Records). Her major karar bir ADR olur.

---

## 5. Risk Yönetimi (Sprint-Level)

| Risk | Olası Sprint | Etki | Önleyici Eylem |
|------|--------------|------|----------------|
| Google API quota artırımı reddedilir | S2-S4 | Yüksek | S0'da Cloud Solution Architect ile direkt görüşme; volume taahhüdü |
| MERSİS sözleşmesi gecikir | S6 | Orta | S0'da paralel hukuk track; 3. parti fallback |
| Ekip üyesi kaybı | Herhangi | Yüksek | Pair programming + Claude Code dokümante kod ile bus factor azalt |
| Pilot şube zayıf geri bildirim | S8+ | Orta | Pilot grup içine yüksek aktif kullanıcı koy; haftalık 1:1 |
| LLM maliyeti beklenenden yüksek | S5, S7, S13 | Orta | Token bütçesi + Haiku tercih + prompt cache |
| Rota optimizasyonu yavaş | S9 | Düşük | Routes API + lokal TSP fallback hibrit |

---

## 6. Sprint Sonrası — Roadmap Sonrası Sprint Önerileri (Sprint 17+)

İlk 16 sprint (8 ay) GA'ya kadar olan plan. GA sonrası roadmap önerileri (her biri 1-2 sprint):

Native mobil app (React Native, kod paylaşımlı). LinkedIn public profil eşleştirme. OCR ile kartvizit tarama → otomatik firma kaydı. CRM dış entegrasyonu (webhook + connector marketplace yaklaşımı). Birden fazla dil desteği (İngilizce, Almanca — yurt dışı bankalara). White-label markalama (multi-tenant'ta tenant başı tema). Gelişmiş AI: konversasyon-tabanlı öneri ("bu hafta İmalat sektöründe potansiyelli olanları göster"). A/B test altyapısı kalıcı (Statsig veya GrowthBook).

---

## 7. Claude Code ile Sprint Çalışma Şekli

Her sprint başlangıcında: ilgili user story'ler Claude Code'a brief edilir, Claude Code önce test (TDD), sonra implementation üretir. Geliştirici review eder, refine eder, merge eder.

Tipik sprint başında Claude Code'a verilecek brief: PRD ilgili bölümü + sprint user stories + acceptance criteria + ilgili schema/API kontratı + örnek mevcut kod referansları. Çıktı: PR-ready kod + test'ler + dokümantasyon stub'ları.

Claude Code'un en verimli kullanım alanları: schema migration, OpenAPI'dan API client + mock'lar, form validation (Zod), test üretimi, refactoring, doc string ve README. Geliştiricinin kalan odağı: iş mantığı kararları, performans optimizasyonu, UX detayları.

---

## 8. Onay ve Takip

Sprint planı Sprint 0 başlangıcında ürün sahibi ile gözden geçirilir. Her 4 sprint'te bir (yani Sprint 4, 8, 12, 16 sonunda) plan revize edilir — sahadan gelen geri bildirimle scope ayarlanır.

Sprint backlog Jira'da, sprint dokümantasyonu Confluence'da, kod ve test'ler Git'te, deploy GitOps ile. Tüm zaman çizelgesi takvim olarak ekibe paylaşılır.

---

*Bu plan canlı bir dokümandır; her sprint demo + retro sonrasında güncellenir.*
