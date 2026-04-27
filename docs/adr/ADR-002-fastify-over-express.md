# ADR-002: Fastify over Express

**Tarih:** 2026-04-27
**Durum:** Kabul edildi

## Bağlam

API framework'ü seçimi. Aday'lar: Express, Fastify, Hono, NestJS.

## Karar

Fastify 5.

## Alternatifler

- **Express**: De facto standart ama plugin ekosistemi dağınık, OpenAPI auto-gen için 3. parti, performans Fastify'ın yarısı.
- **Hono**: Çok hızlı ama edge-first, Node.js plugin ekosistemi dar.
- **NestJS**: Decorator-heavy, learning curve yüksek; küçük ekip için over-engineered.

## Sonuçlar

**Artılar:** Plugin sistemi temiz (`@fastify/swagger` ile OpenAPI auto-gen), JSON Schema yerleşik validation, Express'ten ~2x hızlı, TypeScript desteği iyi.

**Eksiler:** Express ekosistemi kadar geniş değil (rate-limit, helmet gibi paketler resmi `@fastify/*` ile karşılanıyor; nadiren custom adapter gerekir).
