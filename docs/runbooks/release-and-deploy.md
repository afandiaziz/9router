# Runbook: Rilis & Deploy

Prosedur melepas versi baru fork `afandiaziz/9router`: gerbang pra-rilis, tagging, verifikasi GitHub Actions/GHCR, backup produksi, deployment, dan smoke test. Semua perintah diverifikasi terhadap repository dan server produksi saat ini.

Runbook pendamping: [rollback-and-recovery.md](rollback-and-recovery.md) (rollback image dan restore DB). Kebijakan versi, tag, dan fitur fork yang dilindungi ada di handbook [bagian 2](../FORK-DEVELOPMENT-HANDBOOK.md#2-kebijakan-development--release); topologi produksi di [bagian 4](../FORK-DEVELOPMENT-HANDBOOK.md#4-arsitektur-secret-data--batas-operasional).

**Terakhir diverifikasi:** 2026-08-19 · Basis: `v0.5.55-fork20` · Image produksi: `ghcr.io/afandiaziz/9router:latest`.

---

## Daftar Isi

1. [Gerbang Pra-Rilis](#1-gerbang-pra-rilis)
2. [Tagging, CI, dan GHCR](#2-tagging-ci-dan-ghcr)
3. [Backup Produksi dan Deployment](#3-backup-produksi-dan-deployment)
4. [Smoke Test](#4-smoke-test)
5. [Checklist Akhir](#5-checklist-akhir)

---

## 1. Gerbang Pra-Rilis

Semua item wajib hijau sebelum membuat tag. Dikerjakan di **laptop/dev**, di repo `/home/ubuntu/9router-fork` (atau clone lokal yang setara) — **bukan** di VPS.

### 1.1 Working tree bersih dan ter-review

```bash
git checkout master
git pull origin master
git status --short --branch
```

Kriteria: tidak ada baris perubahan; branch `master` tidak `ahead`/`behind` tak terduga. Semua diff yang akan dirilis sudah melewati review (lihat protokol review di handbook). Jangan merilis dari working tree kotor — build GHCR mengambil isi commit, tapi perubahan lokal yang tidak ter-commit menandakan proses yang tidak terkendali.

### 1.2 Test tertarget fitur fork

Jalankan test untuk fitur yang dilindungi fork (quota, check-usage, invalid providers). Contoh perintah terverifikasi:

```bash
npm --prefix tests -- test unit/quota-accounting.test.js
npm --prefix tests -- test unit/invalid-provider-route.test.js
npm --prefix tests -- test unit/qoder.test.js
```

Semua test tertarget wajib lulus (contoh terverifikasi: `unit/qoder.test.js` 44/44 lulus).

### 1.3 Baseline suite penuh

```bash
npm --prefix tests test
```

Kriteria lulus mengikuti kebijakan baseline jujur di handbook: **nol regresi terhadap baseline tercatat** (per 2026-08-19: 88 gagal / 1810 lulus). Jumlah gagal tidak boleh bertambah dan tidak ada test yang tadinya lulus ikut gagal. Tulis hasil apa adanya; jangan pernah klaim "semua test lulus".

### 1.4 Build produksi

```bash
npm run build
```

Kriteria: selesai tanpa `Failed to compile`. Script ini menjalankan `next build --webpack` lalu `postbuild` (`scripts/copy-standalone-assets.mjs`) — keduanya terverifikasi ada di `package.json`.

### 1.5 Pemeriksaan keamanan

- Tidak ada secret, token, atau nilai `.env` produksi di diff yang akan dirilis. Scan cepat:

  ```bash
  git diff origin/master...HEAD | grep -nE "sk-[A-Za-z0-9]|ghp_|gho_|xox[bap]-|-----BEGIN|eyJ[A-Za-z0-9_-]{10,}"
  ```

  Output kosong (exit 1) berarti bersih. Satu false positive kata biasa bisa ditoleransi setelah diperiksa mata.
- Kalau rilis membawa fix keamanan upstream (preseden: GHSA-pjm4-8fpg-f9p6 di v0.5.55), pastikan deskripsinya masuk pesan tag ([langkah 2.1](#21-membuat-dan-mendorong-tag)).

### 1.6 Pilih versi dan nomor fork

Konvensi tag fork (handbook bagian 2.3): `v<versi-upstream>-fork<N>`, dan nomor `N` **tidak di-reset** saat basis naik (bukti: `v0.5.50-fork19` → `v0.5.55-fork20`). Cek nomor terakhir:

```bash
git tag -l "v*" | sort -V | tail -5
git describe --tags master
```

Contoh terverifikasi per 2026-08-19: tag terbaru `v0.5.55-fork20`, `git describe` menghasilkan `v0.5.55-fork20-11-geaf80dc47` (11 commit setelah tag). Rilis berikutnya melanjutkan ke `fork21`.

### 1.7 Rencana rollback

Sebelum deploy, pastikan runbook [rollback-and-recovery.md](rollback-and-recovery.md) bisa langsung dijalankan: Anda tahu tag versi sebelumnya (mis. `v0.5.55-fork20`), tahu lokasi backup DB terakhir, dan tahu bahwa `DB_ENCRYPTION_KEY` di `.env` produksi masih valid. Deploy tanpa rencana rollback = dilarang.

## 2. Tagging, CI, dan GHCR

### 2.1 Membuat dan mendorong tag

Tag dibuat **beranotasi** di `master`, lalu `master` dan tag didorong **berurutan** — branch dulu, baru tag:

```bash
git tag -a v0.5.56-fork21 -m "Fork 21: <ringkasan perubahan; sebutkan security fix bila ada>"
git push origin master
git push origin v0.5.56-fork21
```

Sesuaikan nomor dengan hasil [langkah 1.6](#16-pilih-versi-dan-nomor-fork). Urutan push penting: tag menunjuk commit yang harus sudah ada di `origin/master` agar sejarah branch dan tag konsisten.

### 2.2 Verifikasi GitHub Actions

Workflow `.github/workflows/docker-publish.yml` hanya terpicu oleh dua hal (terverifikasi dari isi file):

| Trigger | Sumber |
|---|---|
| Push tag berformat `v*` | `on.push.tags: ["v*"]` |
| Manual dari tab Actions | `workflow_dispatch` |

Push ke `master` **tidak** membangun image. Setelah push tag, verifikasi run:

```bash
gh run list --workflow docker-publish.yml --limit 3
```

Tunggu sampai status `completed` dengan `conclusion: success`:

```bash
gh run watch
```

Lihat log bila gagal: `gh run view --log-failed`.

### 2.3 Tag image dan makna `latest`

Metadata action menghasilkan dua tag untuk image `ghcr.io/afandiaziz/9router` (terverifikasi dari `docker-publish.yml`):

| Tag GHCR | Dari | Contoh |
|---|---|---|
| Versi semver tanpa prefix `v` | `type=semver,pattern={{version}}` | `0.5.56-fork21` |
| `latest` | `type=raw,value=latest` | `latest` |

Build hanya untuk platform `linux/amd64`, dengan cache registry `buildcache`, `provenance: false`, `sbom: false`.

**Peringatan `latest` yang basi:** `latest` adalah tag bergerak. Sesaat setelah workflow hijau, registry bisa saja masih menyajikan digest lama karena caching/c propagation, dan `docker compose pull` di VPS bisa mendapat digest lama itu. **Jangan deploy sebelum digest di registry benar-benar berubah.** Bandingkan digest registry dengan digest yang sedang dipakai container ([langkah 3.1](#31-inspeksi-target)). Kalau keduanya sama padahal build baru selesai, tunggu beberapa menit lalu cek ulang — jangan paksa `up -d` berharap image baru kepasang.

### 2.4 Verifikasi digest di registry

```bash
docker buildx imagetools inspect ghcr.io/afandiaziz/9router:latest
```

Catat baris `Digest: sha256:...` — ini acuan untuk dibandingkan dengan digest container di VPS. Alternatif tanpa buildx: `docker manifest inspect ghcr.io/afandiaziz/9router:latest` (butuh auth untuk repo privat; `docker login ghcr.io` dengan PAT scope `read:packages`).

## 3. Backup Produksi dan Deployment

Semua perintah di bagian ini dijalankan di **VPS**, di direktori `/home/ubuntu/9router`. Topologi terverifikasi:

| Fakta | Nilai | Sumber |
|---|---|---|
| Service Compose | `9router` | `/home/ubuntu/9router/docker-compose.yml` |
| Image | `ghcr.io/afandiaziz/9router:latest` | file yang sama |
| Port host | `127.0.0.1:20129:20129` (hanya localhost; publik lewat nginx) | file yang sama |
| Volume data | `./data:/app/data` | file yang sama |
| `DATA_DIR` | `/app/data` | `/home/ubuntu/9router/.env` |
| DB SQLite | `data/db/data.sqlite` (+ `-wal`, `-shm`) | terverifikasi ada di disk |
| Reverse proxy | nginx `9router.afandiaziz.my.id` → `proxy_pass http://127.0.0.1:20129` | `/etc/nginx/sites-enabled/9router.afandiaziz.my.id` |

### 3.1 Inspeksi target

```bash
cd /home/ubuntu/9router
docker compose ps
docker inspect 9router --format '{{.Created}} | {{.Config.Image}} | {{.Image}}'
```

Output terverifikasi (contoh nyata): `2026-08-18T18:11:36Z | ghcr.io/afandiaziz/9router:latest | sha256:4bd635...`. Catat tiga nilai ini — setelah deploy, `Created` **harus berubah** dan `Image` (digest) harus sama dengan digest registry dari [langkah 2.4](#24-verifikasi-digest-di-registry).

### 3.2 Backup DB dan `.env`

Wajib sebelum setiap deploy. Direktori backup produksi sudah memakai pola `db.bak-<label>-<timestamp>` (bukti di disk: `db.bak-2026-08-19-0107`, `db.bak-prefork5-2026-08-10-1540`):

```bash
cd /home/ubuntu/9router
TS=$(date +%Y-%m-%d-%H%M)
cp -a data/db "data/db.bak-predeploy-${TS}"
cp -a .env ".env.bak-predeploy-${TS}"
ls -la data/db.bak-predeploy-${TS}
```

- Salin **seluruh direktori `data/db`**, bukan hanya `data.sqlite`: file `-wal` dan `-shm` adalah bagian dari state SQLite mode WAL; menyalin `data.sqlite` sendirian saat DB aktif bisa menghasilkan backup yang tidak konsisten.
- `.env` ikut dibackup karena memuat `DB_ENCRYPTION_KEY` — tanpa key ini, DB terenkripsi hasil restore tidak bisa dibaca (handbook bagian 4.3). File backup `.env` memuat secret; jaga permission-nya (`chmod 600 .env.bak-*`) dan jangan pernah menyalinnya ke laptop atau meng-commit-nya.
- Verifikasi backup tidak kosong: `ls -la` harus menampilkan `data.sqlite` berukuran wajar beserta pasangan WAL/SHM-nya.

> **Catatan:** backup otomatis aplikasi (`data/db/backups/`) hanya dibuat sebelum migrasi skema dan **mengecualikan** tabel `requestDetails` (komentar di `src/lib/db/backup.js`). Ia bukan pengganti backup pra-deploy di atas.

### 3.3 Pull dan recreate

```bash
cd /home/ubuntu/9router
docker compose pull
docker compose up -d
```

`docker compose pull` mengambil image `:latest` terbaru dari GHCR; `up -d` membuat ulang container **hanya bila** image atau konfigurasi berubah — dari sinilah pentingnya verifikasi digest di [langkah 2.4](#24-verifikasi-digest-di-registry): kalau `pull` mendapat digest lama, `up -d` tidak membuat container baru dan Anda "deploy" tanpa hasil.

**Kapan berhenti manual diperlukan:** `up -d` sudah menangani stop/recreate untuk pergantian image biasa. Hanya gunakan `docker compose stop 9router` eksplisit bila Anda perlu jendela tulis-DB yang tenang (mis. sebelum restore DB — lihat runbook rollback) atau bila recreate gagal dan perlu diagnosis.

### 3.4 Verifikasi container benar-benar baru

```bash
docker compose ps
docker inspect 9router --format '{{.Created}} | {{.Image}}'
```

Kriteria lulus **keduanya**:

1. `Created` lebih baru dari nilai yang dicatat di [langkah 3.1](#31-inspeksi-target) (timestamp berubah = container dibuat ulang).
2. Digest `Image` sama dengan digest registry dari [langkah 2.4](#24-verifikasi-digest-di-registry).

Kalau `Created` tidak berubah, container lama masih jalan — ini gejala "stale latest" atau pull gagal; lihat troubleshooting di [runbook rollback bagian 6](rollback-and-recovery.md#6-troubleshooting-insiden).

## 4. Smoke Test

Jalankan berurutan di VPS setelah [langkah 3.4](#34-verifikasi-container-benar-benar-baru) hijau. Semua perintah dan kode status di bawah **diverifikasi langsung terhadap produksi** per 2026-08-19.

### 4.1 Status container dan log

```bash
docker compose ps
docker compose logs --tail 50 9router
```

Kriteria: service `Up`; log tidak menampilkan stack trace fatal, error migrasi berulang, atau restart loop (perhatikan kolom `STATUS` — `Restarting` berarti gagal).

### 4.2 Health lokal (200)

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:20129/api/health
```

Diharapkan: `200` (terverifikasi; route `src/app/api/health/route.js` mengembalikan `{ ok: true }`).

### 4.3 Endpoint terproteksi tanpa auth (401)

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:20129/api/providers
```

Diharapkan: `401` (terverifikasi). Kalau mendapat `200`, auth produksi jebol — **hentikan, jangan lanjut**, dan eskalasi (bandingkan dengan fix GHSA-pjm4-8fpg-f9p6: endpoint lokal tidak boleh bisa diakses remote tanpa kredensial).

### 4.4 Health publik lewat nginx (200)

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://9router.afandiaziz.my.id/api/health
```

Diharapkan: `200` (terverifikasi). `000`/timeout/502 berarti masalah nginx ↔ container (port mismatch, container mati) — lihat troubleshooting.

### 4.5 Verifikasi terautentikasi (dashboard/API)

Buka `https://9router.afandiaziz.my.id` di browser, login dengan kredensial produksi (bukan milik runbook ini), lalu pastikan:

- Dashboard termuat tanpa error konsol yang fatal.
- Daftar providers/keys tampil dan tidak kosong secara tak terduga.
- Satu request API nyata (mis. lewat fitur dashboard yang biasa dipakai) berhasil.

Verifikasi ini sengaja manual — runbook tidak memuat secret apa pun.

### 4.6 Smoke test fitur fork

Fitur yang dilindungi fork wajib dicek setiap rilis (daftar di handbook bagian 2.5):

| Fitur | Cara cek | Kriteria |
|---|---|---|
| Check Usage (publik, tanpa login) | `curl -s "https://9router.afandiaziz.my.id/api/public/check-usage?key=<quota-key-uji>"` | Respons JSON; `keyValid` sesuai kenyataan; tanpa key valid → `401` (terverifikasi dari `src/app/api/public/check-usage/route.js`) |
| Quota sharing | Buka halaman quota sharing di dashboard saat login | Data quota termuat, tidak ada error 500 |
| Invalid Providers | Buka daftar providers di dashboard | Provider invalid ditandai sesuai fitur fork (bukan perilaku upstream) |

## 5. Checklist Akhir

- [ ] Pra-rilis: tree bersih, review selesai, test tertarget lulus, suite penuh tanpa regresi baseline, `npm run build` hijau, scan secret bersih, nomor tag dipilih, rencana rollback siap.
- [ ] Tag beranotasi dibuat; `master` dan tag ter-push berurutan.
- [ ] Workflow `docker-publish.yml` hijau; digest `latest` di registry **berubah** dan tercatat.
- [ ] Backup `data/db` (lengkap dengan `-wal`/`-shm`) dan `.env` tersimpan dengan timestamp; permission `.env` backup 600.
- [ ] `docker compose pull && docker compose up -d` selesai.
- [ ] `docker inspect`: `Created` berubah **dan** digest cocok dengan registry.
- [ ] Smoke test: container `Up`, health lokal `200`, endpoint terproteksi `401`, health publik `200`, dashboard terautentikasi normal, fitur fork (check-usage / quota / invalid providers) berfungsi.
- [ ] Catat di log rilis: tag, digest lama → digest baru, timestamp backup, hasil smoke test.

Kalau salah satu item gagal setelah deploy: **jangan improvisasi** — jalankan [runbook rollback](rollback-and-recovery.md).
