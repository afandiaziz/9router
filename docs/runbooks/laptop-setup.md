# Runbook: Setup Laptop Development

Prosedur bootstrap laptop untuk mengerjakan fork `afandiaziz/9router`: clone, remote upstream, dependency, environment, dev server, test, dan build. Ditulis dalam bahasa Indonesia teknis; semua perintah diverifikasi terhadap `package.json`, `tests/package.json`, `tests/vitest.config.js`, `.env.example`, dan `Dockerfile` di repository saat ini.

**Terakhir diverifikasi:** 2026-08-19 · Versi paket: `0.5.55` · Node referensi: v22 (lihat `Dockerfile`: `node:22-alpine`).

---

## Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Clone & Remote](#2-clone--remote)
3. [Install Dependency](#3-install-dependency)
4. [File Environment](#4-file-environment)
5. [Menjalankan Dev Server](#5-menjalankan-dev-server)
6. [Menjalankan Test](#6-menjalankan-test)
7. [Build Produksi](#7-build-produksi)
8. [Checklist Verifikasi & Keamanan Data](#8-checklist-verifikasi--keamanan-data)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prasyarat

Semua perintah verifikasi di bawah dijalankan di shell (PowerShell/Terminal/bash) — bukan di dalam repo.

### Windows (WSL2)

Development dilakukan **di dalam WSL2**, bukan di Windows native. Repo mengandung script Node dan native module (`better-sqlite3` opsional) yang paling mulus di Linux.

1. Install WSL2 dengan distro Ubuntu (dari PowerShell Administrator):

   ```powershell
   wsl --install
   ```

   Output yang diharapkan: `The requested operation is successful.` lalu diminta restart. Setelah restart, buka "Ubuntu" dari Start Menu dan buat user Linux.

2. Di dalam shell Ubuntu (WSL2), install Node.js 22 LTS via NodeSource dan git:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   ```

3. Clone repo ke filesystem Linux (mis. `~/9router-fork`), **bukan** ke `/mnt/c/...` — performa dan file-watching Next.js di mount Windows sangat lambat.

### macOS

Install lewat Homebrew:

```bash
brew install node@22 git
```

Jika `node` belum mengarah ke versi 22 setelah install `node@22` (formula ini kegated):

```bash
brew link --overwrite node@22
```

Alternatif: pakai `nvm` (`nvm install 22 && nvm use 22`).

### Linux (Debian/Ubuntu)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

Distro lain: install Node.js 22 LTS lewat package manager masing-masing atau `nvm`.

### Verifikasi prasyarat (semua platform)

```bash
node --version   # diharapkan: v22.x.x (Dockerfile memakai node:22-alpine)
npm --version    # diharapkan: 10.x atau lebih baru (bawaan Node 22)
git --version    # diharapkan: 2.x
```

Interpretasi: kalau `node --version` menunjukkan v18/v20, sebagian besar hal masih jalan, tetapi samakan dengan Node 22 agar perilaku lokal sama dengan image produksi. Node 18 adalah batas bawah untuk test (`tests/package.json` mendeklarasikan `"engines": { "node": ">=18" }`).

**Opsional — build tools untuk `better-sqlite3`:** `better-sqlite3` ada di `optionalDependencies`, jadi `npm install` **tidak gagal** tanpa compiler — runtime otomatis fallback ke `sql.js` (pure JS, ikut dikirim di image sejak v0.5.55). Kalau ingin native driver aktif di laptop: `sudo apt-get install -y build-essential python3` (Linux/WSL2) atau `xcode-select --install` (macOS).

## 2. Clone & Remote

```bash
git clone https://github.com/afandiaziz/9router.git 9router-fork
cd 9router-fork
git remote add upstream https://github.com/decolua/9router.git
git fetch upstream --tags
```

Penjelasan:

- `origin` menunjuk fork sendiri — tujuan push branch, tag rilis, dan trigger CI.
- `upstream` menunjuk repo asli `decolua/9router` — **hanya di-fetch**, tidak pernah di-push.
- `--tags` penting: tag upstream (mis. `v0.5.55`) dipakai sebagai basis perbandingan di [runbooks/upstream-sync.md](upstream-sync.md).

Output `git fetch upstream --tags` yang diharapkan: deretan baris `From https://github.com/decolua/9router` dengan `* [new branch] master -> upstream/master` dan `* [new tag] vX.Y.Z -> vX.Y.Z` pada clone pertama; pada fetch berikutnya bisa kosong (tidak ada yang baru) — itu normal.

## 3. Install Dependency

Ada **dua** dependency set: root (aplikasi) dan `tests/` (test suite punya `package.json` sendiri).

```bash
# dari root repo
npm install
npm --prefix tests install
```

Output yang diharapkan: `added N packages` untuk masing-masing. Peringatan `npm warn deprecated ...` boleh diabaikan; error `gyp` pada `better-sqlite3` juga aman diabaikan karena paket itu opsional (lihat [bagian 1](#1-prasyarat)).

Jangan pakai `npm ci` di `tests/` kecuali yakin `tests/package-lock.json` sinkron — perintah harian yang terdokumentasi di `tests/README.md` adalah `cd tests/ && npm install`.

## 4. File Environment

```bash
cp .env.example .env
```

Lalu edit `.env` dan **isi placeholder lokal** — jangan pernah menyalin nilai produksi:

| Variabel | Nilai lokal yang disarankan | Catatan |
|---|---|---|
| `JWT_SECRET` | string acak panjang buatan sendiri, mis. hasil `openssl rand -hex 32` | Placeholder `.env.example`: `change-me-to-a-long-random-secret` |
| `INITIAL_PASSWORD` | password lokal bebas | Hanya dipakai untuk login pertama di instance lokal |
| `DATA_DIR` | path lokal, mis. `./data` | Jangan arahkan ke path produksi `/var/lib/9router` |
| `PORT` | `20127` | Sesuai script `dev`/`start` di `package.json` |
| `NODE_ENV` | `development` | |
| `BASE_URL` / `NEXT_PUBLIC_BASE_URL` | `http://localhost:20127` | Menunjuk instance lokal itu sendiri |
| `CLOUD_URL` / `NEXT_PUBLIC_CLOUD_URL` | biarkan default `https://9router.com` | |

Variabel lain (`API_KEY_SECRET`, `MACHINE_ID_SALT`, dll.) boleh dibiarkan bernilai placeholder untuk development lokal. Aturan keras: **jangan pernah memasukkan secret produksi, API key provider nyata, atau data pengguna ke `.env` laptop.** `.env` sudah ada di `.gitignore` — tetap jangan di-commit.

## 5. Menjalankan Dev Server

```bash
npm run dev
```

Perintah ini menjalankan `next dev --port 20127` (lihat `package.json`). Output yang diharapkan:

```text
▲ Next.js 16.x.x
- Local:   http://localhost:20127
✓ Ready in ...ms
```

Buka `http://localhost:20127` di browser. Login pertama memakai `INITIAL_PASSWORD` dari `.env`.

Catatan:

- Port development fork adalah **20127** (`package.json`), bukan 20128 (default Docker upstream) atau 20129 (produksi VPS). Kalau port bentrok, hentikan proses yang memakai 20127 atau ubah `--port` sementara di command line (`npx next dev --port 20130`).
- Untuk varian webpack (bukan turbopack default Next 16): `npm run dev:webpack`.

Hentikan dev server dengan `Ctrl+C`. Tidak ada state yang perlu dibersihkan selain proses itu sendiri.

## 6. Menjalankan Test

Test suite hidup di `tests/` (vitest, config `tests/vitest.config.js`).

### Test penuh

```bash
npm --prefix tests test
```

(setara dengan `cd tests && npm test`, yang menjalankan `vitest run --reporter=verbose`).

### Test tertarget (satu file)

```bash
npm --prefix tests -- test unit/qoder.test.js
```

atau langsung dari root repo:

```bash
npx --prefix tests vitest run --config tests/vitest.config.js unit/qoder.test.js
```

Ganti `unit/qoder.test.js` dengan file yang relevan dengan perubahan Anda.

### Interpretasi hasil

**Penting — baseline jujur (dari `FORK-CHANGES.md`):** baseline yang tercatat adalah **88 gagal / 1810 lulus** (+49 test quota), dan 88 kegagalan itu **sudah ada sebelumnya** di upstream, bukan regresi fork. Jadi kriteria lulus bukan "semua hijau", melainkan **nol regresi terhadap baseline**: jumlah kegagalan tidak bertambah dan tidak ada test yang sebelumnya lulus ikut gagal. Saat melaporkan, tulis "nol regresi terhadap baseline X gagal / Y lulus", jangan "semua test lulus".

Catatan: sebagian test unit adalah smoke test provider nyata dan bisa lambat/flaky tanpa koneksi jaringan; kegagalan jaringan pada test semacam itu bukan regresi kode.

## 7. Build Produksi

```bash
npm run build
```

Perintah ini menjalankan `next build --webpack` lalu `postbuild` (`node scripts/copy-standalone-assets.mjs`) untuk menyiapkan output standalone. Output yang diharapkan diakhiri dengan ringkasan route dan tanpa error `Failed to compile`.

Untuk menjalankan hasil build secara lokal:

```bash
npm run start   # node custom-server.js --port 20127
```

Catatan keamanan (dari pelajaran GHSA-pjm4-8fpg-f9p6): selalu jalankan lewat `custom-server.js` (`npm run start`), bukan `next start` langsung. Header `x-9r-real-ip` hanya dipercaya bila dibuktikan datang dari `custom-server.js` via `x-9r-peer-token`; melewati custom server mengubah asumsi trust endpoint lokal.

## 8. Checklist Verifikasi & Keamanan Data

Jalankan seluruh checklist ini setelah setup, dan ulangi bagian remote/status sebelum mulai bekerja di sesi baru.

### Verifikasi remote dan status

```bash
git remote -v
```

Output yang diharapkan (persis empat baris ini):

```text
origin	https://github.com/afandiaziz/9router.git (fetch)
origin	https://github.com/afandiaziz/9router.git (push)
upstream	https://github.com/decolua/9router.git (fetch)
upstream	https://github.com/decolua/9router.git (push)
```

```bash
git status --short --branch
```

Interpretasi: `## master...origin/master` berarti sinkron; `[ahead N]` berarti ada commit lokal yang belum di-push. Working tree harus bersih sebelum mulai pekerjaan baru.

### Verifikasi versi

```bash
node --version    # v22.x.x
npm --version     # >= 10
node -p "require('./package.json').version"   # versi paket saat ini, mis. 0.5.55
```

### Verifikasi port

Saat dev server berjalan, pastikan 20127 benar-benar mendengarkan:

```bash
# Linux / macOS / WSL2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:20127
```

Output yang diharapkan: kode HTTP seperti `200` atau `307` (redirect ke login) — bukan `000` (connection refused). Alternatif tanpa curl: `lsof -i :20127` (macOS/Linux) atau buka `http://localhost:20127` di browser.

### Keamanan data (wajib sebelum coding)

- [ ] `.env` laptop hanya berisi placeholder/secret lokal — **tanpa** secret produksi, API key provider nyata, atau token pengguna.
- [ ] `DATA_DIR` lokal tidak menunjuk ke data produksi; jangan pernah menyalin `data/db/data.sqlite` dari VPS ke laptop.
- [ ] Tidak ada kredensial nyata di file yang akan di-commit (`git status` + `git diff --cached` sebelum commit).
- [ ] Test yang butuh jaringan dijalankan dengan sadar bahwa ia memanggil endpoint provider eksternal.

### Opsional: test Docker lokal

Membangun image yang sama dengan CI (Dockerfile root, target platform lokal):

```bash
docker build -t 9router-local .
docker run --rm -d --name 9router-local \
  -p 20128:20128 \
  -v "$PWD/.docker-data:/app/data" \
  --env-file .env \
  -e DATA_DIR=/app/data -e PORT=20128 -e HOSTNAME=0.0.0.0 \
  9router-local
```

Verifikasi: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:20128` menghasilkan `200`/`307`. Lihat log dengan `docker logs -f 9router-local`.

Cleanup (abort):

```bash
docker rm -f 9router-local
rm -rf .docker-data
docker rmi 9router-local   # opsional, kalau image tidak dipakai lagi
```

Catatan: image ini memakai port default 20128 (dari `Dockerfile`). Compose produksi menimpanya ke 20129 via `.env` VPS — jangan menyamakan laptop dengan nilai produksi.

## 9. Troubleshooting

| Gejala | Penyebab umum | Tindakan |
|---|---|---|
| `npm install` error `gyp` di `better-sqlite3` | Tidak ada compiler | Aman diabaikan (optionalDependency); runtime fallback ke `sql.js`. Kalau mau native: install build tools ([bagian 1](#1-prasyarat)) |
| Port 20127 sudah dipakai | Dev server lama masih hidup | `lsof -i :20127` lalu kill PID-nya, atau jalankan `npx next dev --port 20130` |
| `npm --prefix tests test` banyak gagal | Baseline upstream memang 88 gagal | Bandingkan dengan baseline ([bagian 6](#6-menjalankan-test)); yang penting nol regresi |
| Login lokal tidak bisa | `INITIAL_PASSWORD` berubah tapi DB lama masih ada | Hapus `$DATA_DIR/db/data.sqlite` lokal lalu restart dev server (hanya untuk data lokal!) |
| `next dev` lambat di WSL2 | Repo ditaruh di `/mnt/c/...` | Pindahkan clone ke filesystem Linux (`~/...`) |
