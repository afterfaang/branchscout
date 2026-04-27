# ADR-004: Multi-tenant via Postgres RLS

**Tarih:** 2026-04-27
**Durum:** Kabul edildi

## Bağlam

BranchScout multi-tenant SaaS olacak (her banka bir tenant). Tenant izolasyonu kritik (GDPR/KVKK + bankacılık sırrı).

## Karar

Tek DB, tek schema, her tabloda `tenant_id` kolonu + Postgres Row-Level Security (RLS) policy.

Her HTTP request'te middleware: JWT'den `tenant_id` çıkarır → `SET LOCAL app.current_tenant = '<id>'` → RLS policy bu setting'i okur.

## Alternatifler

- **DB-per-tenant**: En güçlü izolasyon ama 600 banka şubesi ölçeğinde ops cehennemi (migration × N).
- **Schema-per-tenant**: DB-per-tenant'ın hafif versiyonu ama hâlâ migration karmaşası.
- **Sadece app-level filter**: Geliştirici hatası tek satır query'de cross-tenant leak'e yol açar — kabul edilemez.

## Sonuçlar

**Artılar:** Tek migration, tek backup, RLS sayesinde unutulmuş `WHERE tenant_id = ?` bile leak'e yol açmaz.

**Eksiler:** RLS performans etkisi (~%5-10), benchmark Sprint 1'de yapılır; analytics sorgularında `bypass` rolü gerekebilir; superuser bağlantılarda RLS skip — connection user dikkatli yönetilmeli.
