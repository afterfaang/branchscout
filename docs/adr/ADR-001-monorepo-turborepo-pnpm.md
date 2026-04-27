# ADR-001: Monorepo with Turborepo + pnpm

**Tarih:** 2026-04-27
**Durum:** Kabul edildi

## Bağlam

BranchScout frontend (React) ve backend (Node) paylaşılan tipler ve API kontratı kullanıyor. İki ayrı repo (multirepo) tip senkronizasyonunu zorlaştırırdı.

## Karar

Turborepo + pnpm workspaces ile monorepo. `apps/web`, `apps/api` + `packages/shared`, `packages/config`.

## Alternatifler

- **Multirepo + npm package**: Her tip değişiminde publish/version/install döngüsü; yavaş.
- **Nx**: Daha güçlü ama daha ağır; bizim ihtiyacımız Turborepo ile karşılanıyor.
- **Lerna**: Sustaining moduna girdi (Nx'e satıldı), modern alternatif değil.

## Sonuçlar

**Artılar:** Tek `pnpm install`, paylaşılan tip refactor'u atomik, Turbo cache ile hızlı CI, paylaşılan ESLint/TS config.

**Eksiler:** Repo büyüyünce git operations yavaşlayabilir; Railway gibi PaaS'lerde monorepo build context yapılandırması gerekir (nixpacks ile çözüldü).
