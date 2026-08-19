# 9Router Fork Development Handbook — Design

**Tanggal:** 2026-08-14
**Target:** `/home/ubuntu/9router-fork/docs`
**Status:** Disetujui

## Goal

Membuat dokumentasi operasional berbahasa Indonesia yang memungkinkan development berpindah dari VPS ke laptop pribadi secara aman, sambil mempertahankan alur release dan production deployment yang telah digunakan selama sesi ini.

## Audience

Owner/maintainer fork `afandiaziz/9router` yang bekerja lintas Windows+WSL2, macOS, Linux, dan VPS Ubuntu.

## Structure

```text
docs/
├── FORK-DEVELOPMENT-HANDBOOK.md
└── runbooks/
    ├── laptop-setup.md
    ├── upstream-sync.md
    ├── release-and-deploy.md
    └── rollback-and-recovery.md
```

Handbook menjelaskan konsep, keputusan, arsitektur alur, branch/release policy, fitur fork yang harus dipertahankan, rangkuman perubahan sesi, production gates, dan common pitfalls. Runbooks menyediakan checklist serta command yang dapat dijalankan.

## Required Coverage

- Perbedaan source repository `/home/ubuntu/9router-fork` dan production runtime `/home/ubuntu/9router`.
- Clone fork ke laptop, prerequisite lintas platform, dependency install, local development, test, dan build.
- Konfigurasi `origin` dan `upstream`, comparison, merge-base, ahead/behind, trial merge, conflict resolution, dan backup branch.
- Kebijakan mempertahankan Quota Sharing, Check Usage, dan Invalid Providers ketika upstream berubah.
- Tags `v<upstream>-forkN`, GitHub Actions, GHCR `latest`/version tag, dan cara memastikan image baru benar-benar tersedia.
- Production preparation: clean tree, test baseline, targeted tests, build, security checks, database/.env backup, migration warning.
- Docker Compose deploy di `/home/ubuntu/9router`, nginx/port topology, health check, protected endpoint check, authenticated smoke test.
- Rollback image dan database, beserta batasan schema migration.
- Ringkasan feature/fix sesi: quota lifetime, model aliases/manual models, public usage, Invalid Providers, provider node details/typography, v0.5.55 merge, GHSA trusted-peer fix.
- Troubleshooting untuk stale `latest`, container tidak recreate, CI/tag, test-generated snapshot churn, merge conflict, dan secret/data portability.

## Security Policy

Dokumentasi tidak boleh memuat nilai `.env`, API key, JWT secret, database encryption key, credential provider, atau GitHub secret. Contoh hanya menggunakan placeholder. Dokumentasi harus menyebut bahwa `DB_ENCRYPTION_KEY` wajib dibackup bersama database dan file rahasia tidak boleh di-commit.

## Production Gates

Deploy hanya dilakukan setelah:

1. Working tree bersih dan target commit/tag jelas.
2. Diff/upstream comparison selesai direview.
3. Targeted tests fitur fork lulus.
4. Full suite dibandingkan dengan baseline dan kegagalan dilaporkan jujur.
5. Production build berhasil.
6. Security-sensitive paths diperiksa.
7. Database dan `.env` dibackup.
8. Tag dan GitHub Actions/GHCR selesai.
9. Container direcreate dengan image baru.
10. Health, protected endpoint, dan authenticated smoke tests berhasil.
11. Rollback path diketahui sebelum deploy.

## Style

- Bahasa Indonesia yang teknis tetapi langsung.
- Perintah menggunakan shell POSIX dan path eksplisit.
- Setiap perintah berbahaya diberi warning serta verification step.
- Tidak mengklaim test/deploy berhasil tanpa bukti yang dapat diperiksa.
- Checklist menggunakan Markdown task list.
