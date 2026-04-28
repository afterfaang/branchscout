# Sprint 10 — Saha Ziyaret Kaydı (Mobil Öncelikli)

**Süre:** 2 hafta · **Önkoşul:** Sprint 9 tamam · **Bağlı:** PRD § 5.5

## Hedef

Müdür sahada bir firmayı ziyaret ettikten sonra mobilden 30 saniyede kaydeder: form + fotoğraf + sesli not (Whisper transkripsiyon) + GPS doğrulama.

## User Stories

### US-10.1 — Ziyaret formu (SP: 13)

*Mobil-öncelikli ziyaret formu.*

**AC:**
- Rotadaki bir durakta "Ziyaret Yap" → form sayfası
- Alanlar: görüşülen kişi (ad + ünvan), notlar (textarea), ilgilendiği ürünler (multi-select chip: ticari kredi, POS, maaş ödeme, KMH, leasing, factoring), takip tarihi, sonuç (INTERESTED/MAYBE/NOT_INTERESTED/NO_CONTACT)
- Auto-save (15 sn debounce, IndexedDB)
- Submit → `Visit` kaydı + pipeline aşaması "İletişim"e otomatik

### US-10.2 — Fotoğraf yükleme (SP: 8)

*Kameradan / galeriden foto.*

**AC:**
- Max 5 foto
- Mobile: native kamera (input type=file accept="image/*" capture="environment")
- EXIF GPS opsiyonel (kullanıcı kabul ederse saklanır)
- S3'e upload + thumbnail
- `VisitPhoto` model

### US-10.3 — Sesli not + Whisper transkripsiyon (SP: 8)

*60 sn ses → metin.*

**AC:**
- Browser MediaRecorder API
- Max 60 saniye, max 5MB
- Upload → Whisper API (Anthropic Claude tutucu yok; OpenAI Whisper veya self-hosted Whisper)
- Transkripsiyon UI'da textarea olarak görünür, kullanıcı düzenleyebilir
- `TranscriptionProvider` interface

### US-10.4 — GPS doğrulama (SP: 5)

*"Burada mıyım?" kontrolü.*

**AC:**
- Submit anında cihaz GPS al (navigator.geolocation)
- Firmanın koordinatından max 200m ise `geoVerified=true`
- Aşılırsa kullanıcıya "Konumum bu firmadan 350m uzak — yine de kaydet?" uyarısı
- Override edilmiş kayıt log'lanır (audit)

### US-10.5 — Geçmiş ziyaretler (SP: 5)

*Kronolojik liste + filtre.*

**AC:**
- `/visits` sayfası: tüm ziyaret kayıtları
- Filtre: tarih aralığı, sonuç, ürün ilgisi, etiket
- Sıralama: en yeni önce
- Detay: tüm alanlar + foto galeri + ses (varsa) + transcript

### US-10.6 — Ziyaret hatırlatıcı (SP: 5)

*Rotadaki saatten 15dk önce push.*

**AC:**
- Service worker + Web Push opt-in
- Email fallback (push opt-out kullanıcılara)
- "Bu ziyareti şimdi başlat" deep link

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/api/prisma/schema.prisma` | `Visit`, `VisitPhoto`, `VisitAudioNote` |
| `apps/api/src/providers/transcription/{TranscriptionProvider,WhisperTranscriptionProvider}.ts` | Yeni |
| `apps/api/src/modules/visits/*` | Yeni |
| `apps/web/src/features/visits/*` | Yeni feature |
| `apps/web/src/lib/recording.ts` | MediaRecorder helper |
| `apps/web/public/service-worker.js` | Notification handler |

## Test Beklentisi

- Visit form integration test
- EXIF cleanup unit test (sharp veya exifreader)
- Whisper provider mock unit test
- GPS distance validation unit test
- Manuel: 5 müdür sahada toplam 100 ziyaret kaydı, hata oranı <%5

## DoD

- [ ] Tüm US AC'leri ✓
- [ ] Mobile Lighthouse PWA score ≥ 80
- [ ] CI yeşil

## Demo

1. Müdür rotada Ziyaret #3 → "Ziyaret Yap"
2. Mobilde form, kamera ile 2 foto
3. 30 saniye ses kaydı: "İşletme sahibi Ahmet Bey ile görüştüm, KMH ihtiyacı var, gelecek hafta tekrar ararım"
4. Whisper 5 saniyede metne çevirir → kullanıcı 1 kelime düzeltir
5. Submit → GPS doğrulama OK → kayıt + pipeline "İletişim"e geçer

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 10 — Saha ziyaret kaydı. Detay:
`docs/sprints/SPRINT_10_VISIT_RECORDING.md`, PRD § 5.5.

Story'ler:
- US-10.1 — Form (mobil-öncelikli) + auto-save (13 SP)
- US-10.2 — Foto upload + EXIF cleanup (8 SP)
- US-10.3 — Sesli not + Whisper (8 SP)
- US-10.4 — GPS doğrulama (5 SP)
- US-10.5 — Geçmiş ziyaretler (5 SP)
- US-10.6 — Push hatırlatıcı (5 SP)

Önemli:
- TranscriptionProvider abstraction; OpenAI Whisper API veya self-hosted.
- Auto-save IndexedDB (Dexie.js); offline-tolerant — kullanıcı internet yokken
  yazar, geri geldiğinde sync.
- EXIF GPS kullanıcı opt-in.
- Service worker minimal — sadece push notification.
- Mobile-first responsive form: tek kolon, büyük tap target'lar.

Plan çıkar, onaylat.
```
