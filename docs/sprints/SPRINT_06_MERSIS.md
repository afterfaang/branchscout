# Sprint 6 — MERSİS / Ticaret Sicil Entegrasyonu

**Süre:** 2 hafta · **Önkoşul:** Sprint 4 tamam (S5 ile paralel) · **Bağlı:** PRD § 5.3, § 7.4

## Hedef

Firma detayında "Resmi Kayıt" sekmesinde MERSİS verileri görünür. Manuel lookup + yüksek confidence durumlarında otomatik enrichment.

## Önkoşul Kontrol

- [ ] MERSİS resmi servisi veya 3. parti veri sağlayıcı sözleşmesi tamam
- [ ] API credentials `.env`'de
- [ ] Sprint 0'da başlatılan hukuki süreç tamamlandı

## User Stories

### US-6.1 — Manuel MERSİS lookup (SP: 13)

*Müdür "Resmi Kaydı Çek" ile aday eşleşme listesi görsün.*

**AC:**
- Panel'de "Resmi Kayıt" sekmesi → "Resmi Kaydı Çek" CTA
- Backend: `POST /api/v1/companies/:id/mersis/search` body: `{ name?, phone?, address? }`
- MERSİS provider candidate listesi döner (en alakalı 5)
- UI'da kullanıcı doğru kaydı seçer → bağlantı kurulur (`Company.mersisNo` set)
- Confidence skoru gösterilir (%)

### US-6.2 — MERSİS detay görünümü (SP: 8)

*Resmi kayıt sekmesinde tüm alanlar.*

**AC:**
- Ticari unvan, vergi kimlik no, MERSİS no, kuruluş tarihi, sermaye (TL), NACE kodu + açıklama
- Ortaklar tablosu (ad, hisse %, ekleme tarihi)
- Temsilciler tablosu (ad, ünvan, yetki)
- Son yıllık finansal bildirim (varsa, sağlayıcıya bağlı)

### US-6.3 — Otomatik enrichment (toggle) (SP: 8)

*Ziyaret listesine eklenince otomatik MERSİS lookup.*

**AC:**
- Tenant settings'te "Otomatik MERSİS Enrichment" toggle (admin)
- Aktifse: bir firma `VisitListItem`'a eklendiğinde `enrichMersis` job kuyruğa
- Confidence ≥ %90 → otomatik bağla
- Confidence < %90 → kullanıcı bildirimi ("MERSİS adayları seçim bekliyor")

### US-6.4 — Yıllık yenileme (SP: 3)

*MERSİS verisi 12 aylık.*

**AC:**
- `Company.mersisLastEnrichedAt` 12 ay öncesi ise "Stale" badge
- "Güncelle" CTA → fresh fetch
- Otomatik yıllık scheduled job (her firma için bir kez)

### US-6.5 — Provider abstraction (SP: 5)

*MERSİS sağlayıcı değişimi tek konfigle.*

**AC:**
- `MersisProvider` interface
- İki implementasyon hazır: `MersisOfficialProvider` (resmi servis), `KobiEforProvider` (3. parti)
- Config bazlı seçim: `MERSIS_PROVIDER=official | kobi_efor`
- Test'te `InMemoryMersisProvider`

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/api/prisma/schema.prisma` | `Company.mersis*` alanları + `MersisLookup` audit tablosu + `CompanyPartner`, `CompanyRepresentative` |
| `apps/api/src/providers/mersis/MersisProvider.ts` + 2 concrete | Yeni |
| `apps/api/src/modules/mersis/mersis.routes.ts` + `service.ts` | Yeni |
| `apps/worker/src/jobs/enrichMersis.ts` | Yeni |
| `apps/web/src/features/places/components/MersisTab.tsx` | Yeni |
| `apps/web/src/features/admin/SettingsPage.tsx` | Toggle |

## Test Beklentisi

- Provider unit test (her ikisi için ayrı mock)
- Confidence skor hesaplama unit testi
- Otomatik enrichment job idempotency
- Manual: 200 firma için lookup → %85 başarı

## Definition of Done

- [ ] Tüm US AC'leri ✓
- [ ] Veri kalitesi raporu (eşleşme oranı, hatalı eşleşme %)
- [ ] CI yeşil

## Demo Senaryosu

1. Müdür "Levent İmalat" pin'i tıklar → Resmi Kayıt sekmesi → "Çek"
2. 3 aday firma listesi (confidence %95, %78, %62)
3. En yüksek olanı seç → bağlantı kurulur
4. Sermaye, NACE, ortaklar görünür
5. Admin Settings → Otomatik Enrichment ON
6. Yeni firma listeye ekle → 5 sn sonra otomatik MERSİS bağlandı (notification)

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 6 — MERSİS entegrasyonu. Detay:
`docs/sprints/SPRINT_06_MERSIS.md`, PRD § 5.3.

Story'ler:
- US-6.1 — Manuel lookup + candidate list (13 SP)
- US-6.2 — Resmi kayıt sekmesi (8 SP)
- US-6.3 — Otomatik enrichment toggle (8 SP)
- US-6.4 — Yıllık yenileme (3 SP)
- US-6.5 — Provider abstraction + 2 impl (5 SP)

Önemli:
- Provider abstraction zorunlu — 2 implementasyon (resmi + 3. parti).
  `InMemoryMersisProvider` test fixtures ile (örnek 50 firma).
- Confidence skor: name similarity (Jaro-Winkler) × phone match × address
  proximity (PostGIS distance). Threshold ayarlanabilir.
- Audit log: her lookup `MersisLookup` tablosuna (kim, ne zaman, hangi
  candidate'lar geldi, hangisi seçildi).
- Cost tracking — 3. parti API'de her çağrı.
- Otomatik enrichment opsiyonel; tenant-level toggle.

Plan çıkar, onaylat. 3. parti sağlayıcı yoksa sadece InMemory ile başla,
gerçek provider stub bırak.
```

---

## Doğrulama

```bash
pnpm test
pnpm dev
# Pin tıkla → Resmi Kayıt → Çek → adaylar
# Settings'ten otomatik enrichment'i aç → yeni firma listeye ekle → MERSİS otomatik bağlansın
```
