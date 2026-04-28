# Sprint 1 — Auth, Multi-tenant ve Kullanıcı Yönetimi

**Süre:** 2 hafta · **Önkoşul:** Sprint 0 tamam · **Bağlı:** PRD § 5.1, ARCHITECTURE § 4, § 9, ADR-004

## Hedef

Bir admin tenant açıp şube müdürü davet edebilir, kullanıcı email + parola + TOTP ile giriş yapar, korumalı endpoint'ler tenant izolasyonu ile çalışır. Sprint sonunda 1 admin + 1 bölge müdürü + 2 şube müdürü uçtan uca akışı yaşar.

## Önkoşul Kontrol

- [ ] Sprint 0 monorepo iskeleti çalışıyor (`pnpm dev` ile API + web ayakta)
- [ ] Postgres + PostGIS erişilebilir (`DATABASE_URL` set)
- [ ] Email servisi (Postmark / Resend) için API key (yoksa Mailhog ile dev)

## Mevcut Durum (önceki PR'da yapıldı)

Aşağıdaki parçalar **zaten hazır** — sprint başlangıcında `git pull` sonrası elinde olacaklar:

- `apps/api/src/plugins/jwt.ts` — access/refresh token issue + verify, `app.requireAuth`
- `apps/api/src/plugins/prisma.ts` — Fastify Prisma decorator
- `apps/api/src/plugins/tenantContext.ts` — log enrichment (Sprint 2'de RLS'e bağlanacak)
- `apps/api/src/modules/auth/{schema,service,routes}.ts` — `POST /login`, `POST /refresh`, `GET /me`
- `apps/api/prisma/migrations/manual/01_enable_rls.sql` — Tenant/User/Region/Branch için RLS policy + permissive fallback
- `apps/api/scripts/apply-manual-migrations.ts` + `db:migrate:manual` script
- `apps/web/src/lib/apiClient.ts` — bearer token + ApiError
- `apps/web/src/features/auth/{authStore,authApi,LoginPage}.tsx` — login formu çalışıyor
- `apps/web/src/components/{ProtectedRoute,AppShell}.tsx` — guard + logout
- `eslint.config.js`, `.github/workflows/ci.yml`, PR template
- Vitest testler: `jwt.test.ts` (5 case), `auth.service.test.ts` (8 case)

## Bu Sprint'te Tamamlanacak User Stories

### US-1.2 — Kullanıcı davet sistemi (SP: 8)

*Admin olarak şube müdürü davet edebilmeliyim.*

**AC:**
- `POST /api/v1/admin/users/invite` (admin only) → email, ad, rol, branchId; davet email'i 24h geçerli token ile gönderilir
- `GET /api/v1/invitations/:token` → davet detayları (token validation)
- `POST /api/v1/invitations/accept` → token + parola → kullanıcı aktif olur, otomatik login response döner
- Frontend: `/invite/:token` route + AcceptInvitationPage formu (parola + parola tekrarı, zod validation)
- Email template Türkçe (Mailhog/Postmark template ID)

### US-1.3 — TOTP / MFA setup ve doğrulama (SP: 8)

*Kullanıcı olarak parola dışında ikinci faktör (TOTP) zorunlu.*

**AC:**
- `POST /api/v1/auth/setup-totp` (auth gerekli) → QR code data URL + 10 recovery code (hash'lenmiş saklanır)
- `POST /api/v1/auth/verify-totp` → 6 haneli kod doğrulanır, user'a `totpEnabled = true` set
- Login akışı: parola doğru ise eğer `totpEnabled` ise 200 yerine 202 + `{ requiresTotp: true, mfaToken }` döner; client TOTP kodunu `POST /auth/login/totp` ile gönderir
- `mfaToken` 5 dakikalık tek kullanımlık intermediate token (jwt, ayrı secret)
- Frontend: SetupMfaPage (QR scan → 6 hane) + Login flow MFA adımı
- Recovery code ile kurtarma: `POST /auth/recover` → recovery code + email → yeni TOTP setup'a yönlendirir
- Prisma'da `User.totpSecret`, `User.totpEnabled`, ve `RecoveryCode` modeli (id, userId, codeHash, usedAt)

### US-1.4 — Şube CRUD (admin) (SP: 5)

*Admin olarak şube tanımlayabilmeliyim.*

**AC:**
- `GET /api/v1/admin/branches` → liste (tenant scope)
- `POST /api/v1/admin/branches` → kod, ad, adres, regionId, opsiyonel catchmentPolygon (GeoJSON)
- `PATCH /api/v1/admin/branches/:id` → güncelleme
- `DELETE /api/v1/admin/branches/:id` → soft delete (Branch tablosuna `deletedAt`)
- Adres → koordinat dönüşümü Google Geocoding API (lazy, sadece catchmentPolygon yoksa)
- Frontend: `/admin/branches` listesi + create/edit modal (react-hook-form + zod)
- Sadece `ADMIN` rolü erişebilir; `app.requireRole('ADMIN')` helper'ı eklenir

### US-1.5 — Bölge müdürü görünümü (SP: 3)

*Bölge müdürü kendine bağlı şubeleri görebilmeli.*

**AC:**
- `GET /api/v1/regions/my` → role'e göre region/branches döner
- Frontend: `/regions` sayfası — bölge kartları, her birinde şube listesi
- Bölge müdürü olmayan kullanıcı bu sayfaya erişemez (route guard)

### US-1.6 — RLS sıkılaştırma (SP: 8)

*Tüm sorgular tenant izolasyonu altında — permissive fallback kapatılsın.*

**AC:**
- Prisma client extension (`apps/api/src/infrastructure/db/tenantPrisma.ts`) — her query başında `SET LOCAL app.current_tenant = ...` transaction içinde
- Fastify request decorator `request.db` — auth context'inden tenant ile bağlı Prisma client
- Yeni manual migration `02_drop_permissive_fallback.sql` — RLS policy'lerden `OR current_setting IS NULL` kaldırılır
- Integration testi (Testcontainers veya gerçek dev DB): Tenant A user'ı Tenant B verisini sorguladığında 0 satır döner
- Auth route'ları `request.db` kullanır (artık `app.prisma` direct kullanım sadece auth endpoint'lerinde)

## Etkilenen Dosyalar

| Yol | Aksiyon |
|-----|---------|
| `apps/api/prisma/schema.prisma` | `User.totpSecret`, `User.totpEnabled`, `Invitation`, `RecoveryCode` model |
| `apps/api/prisma/migrations/manual/02_drop_permissive_fallback.sql` | Yeni |
| `apps/api/src/infrastructure/db/tenantPrisma.ts` | Yeni — RLS-aware client |
| `apps/api/src/modules/admin/{users,branches,regions}` | Yeni modüller |
| `apps/api/src/modules/auth/auth.routes.ts` | TOTP endpoint'leri |
| `apps/api/src/modules/auth/totp.service.ts` | Yeni — otplib wrapper |
| `apps/api/src/modules/invitations` | Yeni modül |
| `apps/api/src/providers/email/EmailProvider.ts` + `PostmarkEmailProvider.ts` + `MailhogEmailProvider.ts` | Yeni provider abstraction |
| `apps/web/src/features/admin/*` | Branch list/edit, user invite UI |
| `apps/web/src/features/auth/{SetupMfaPage,VerifyTotpPage,AcceptInvitationPage}.tsx` | Yeni |
| `apps/web/src/App.tsx` | Yeni route'lar |
| `packages/shared/src/api/auth.ts` | Schemas senkronize |
| `apps/api/src/__tests__/integration/multitenant.test.ts` | Yeni RLS integration testi |

## Test Beklentisi

- TOTP service unit test (otplib wrapper, recovery code generate/verify)
- Invitation service unit test (token expiry, single use)
- Branch route integration test (tenant izolasyonu)
- Multi-tenant integration test (Tenant A vs Tenant B veri sızması yok — Testcontainers ile)
- Frontend: AcceptInvitationPage form validation testi (Vitest + Testing Library)

## Definition of Done

- [ ] Tüm US AC'leri ✓ (manuel demo dahil)
- [ ] Backend test coverage ≥ %70 (yeni eklenen kodda)
- [ ] `pnpm lint && pnpm type-check && pnpm test` clean
- [ ] CI yeşil (PR check'leri)
- [ ] OpenAPI doc `/docs` altında yeni endpoint'leri gösteriyor
- [ ] CLAUDE.md güncel (yeni modüller listede)
- [ ] PR template doldurulmuş
- [ ] Demo: 1 admin tenant açar → 2 müdür davet eder → her ikisi TOTP setup yapar → giriş → admin bir şube oluşturur

## Demo Senaryosu (sprint sonu)

1. Admin `/admin/users` sayfasında "Davet Et" → `manager@demo-bank.test`, BRANCH_MANAGER, KDK-001
2. Mailhog/inbox'ta davet email görünür → linke tıkla → parola belirle
3. Login sayfasına yönlendir → email/parola → TOTP setup zorla
4. QR kod scan (Google Authenticator) → 6 haneli kod gir → `totpEnabled = true`
5. Logout → tekrar login → parola → TOTP kod → ana sayfa
6. Admin yeni şube oluşturur (`/admin/branches`) → şube müdürüne ata
7. Tenant A admin'i, Tenant B kullanıcısının email'ini bilse bile davet edemez (404)

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
Bu sprint'te BranchScout Sprint 1'in geri kalanını implement edeceksin.
Önkoşul: ESLint config, JWT plugin, login/refresh/me endpoint'leri, RLS migration
zaten yapılmış (önceki PR). Detay için `docs/sprints/SPRINT_01_AUTH.md` ve
`docs/SPRINT_PLAN.md`'deki Sprint 1 bölümünü oku, ARCHITECTURE.md § 4 ve § 9'u
referans al.

Tamamlanacak story'ler:
- US-1.2 — Kullanıcı davet sistemi (8 SP)
- US-1.3 — TOTP / MFA (8 SP)
- US-1.4 — Şube CRUD admin endpoint'leri (5 SP)
- US-1.5 — Bölge müdürü görünümü (3 SP)
- US-1.6 — RLS sıkılaştırma (Prisma extension + integration test) (8 SP)

İş akışı:
1. Önce planını çıkar — hangi dosyaları oluşturacaksın, hangi sırayla çalışacaksın,
   hangi yeni Prisma model'leri gerekecek. Onayımı bekle.
2. Her story için ayrı commit (Conventional Commits: `feat(auth): ...`).
3. Provider abstraction kullan — email için `EmailProvider` interface +
   PostmarkEmailProvider + MailhogEmailProvider (test'te InMemory).
4. TOTP için `otplib` paketi.
5. Davet/MFA email template'leri Türkçe yaz.
6. Her endpoint'te zod validation + OpenAPI tag.
7. Korumalı endpoint'ler için `app.requireRole('ADMIN')` helper'ı yaz
   (jwt plugin'e ekle).
8. RLS sıkılaştırma için Prisma extension yaz; her transaction'da
   `SET LOCAL app.current_tenant`. Manual migration ile fallback policy'leri
   yenile.
9. Integration testi `apps/api/src/__tests__/integration/multitenant.test.ts`
   altına yaz — Testcontainers ile 2 tenant'ta veri sızması olmadığını ispatla.
10. Frontend: AcceptInvitation, SetupMfa, VerifyTotp, Admin/Branches sayfalarını
    feature folder'da yarat. shadcn/ui yoksa basit Tailwind ile başla.

Kalite gate'leri:
- Her commit öncesi `pnpm lint && pnpm type-check`
- Sprint sonunda `pnpm test` clean (yeni unit + integration testler dahil)
- CLAUDE.md ve OpenAPI dokümantasyonu güncel
- PR template'deki AC checklist doldurulmuş

Soruların varsa sor. Aksi halde planını ver, sonra başla.
```

---

## Doğrulama (sprint sonu)

```bash
pnpm install
pnpm db:migrate                                   # yeni Prisma migration'ları
pnpm --filter @branchscout/api db:migrate:manual  # 02_drop_permissive_fallback.sql
pnpm db:seed
pnpm test                                         # unit + integration yeşil
pnpm lint && pnpm type-check                      # clean
pnpm dev                                          # manual demo akışı
```

Demo akışı yukarıdaki "Demo Senaryosu" bölümünden adım adım takip edilir.
