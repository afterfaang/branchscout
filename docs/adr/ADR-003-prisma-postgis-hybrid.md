# ADR-003: Prisma ORM + raw SQL hybrid (PostGIS için)

**Tarih:** 2026-04-27
**Durum:** Kabul edildi

## Bağlam

Coğrafi sorgular (firma `location`, şube `catchment_polygon`, `ST_DWithin`, `ST_Contains`) PostGIS gerektirir. Prisma `geography` tipini native desteklemiyor.

## Karar

Prisma ana ORM. PostGIS gerektiren sorgularda `Prisma.sql` raw template literal. Schema'da `Unsupported("geography(Point,4326)")` kolon, ayrı raw migration'da indeks ve constraint.

## Alternatifler

- **Drizzle ORM**: PostGIS desteği daha iyi ama Prisma kadar olgun değil; migration tooling Prisma'dan zayıf.
- **TypeORM**: Decorator-heavy, daha az tip-güvenli.
- **Saf SQL + pg**: Tip güvenliği yok, takım için risk.

## Sonuçlar

**Artılar:** Standart sorguların %90'ı tip-güvenli; PostGIS gerektiren %10 raw SQL ile yapılır. Migration tooling olgun.

**Eksiler:** Geography kolonları için Prisma type'ı yok, manuel tip annotation gerekir; raw query'lerde injection için dikkat (her zaman `Prisma.sql` template).
