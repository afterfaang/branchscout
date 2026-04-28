# Sprint 15 — Hardening: Performans, Güvenlik, Yük Testi

**Süre:** 2 hafta · **Önkoşul:** Sprint 14 tamam · **Bağlı:** PRD § 6

**🏁 Bu sprint sonu GA-RC** — Release Candidate hazır.

## Hedef

GA için tüm non-functional gereksinimler karşılanmış — yük testi, pen test, KVKK uyumu, monitoring, DR testi.

## User Stories

### US-15.1 — Yük testi (SP: 13)

**AC:**
- k6 senaryosu: 5000 eş zamanlı kullanıcı (login + map + place details)
- Hedef: P95 < 1s, error rate < 0.1%
- Bottleneck'leri tespit et + fix
- Test raporu PR'da paylaşılır

### US-15.2 — Penetration testi (3rd party) (SP: 13)

**AC:**
- OWASP Top 10 kapsamı
- Kritik bulgu yok; orta+ tüm bulgular fix
- Sözleşmeli pentester firmasıyla 1 hafta
- Rapor + remediation

### US-15.3 — DB index ve query optimizasyonu (SP: 8)

**AC:**
- pgBadger ile slow query analizi
- Tüm endpoint'lerde >500ms query'ler optimize
- N+1 query'ler tespit + Prisma include/select review

### US-15.4 — Frontend bundle optimization (SP: 5)

**AC:**
- Ana bundle < 300KB gz
- Code splitting (route-based)
- Maps SDK lazy load (zaten Sprint 2'de)
- Lighthouse Performance score ≥ 90

### US-15.5 — Disaster Recovery testi (SP: 8)

**AC:**
- Prod simulated failure (DB delete + restore)
- RTO < 1 saat, RPO < 15 dk
- Runbook dokümante (`docs/runbooks/dr.md`)

### US-15.6 — KVKK uyum dokümantasyonu (SP: 8)

**AC:**
- Veri işleme aydınlatması (kullanıcılara, firma temsilcilerine ayrı)
- Kişisel veri envanteri (her tablo + alan + amaç + saklama süresi)
- Silme/erişim hakkı endpoint'leri (`POST /api/v1/users/me/export`, `DELETE /api/v1/users/me`)
- Hukuk ekibi onay

### US-15.7 — Audit log review (SP: 5)

**AC:**
- Login, view_company, export, role_change, settings_change loglanıyor mu?
- Eksikleri tamamla
- Log retention policy 5 yıl

### US-15.8 — SLO + alerting (SP: 5)

**AC:**
- SLO doc: availability 99.9%, P95 latency 1s, error rate < 0.5%
- PagerDuty entegrasyonu
- Runbook'lar her alert için
- Status page (statuspage.io veya self-hosted)

## DoD

- [ ] Tüm PRD § 6 (non-functional) karşılanmış
- [ ] Security signoff (CISO veya 3rd party pen test)
- [ ] DR testi başarılı
- [ ] CI yeşil + Lighthouse skorları
- [ ] **GA-RC hazır**

---

## 🤖 Claude Code'a Tek-Atış Prompt

```
BranchScout Sprint 15 — Hardening + GA-RC. Detay:
`docs/sprints/SPRINT_15_HARDENING.md`, PRD § 6.

Story'ler: US-15.1 (13) US-15.2 (13) US-15.3 (8) US-15.4 (5) US-15.5 (8)
US-15.6 (8) US-15.7 (5) US-15.8 (5)

Önemli:
- k6 senaryoları `tests/load/`. CI'da haftalık run.
- Pentest 3. parti — Claude Code sadece bulguları fix eder, test yapmaz.
- pgBadger query analizi → migration ile index ekle.
- KVKK envanteri tablo bazlı; her sütun için classification (PII / sensitive / public).
- Status page minimum: API health + dashboard health.

Plan çıkar, onaylat. Bu sprint ağırlıklı non-feature; çoğu görev ölçüm + iyileştirme.
```
