# BranchScout

Banka şube müdürleri için saha keşif ve ziyaret planlama uygulaması.
Şube müdürü kendi catchment area'sındaki KOBİ'leri haritada keşfeder, firma bilgilerini birleşik bir panelden görür, ziyaret rotaları planlar ve sonuçları takip eder.

> ✅ **Sprint 3 tamamlandı.** Sprint 2'nin üstüne: PostGIS aktif (Railway `postgis/postgis:17-3.5`), polygon search (`ST_Contains`, 100 km² limit), Drawing Manager UI, kategori chip filtresi (URL state), Google Places Autocomplete + session token, kayıtlı aramalar (CRUD + sidebar), heatmap layer (zoom < 13 otomatik). Backend tests 67 geçer.

## Hızlı Başlangıç

Gereksinimler: Node 20+, pnpm 10+, Postgres (lokal veya remote).

```bash
git clone https://github.com/<user>/branchscout.git
cd branchscout
cp .env.example .env
pnpm install
pnpm dev
```

`pnpm dev` Turbo ile şunları çalıştırır:
- `apps/api` → http://localhost:4000 (Fastify, `/health`, `/docs`)
- `apps/web` → http://localhost:5173 (Vite + React)

### Veritabanı

```bash
pnpm db:migrate                                      # Prisma migration'ları
pnpm --filter @branchscout/api db:migrate:manual     # RLS policy migration'ı (manual SQL)
pnpm db:seed                                         # demo tenant + admin + 2 şube
pnpm db:studio                                       # Prisma Studio
```

Demo giriş bilgileri (seed sonrası):  
**Email:** `admin@demo-bank.test` · **Parola:** `admin123!`

Lokal Postgres yoksa Railway'in dev DB URL'ini `.env` içine `DATABASE_URL` olarak yapıştırabilirsiniz.

## Yapı

```
branchscout/
├── apps/
│   ├── api/          # Fastify + Prisma + Postgres
│   └── web/          # Vite + React + Tailwind
├── packages/
│   ├── shared/       # Paylaşılan tipler + Zod şemaları
│   └── config/       # tsconfig base
├── docs/adr/         # Mimari karar kayıtları
└── .github/workflows # CI
```

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `pnpm dev` | Tüm uygulamaları paralel çalıştır |
| `pnpm build` | Production build |
| `pnpm lint` | Lint |
| `pnpm type-check` | TypeScript kontrolü |
| `pnpm test` | Vitest testleri |
| `pnpm db:migrate` | Prisma migrate dev |
| `pnpm db:seed` | Demo verisi |

## Dağıtım — Railway

İki ayrı Railway service:
- **API** — root: `/`, build context: monorepo root, nixpacks: `apps/api/nixpacks.toml`
- **Web** — root: `/`, build context: monorepo root, nixpacks: `apps/web/nixpacks.toml`

Postgres add-on bağlandığında `DATABASE_URL` otomatik enjekte edilir.

## Dokümantasyon

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Teknik mimari
- [PRD.md](docs/PRD.md) — Ürün gereksinimleri
- [SPRINT_PLAN.md](docs/SPRINT_PLAN.md) — 16 sprint planı
- [CLAUDE.md](CLAUDE.md) — Claude Code rehberi
- [docs/adr/](docs/adr/) — Mimari karar kayıtları

## Lisans

Internal — © 2026
