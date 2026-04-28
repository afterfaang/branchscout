# Sprint 14 — PWA, Offline ve Bildirimler

**Süre:** 2 hafta · **Önkoşul:** Sprint 13 tamam · **Bağlı:** PRD § 6.3

## Hedef

Uygulama mobilde native gibi davranır, internet kesilse bile temel akışlar çalışır, push bildirimler aktif.

## User Stories

### US-14.1 — PWA setup (SP: 5)

**AC:**
- manifest.json (icon, name, theme color, display: standalone)
- Service worker (Workbox)
- "Ana Ekrana Ekle" prompt'u (iOS Safari + Android Chrome)
- Lighthouse PWA score ≥ 90

### US-14.2 — Offline ziyaret kaydı (SP: 13)

**AC:**
- IndexedDB (Dexie.js) ziyaret formu storage
- Background Sync API
- Internet geri gelince queue → sync
- UI'da "Bekleyen 3 senkronizasyon" badge

### US-14.3 — Offline harita ön-yükleme (SP: 8)

**AC:**
- Kullanıcının son aramasını cache'le (tile + place data)
- Service worker'da Cache API
- Offline mod indicator banner

### US-14.4 — Push notification altyapısı (SP: 8)

**AC:**
- Web Push (Firebase Cloud Messaging veya self-hosted web-push)
- Subscribe akışı (kullanıcı opt-in)
- VAPID keys
- Admin: tüm kullanıcılara duyuru gönderme

### US-14.5 — Bildirim tipleri (SP: 5)

**AC:**
- Rota hatırlatıcı, takip tarihi yaklaştı, sıkışan firma uyarısı, haftalık özet hazır
- Her tip kullanıcı tarafından opt-out edilebilir

### US-14.6 — In-app bildirim merkezi (SP: 5)

**AC:**
- Header'da zil ikonu + badge
- Son 30 bildirim
- Read/unread state
- "Tümünü okundu işaretle"

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/web/public/manifest.json` | Yeni |
| `apps/web/public/service-worker.js` | Workbox build |
| `apps/web/src/lib/{db,sync}.ts` | Dexie wrapper + sync logic |
| `apps/api/prisma/schema.prisma` | `PushSubscription`, `Notification` |
| `apps/api/src/modules/notifications/*` | Yeni |
| `apps/worker/src/jobs/sendPush.ts` | Yeni |

## DoD

- [ ] İstanbul metro testi: offline ziyaret kaydı çalışıyor
- [ ] Push iOS/Android'de tetikleniyor
- [ ] CI yeşil

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 14 — PWA + offline + push. Detay:
`docs/sprints/SPRINT_14_PWA_OFFLINE.md`, PRD § 6.3.

Story'ler: US-14.1 (5) US-14.2 (13) US-14.3 (8) US-14.4 (8) US-14.5 (5) US-14.6 (5)

Önemli:
- Workbox precache + runtime cache stratejileri ayrı.
- Dexie.js IndexedDB wrapper; ziyaret formu local-first.
- Background Sync API + fallback (manuel sync butonu).
- Web Push: VAPID, opt-in, per-tip toggle.
- iOS Safari quirks — manifest ve service worker testi gerçek cihazda.

Plan çıkar, onaylat.
```
