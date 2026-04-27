# BranchScout — Şube Müdürü Saha Keşif ve Ziyaret Planlama Uygulaması

**Versiyon:** 1.0
**Tarih:** 24 Nisan 2026
**Doküman Tipi:** Product Requirements Document (PRD)
**Hedef Kitle:** Ürün ekibi, yazılım ekibi, Claude Code ile geliştirici

---

## 1. Yönetici Özeti

BranchScout, banka şube müdürlerinin kendi şube bölgelerindeki (catchment area) KOBİ ve kurumsal şirketleri harita üzerinden keşfetmesini, bu firmalar hakkında resmi ve ticari veri katmanlarını tek ekranda görmesini ve saha ziyaretlerini rotalayarak planlamasını sağlayan bir web uygulamasıdır.

Uygulama, **Google Places API** üzerinden coğrafi şirket verisini, **MERSİS / Ticaret Sicil Gazetesi** üzerinden resmi şirket kayıtlarını ve **TBB / BDDK** üzerinden sektör verilerini birleştirerek şube müdürüne "gidip kapısını çalabileceği potansiyel müşteri" listesi üretir. Müdür listeden seçtiği firmalarla günlük/haftalık ziyaret rotası oluşturur, ziyaret sonucunu sisteme girer ve pipeline'ı takip eder.

**Hedef:** Yeni müşteri kazanım hızını artırmak, şube müdürünün saha verimliliğini yükseltmek, her müdürün aynı kalitede ve veri destekli bir prospecting süreci işletmesini sağlamak.

---

## 2. Problem Tanımı

Bugün şube müdürleri yeni müşteri kazanımı için genellikle:

1. Kişisel ağına, eski müşteri listelerine veya tesadüfi saha gözlemine güveniyor.
2. Bölgedeki firmaları sistematik bir şekilde tarayamıyor; hangi mahallede kaç işletme olduğunu bilmiyor.
3. Ziyaret öncesi firmanın vergi numarası, sermayesi, ortakları, mevcut bankacılık ilişkileri gibi bilgilere birleşik bir ekrandan ulaşamıyor.
4. Ziyaretleri tek tek planlıyor; coğrafi optimizasyon yapılmıyor, aynı güne uzak noktalar düşebiliyor.
5. Ziyaret sonuçları Excel/kağıt üzerinde kalıyor; yönetim raporlaması zayıf.

Sonuç: kazanım performansı müdürden müdüre aşırı değişken, veri odaklı değil ve ölçeklenmiyor.

---

## 3. Hedefler ve Başarı Kriterleri

### 3.1 İş Hedefleri

Şubenin catchment area'sındaki hedeflenebilir KOBİ sayısının keşfedilme oranını 6 ay içinde %80'e çıkarmak. Şube başına ortalama ziyaret sayısını ayda %40 artırmak. Ziyaret başına dönüşüm oranını (hesap açılışı, ürün satışı) %25 iyileştirmek. Yeni şube müdürlerinin saha öğrenme süresini 3 aydan 3 haftaya indirmek.

### 3.2 Ürün Başarı Metrikleri (KPI)

Günlük aktif kullanıcı oranı (şube müdürleri bazında) %85+. Her şube müdürünün haftada en az 1 rota oluşturması. Oluşturulan rotaların %70'inin tamamlanması. Keşfedilen firmaların %30'unun ziyaret edilmesi. Kullanıcı memnuniyet skoru (NPS) 40+.

---

## 4. Kullanıcı Persona ve Kullanım Senaryoları

### 4.1 Birincil Persona — Ayşe, Şube Müdürü

40 yaşında, KOBİ bankacılığı deneyimli bir şube müdürü. Günün %40'ını saha ziyaretlerine ayırmak istiyor fakat hangi firmaları ziyaret edeceğini planlamakta zorlanıyor. Mobil cihazından saha çalışması sırasında uygulamayı kullanmak istiyor; ofise döndüğünde masaüstünde rapor almak istiyor.

### 4.2 İkincil Persona — Mehmet, Bölge Müdürü

Kendisine bağlı 12 şubenin performansını izliyor. Hangi şubenin saha aktivitesi yüksek, hangisinin düşük görmek istiyor. Şubeler arası best practice paylaşımını teşvik etmek için dashboard'a ihtiyaç duyuyor.

### 4.3 Temel Kullanım Senaryoları

**Senaryo 1 — Bölge Keşfi:** Ayşe haritada kendi şubesinin etrafındaki bir mahalleyi çiziyor veya adres yazıyor. Sistem o poligon içindeki tüm ticari firmaları Google Places'ten çekip haritada pin olarak gösteriyor. Ayşe kategoriye göre filtreliyor (restoran, imalat, toptan ticaret vs.).

**Senaryo 2 — Firma Derinlemesine Araştırma:** Ayşe bir pine tıklıyor. Sağ panelde Google Places verileri (isim, adres, telefon, rating, web, fotoğraflar, açılış saatleri); firma web sitesinden otomatik scrape edilmiş özet (faaliyet açıklaması, e-posta, sosyal medya bağlantıları); MERSİS / Ticaret Sicil verisi (vergi no, kuruluş tarihi, sermaye, ortaklar, NACE kodu); haber/basın taraması (Google News son 12 ay); kullanıcının kendi eklediği etiketler ve notlar görüntülenir.

**Senaryo 3 — Rota Planlama:** Ayşe 8 firmayı "Ziyaret Listesi"ne ekliyor. "Rota Oluştur — Çarşamba" diyor. Sistem şube adresinden başlayıp 8 firmayı coğrafi olarak en kısa mesafede sıralayıp bir sırayla (TSP optimizasyonu ile) sunuyor. Ayşe rotayı takvimine aktarıyor, her ziyaret için zaman bloğu ayırıyor.

**Senaryo 4 — Saha Raporlama:** Ayşe ziyareti sırasında mobilden firmayı açıyor, "Ziyaret Yapıldı" işaretliyor, kısa not yazıyor ("Faaliyet Kredisi ile ilgilenebilir, 2 hafta sonra tekrar arayacağım"), fotoğraf/kartvizit ekliyor.

**Senaryo 5 — Yönetim Raporlaması:** Mehmet dashboard'da bu hafta tüm şubelerin kaç firma keşfettiğini, kaçını ziyaret ettiğini, kaç satışa dönüştüğünü tek ekranda görüyor.

---

## 5. Fonksiyonel Gereksinimler

### 5.1 Kimlik Doğrulama ve Yetkilendirme

Uygulama bağımsız bir kimlik sistemi ile çalışır (banka iç sistemlerine bağımlı değildir). Email + parola tabanlı giriş, MFA (TOTP) zorunlu. Admin tarafından kullanıcı davet sistemi ile hesaplar açılır; self-signup yoktur. Rol bazlı yetkilendirme (RBAC): şube müdürü, bölge müdürü, analist, admin. Şube müdürü yalnızca kendi şubesinin catchment area'sını görür; bölge müdürü kendine bağlı tüm şubeleri görür; admin tüm tenant'ı yönetir. Çoklu kiracı (multi-tenant) mimari — aynı SaaS aynı anda birden fazla bankaya hizmet verebilecek şekilde organizasyon (tenant) izolasyonu ile tasarlanır. (İleride opsiyonel SAML 2.0 / OIDC SSO eklenebilir; MVP'de yok.)

### 5.2 Harita ve Keşif Modülü

Uygulama açıldığında harita kullanıcının atanmış şubesinin konumuna zoom yapar. Müdür haritada: adres yazıp konum seçebilir, poligon çizip alan tanımlayabilir, yarıçap seçip daire tanımlayabilir (500m–5km). Sistem seçilen alanda Google Places API üzerinden tüm `establishment` tipindeki yerleri çeker ve pin olarak gösterir. Pin renkleri kategoriye göre değişir (yeşil: potansiyel, mavi: mevcut müşteri, gri: ilgisiz/kişisel işletme). Kategori filtreleri: Restoran & Kafe, Perakende, Toptan Ticaret, İmalat, Sağlık, Eğitim, Hizmet, Otomotiv, İnşaat, Diğer. Her seferinde max 200 pin gösterilir, yoğun bölgelerde cluster'lama yapılır.

### 5.3 Firma Detay Paneli

Pin'e tıklanınca sağ panelde firma detayı açılır ve şu veri katmanları sunulur (tüm katmanlar **kamuya açık / lisanslı tarama verilerinden** beslenir, banka iç sistemleriyle entegrasyon yoktur):

**Google Places verileri:** isim, adres, telefon, web, açılış saatleri, rating, fotoğraflar, inceleme sayısı, kategori. **Firma web sitesi otomatik özetlemesi:** firmanın websiteUri'si varsa arka planda fetch edilip ana sayfa + iletişim sayfası özetlenir (LLM ile): faaliyet açıklaması, sunduğu ürün/hizmetler, e-posta, sosyal medya linkleri. **MERSİS / Ticaret Sicil:** ticari unvan, vergi kimlik no, MERSİS no, kuruluş tarihi, sermaye, NACE kodu, ortaklar/temsilciler. **Haber/basın taraması:** Google News son 12 ay üzerinden firma adı sorgusu, en alakalı 5 başlık + tarih + link. **Sektör benchmark'ı (TBB/BDDK):** firmanın NACE kodunun bölgesel sektör büyüklüğü, ortalama ticari kredi penetrasyon oranı, sektörel büyüme trendi. **Kullanıcı zenginleştirmeleri:** kullanıcının veya ekibinin daha önce eklediği etiketler, notlar, ziyaret geçmişi, pipeline aşaması.

### 5.4 Ziyaret Listesi ve Rota Planlama

Müdür firma detayından "Ziyaret Listesine Ekle" diyebilir. Ziyaret listesi sağ üstte bir sidebar olarak tutulur. Müdür "Rota Oluştur" diyerek bir tarih seçer; sistem Google Directions API ile şube adresinden başlayıp tüm seçilen firmaları en kısa mesafeyle sıralar (TSP yaklaşık çözüm — OR-Tools veya Google'ın kendi optimizasyonu). Her ziyaret için varsayılan 45 dakika blok atanır, müdür manuel düzenleyebilir. Rota takvime gönderilir (iCal export + banka içi takvim entegrasyonu — ilk fazda iCal yeterli). Rotadaki her ziyaret için hatırlatıcı bildirim (e-posta / push).

### 5.5 Saha Ziyareti Yönetimi

Mobilden veya masaüstünden ziyaret tamamlandığında "Ziyaret Yapıldı" işaretlenir. Ziyaret formu: görüşülen kişi adı, pozisyonu, notlar (serbest metin), ilgilendiği ürünler (çoklu seçim: ticari kredi, POS, maaş ödeme, KMH, leasing, factoring), takip tarihi, fotoğraf/kartvizit ekleme. Ziyaret edilen firma pipeline'a düşer: Keşif → İletişim → Toplantı → Teklif → Kazanıldı/Kaybedildi.

### 5.6 Pipeline (Dahili)

Kanban görünümünde pipeline aşamaları. Firma kartları sürüklenip bir sonraki aşamaya taşınabilir. Her aşama geçişinde zorunlu alanlar: tarih, not. Pipeline tamamen uygulamanın kendi veritabanında tutulur — banka iç CRM'ine yazma yoktur. İhtiyaç olursa "Kazanıldı" verileri Excel/CSV export ile dışa aktarılabilir; opsiyonel webhook ile dış sistemlere event yayını ileride eklenebilir.

### 5.7 Dashboard ve Raporlama

Şube müdürü dashboard'ı: bu hafta keşfedilen firma sayısı, ziyaret edilen firma sayısı, pipeline değeri, dönüşüm oranı. Bölge müdürü dashboard'ı: şubeler karşılaştırmalı performans tablosu, harita üzerinde ısı haritası. Export: Excel (.xlsx), PDF rapor.

---

## 6. Fonksiyonel Olmayan Gereksinimler

### 6.1 Performans

Harita üzerinde 200 pin gösterirken ilk yükleme < 2 saniye. Firma detay paneli < 500ms açılmalı (veri cache'lenmiş halde). Rota hesaplama 15 firma için < 3 saniye. Sistem 5000 eş zamanlı kullanıcıyı (tüm banka şubeleri) destekleyebilmeli.

### 6.2 Güvenlik

Tüm trafik TLS 1.3. Oturum token'ları JWT, refresh + access ayrı. Rate limiting: kullanıcı başına dakikada max 60 Google Places sorgusu, sisteme yansıyan abuse kontrolü. Audit log: her firma görüntüleme, her ziyaret kaydı loglanır (KVKK + bankacılık mevzuatı gereği 5 yıl). KVKK uyumu: firma temsilci kişisel verileri (ad, telefon) bankanın veri işleme politikasına uygun şekilde saklanır, silinme hakkı desteklenir. Penetration test ve güvenlik denetimi lansman öncesi tamamlanır.

### 6.3 Erişilebilirlik ve Uyumluluk

WCAG 2.1 AA seviyesi. Chrome, Edge, Safari son 2 sürüm. Mobil responsive; iOS Safari ve Android Chrome'da tam işlevli.

### 6.4 Lokalizasyon

Tamamen Türkçe UI. Tarih formatı dd.MM.yyyy, para TL, ondalık ayraç virgül. İleride İngilizce ikinci dil desteği.

---

## 7. Sistem Mimarisi

### 7.1 Yüksek Seviye Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                    Kullanıcı (Tarayıcı)                     │
│                  React + Vite + TailwindCSS                 │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTPS / REST + WebSocket
               ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (NGINX)                       │
│                  Rate limit, TLS, routing                   │
└──────────────┬──────────────────────────────────────────────┘
               │
     ┌─────────┼──────────┬─────────────┬─────────────┐
     ▼         ▼          ▼             ▼             ▼
┌─────────┐ ┌──────┐ ┌─────────┐ ┌────────────┐ ┌──────────┐
│ Auth    │ │Places│ │ MERSIS  │ │ Visit /    │ │ Reports  │
│ Service │ │Proxy │ │ Adapter │ │ Route Svc  │ │ Service  │
└────┬────┘ └──┬───┘ └────┬────┘ └─────┬──────┘ └────┬─────┘
     │         │          │            │             │
     │    ┌────┴─────┐    │       ┌────┴─────┐       │
     │    │ Redis    │    │       │ Postgres │       │
     │    │ (cache)  │    │       │ (main DB)│       │
     │    └──────────┘    │       └──────────┘       │
     │                    │                           │
     └────────────────────┴───────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
    ┌──────────────────┐   ┌────────────────────┐
    │ Banka SSO / LDAP │   │ Banka iç CRM API   │
    └──────────────────┘   └────────────────────┘
                          │
     ┌────────────────────┼─────────────────────┐
     ▼                    ▼                     ▼
┌──────────┐       ┌──────────────┐    ┌──────────────┐
│ Google   │       │ MERSIS /     │    │ TBB / BDDK   │
│ Places   │       │ Tic. Sicil   │    │ Veri Servisi │
│ API      │       │ Entegrasyonu │    │              │
└──────────┘       └──────────────┘    └──────────────┘
```

### 7.2 Teknoloji Stack'i

**Frontend:** React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, React Query (TanStack Query), Zustand (state), React Router, Google Maps JavaScript SDK, React Hook Form + Zod.

**Backend:** Node.js 20 LTS, Express.js (veya Fastify), TypeScript, Prisma ORM, BullMQ (background jobs), Passport.js (auth).

**Veritabanı:** PostgreSQL 15 (ana DB, PostGIS eklentisi ile coğrafi sorgular), Redis 7 (cache + session).

**Altyapı:** Docker + Docker Compose (dev), Kubernetes (prod, banka mevcut infra'sı), NGINX ingress, Prometheus + Grafana (monitoring), Sentry (error tracking), ELK stack (log).

**CI/CD:** GitLab CI (bankalarda yaygın), otomatik test + lint + security scan + staging deploy.

### 7.3 Dış Servis Entegrasyonları

**Google Maps Platform (resmi, lisanslı):** Places API (New) — Nearby Search, Text Search, Place Details, Place Photos. Maps JavaScript SDK (harita render). Directions API (rota optimizasyonu). Banka kurumsal Google Cloud hesabı altında, sözleşmeli volume discount ile kullanılır.

**MERSİS / Ticaret Sicil:** MERSİS resmi web servisi (veya lisanslı 3. parti veri sağlayıcı — KobiEfor, Dinamo, Intellinx gibi).

**TBB / BDDK:** açık veri portalı (aylık batch import).

**Google News (haber taraması):** firma adına göre son 12 ay haber özeti.

**Web Site Summarizer:** firmanın websiteUri'si üzerinden kontrollü fetch + LLM özetleme servisi (kendi backend'imizde headless Chromium + Anthropic API).

> **Not:** Banka iç CRM, AD/LDAP veya başka kurum içi sistemlerle entegrasyon **YOKTUR**. Ürün, tamamen kamuya açık ve lisanslı tarama verileri ile çalışır; multi-tenant SaaS olarak konumlanır.

> **Karar:** Veri kaynağı olarak yalnızca resmi/lisanslı sağlayıcılar kullanılacaktır. Apify, scraper tabanlı 3. parti çözümler veya unofficial proxy servisleri değerlendirme dışıdır. Gerekçe için bkz. § 7.4 — Veri Kaynağı Stratejisi.

### 7.4 Veri Kaynağı Stratejisi

**İlke:** Banka uyum, BDDK denetimi, KVKK ve sözleşme riskleri nedeniyle veri tüm yaşam döngüsü boyunca yalnızca lisanslı kaynaklardan gelmelidir. Google Maps Platform ToS, scraper kullanımını açıkça yasakladığından (Section 3.2.4) Apify Google Maps Scraper, Outscraper ve benzeri gri-alan çözümler kullanılmaz. Bu kararın nedeni teknik değil regülatif: bir bankacılık denetiminde "veri kaynağı lisansı yok" bulgusu ürünü durdurma riskidir.

**Tek birincil sağlayıcı — Google Places API (New):** Tüm coğrafi firma verisi (isim, adres, kategori, telefon, web, açılış saatleri, rating, fotoğraflar) bu API'den gelir. Banka kurumsal Google Cloud anlaşması altında volume-based fiyatlama müzakere edilir (50K+ aylık çağrı için %20-40 indirim hedeflenir).

**Maliyet kontrol mekanizmaları:** Aşağıdaki katmanlı yaklaşım Google Places API maliyetini sürdürülebilir tutar.

(1) **Place ID kalıcılaştırma:** Google ToS, `place_id` alanının süresiz cache'lenmesine izin verir. Sistemde her keşfedilen yer için `place_id` PostgreSQL'de kalıcı saklanır; aynı firma bir daha asla "Search" çağrısı tetiklemez. (2) **Redis cache (30 gün TTL):** Place Details yanıtları 30 gün cache'lenir; aynı firmaya tıklayan ikinci müdür API çağrısı tüketmez. (3) **Field Mask zorunlu:** Tüm Place Details çağrıları sadece ihtiyaç olan alanları (`displayName`, `formattedAddress`, `nationalPhoneNumber`, `websiteUri`, `regularOpeningHours`, `rating`, `photos`) ister; "Pro" ve "Enterprise" SKU alanları bilinçli olarak kullanılır/dışlanır. (4) **Kullanıcı bazlı günlük quota:** Şube müdürü başına günde max 200 unique Search + 500 Detail çağrısı; aşıldığında soft limit + log + ertesi gün reset. (5) **Bölge başı tek tarama:** Aynı şube catchment'ı için 7 gün içinde aynı poligonda yeni bir Nearby Search yapılmaz, cache döner. (6) **Aylık bütçe alarmı:** Google Cloud'da $X/ay budget alert; %80'de ürün ekibine, %100'de hard cap.

**Beklenen maliyet bandı (50 şube pilot):** Aylık ~$1.500–3.500 USD aralığı (cache hit oranı %70 varsayımıyla). Tüm banka rollout (~600 şube) için aylık ~$15-25K USD aralığı; volume discount ile bunun %30 altı hedeflenir.

**Provider abstraction:** Yine de kod tarafında `PlacesProvider` interface'i tutulur (PRD § 7.1 mimarisindeki `Places Proxy` servisi). Bu, ileride Google'ın fiyatlama veya politika değişikliği olursa alternatif lisanslı sağlayıcıya (örn. Foursquare Places API, HERE Places) geçişin tek-konfigürasyon değişikliğiyle yapılmasını sağlar. Bugün için tek implementasyon: `GooglePlacesProvider`.

---

## 8. Veri Modeli (Özet)

```
users (şube müdürleri, bölge müdürleri)
  id, email, name, role, branch_id, phone, created_at

branches (şubeler)
  id, name, code, address, location (POINT), catchment_polygon (POLYGON), region_id

companies (keşfedilen firmalar — cache tablosu)
  id, tenant_id, google_place_id (unique), name, address, location (POINT),
  phone, website, category, google_rating, photos_json,
  mersis_no, vergi_no, sermaye, kurulus_tarihi, nace_kodu,
  ortaklar_json, website_summary_text, news_mentions_json,
  custom_tags_json, last_enriched_at, created_at, updated_at

visit_lists (ziyaret listeleri)
  id, user_id, name, created_at

visit_list_items
  id, visit_list_id, company_id, added_at, notes

routes (planlanan rotalar)
  id, user_id, date, status, optimized_order_json,
  start_location, total_distance_km, total_duration_min

route_stops
  id, route_id, company_id, order_index, planned_start_time,
  planned_duration_min, visit_status

visits (ziyaret kayıtları)
  id, route_stop_id, company_id, user_id, visited_at,
  contact_person_name, contact_person_role, notes,
  interested_products_json, follow_up_date, pipeline_stage,
  photos_json

pipeline_events (pipeline aşama değişiklikleri)
  id, company_id, user_id, from_stage, to_stage, note, created_at

audit_logs (KVKK + bankacılık uyumu)
  id, user_id, action, resource_type, resource_id,
  ip_address, user_agent, created_at
```

---

## 9. API Tasarımı (Örnek Endpoint'ler)

```
POST   /api/auth/login                         → SSO yönlendirme
GET    /api/auth/me                            → kullanıcı + şube bilgisi

GET    /api/places/search?bbox=...&cat=...     → harita alanında firma arama
GET    /api/places/:placeId                    → firma detayı (tüm katmanlar)
POST   /api/places/:placeId/enrich             → MERSİS + CRM enrichment tetikle

GET    /api/visit-lists                        → kullanıcının listeleri
POST   /api/visit-lists                        → yeni liste
POST   /api/visit-lists/:id/items              → firma ekle

POST   /api/routes/optimize                    → rota optimizasyon (body: company_ids, date)
GET    /api/routes/:id                         → rota detayı
GET    /api/routes/:id/export.ics              → iCal export

POST   /api/visits                             → ziyaret kaydı oluştur
PATCH  /api/visits/:id                         → ziyaret güncelle
POST   /api/visits/:id/photos                  → fotoğraf yükle

GET    /api/pipeline?user_id=...&stage=...     → pipeline listesi
PATCH  /api/pipeline/:companyId/stage          → aşama değiştir

GET    /api/reports/branch/:id/weekly          → şube haftalık raporu
GET    /api/reports/region/:id/summary         → bölge raporu
```

Tüm endpoint'ler JWT gerektirir. Response formatı:
```json
{ "data": {...}, "meta": { "timestamp": "...", "request_id": "..." } }
```
Hata formatı:
```json
{ "error": { "code": "NOT_FOUND", "message": "...", "details": {} } }
```

---

## 10. Kullanıcı Arayüzü — Ana Ekranlar

**Login ekranı:** Banka SSO butonu, tek tık yönlendirme.

**Ana harita ekranı (varsayılan):** Sol üstte şube adı + müdür adı, sol altta şube ikon, merkez: harita (Google Maps), sağ panel: filtreler + seçili firma detayı, sağ üst: ziyaret sepeti ikonu (badge'li), alt bar: "Alan Çiz", "Adres Ara", "Yarıçap Seç" butonları.

**Firma detay paneli (sağ slide-in):** Üst: firma adı + mevcut müşteri rozeti, Tablar: Genel, Resmi Kayıt, Bankacılık, Ziyaretler, alt sabit CTA: "Ziyaret Listesine Ekle" + "Hemen Ziyaret Başlat".

**Rota planlama ekranı:** Sol: ziyaret listesi kartları (sürüklenebilir), orta: harita üzerinde rota çizgisi, sağ: zaman çizelgesi, alt: "Takvime Gönder" butonu.

**Pipeline (Kanban) ekranı:** 6 kolon (Keşif, İletişim, Toplantı, Teklif, Kazanıldı, Kaybedildi), her kolonda firma kartları.

**Dashboard ekranı:** KPI kartları üstte (4 adet), altında ısı haritası + şube karşılaştırma bar chart.

---

## 11. Geliştirme Yol Haritası

### Faz 0 — Hazırlık (2 hafta)
Gereksinim netleştirme, banka IT altyapı incelemesi, Google Cloud hesap açılışı ve API quota'ları, MERSİS veri sağlayıcı sözleşmesi, güvenlik mimarisi onayı, design system ve Figma mockup'lar.

### Faz 1 — MVP (8 hafta)
Auth + SSO entegrasyonu. Harita üzerinde Google Places ile firma keşfi. Firma detay paneli (yalnız Google verisi). Ziyaret listesi oluşturma. Basit rota (optimizasyon olmadan sıra). Tek şube pilot (1 şube, 1 müdür).

### Faz 2 — Derinleşme (6 hafta)
MERSİS entegrasyonu. Banka iç CRM entegrasyonu (mevcut müşteri işaretleme). Rota optimizasyonu (Google Directions + TSP). Ziyaret kaydı ve pipeline Kanban. 5 şube pilot.

### Faz 3 — Ölçeklendirme (6 hafta)
Bölge müdürü dashboard'ı. Dashboard ve raporlama. Mobil responsive iyileştirme. TBB/BDDK veri entegrasyonu. 50 şube rollout.

### Faz 4 — Olgunlaşma (sürekli)
Tüm banka rollout. Native mobil app (React Native — opsiyonel). AI tabanlı firma önceliklendirme (ziyaret önerisi). A/B test altyapısı. Gelişmiş analytics.

**Toplam MVP + Faz 1 + Faz 2 süresi:** ~16 hafta (4 ay).

---

## 12. Risk ve Varsayımlar

### 12.1 Riskler

Google Places API maliyeti yüksek olabilir (aylık ~$X binlerce USD — aktif kullanıcı başına quota yönetimi kritik). Çözüm: agresif cache + bölge bazlı quota + aylık bütçe alert. MERSİS entegrasyonu bürokratik olabilir. Çözüm: erken başla, 3. parti veri sağlayıcı fallback planla. KVKK uyumu için veri işleme aydınlatması ve onay metni hukuk onayı gerektirir. Çözüm: Faz 0'da hukuk ekibi dahil edilmeli. Banka iç CRM API'ı dokümantasyonu eksik olabilir. Çözüm: CRM sahibi ekiple Faz 0'da uyum toplantıları. Güvenlik denetimi gecikebilir. Çözüm: pentest firmasını Faz 1 başında rezerve et.

### 12.2 Varsayımlar

Banka mevcut bir SSO sistemine (AD/LDAP/OAuth) sahip. Bankada şubeler için tanımlı catchment area poligonları var (yoksa müdürlerden çizdirilecek). Google Cloud kurumsal hesap açılabilir. MERSİS verisine doğrudan veya 3. parti üzerinden erişim mümkün. Şube müdürleri kurumsal laptop + akıllı telefon kullanıyor.

---

## 13. Ekip ve Süreç

### 13.1 Önerilen Ekip (MVP için)

1 Product Manager, 1 Tech Lead, 2 Frontend Developer, 2 Backend Developer, 1 DevOps / SRE, 1 UI/UX Designer, 1 QA Engineer, 1 Security Engineer (part-time). Claude Code geliştirme sürecinde yardımcı asistan olarak kullanılacak — özellikle boilerplate, test yazımı, API schema üretimi.

### 13.2 Metodoloji

2 haftalık sprint'ler, Jira + Confluence, weekly demo, sprint retrospective.

---

## 14. Claude Code ile Geliştirme Notları

Bu PRD `claude code` komutu ile aşağıdaki adımlarla geliştirmeye başlanmak üzere tasarlandı:

Repo iskeleti (monorepo: `/apps/web`, `/apps/api`, `/packages/shared`) ve Docker Compose üretmek için Claude Code'a PRD'nin 7. bölümü verilir. Veri modeli (Prisma schema) üretmek için 8. bölüm verilir. API endpoint'lerinin OpenAPI spec'i ve Express route handler iskeletleri için 9. bölüm verilir. React sayfa komponentleri ve shadcn/ui iskeleti için 10. bölüm verilir. MVP kapsamını Claude Code'a bir iş paketi olarak "Faz 1 MVP'yi implement et" şeklinde iteratif verilir.

Önerilen yaklaşım: her iş paketini Claude Code ile başlat, üretilen kodu Tech Lead review'a sokar, unit test coverage'ı minimum %70 tut, her PR'da security lint (npm audit + Semgrep) otomatik çalıştır.

---

## 15. Eklentiler ve Gelecek Özellikler

AI destekli firma önceliklendirme: geçmiş dönüşüm verisine dayanarak hangi firmaların en yüksek dönüşüm ihtimalli olduğunu skorlama. Sosyal medya zenginleştirmesi: LinkedIn üzerinden firma temsilcilerinin bulunması. OCR ile kartvizit tarama ve otomatik firma kaydı. Whisper tabanlı ziyaret sonrası sesli not transkripsiyonu. Push notification ile rota hatırlatıcı. Offline mod (mobil — saha ziyareti sırasında internet yoksa).

---

## 16. Onay ve Sorumlular

**Ürün sahibi:** Kurumsal Bankacılık GMY
**Teknik sahibi:** BT Genel Müdür Yardımcılığı
**Ürün müdürü:** TBD
**Güvenlik onayı:** Bilgi Güvenliği Müdürlüğü
**Hukuk onayı:** KVKK ve uyum ekibi

---

*Bu doküman Claude Code ile birlikte iteratif geliştirme için hazırlanmıştır. Her faz başlangıcında PRD revize edilecektir.*
