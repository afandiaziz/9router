# 9Router Fork Development Handbook

Panduan operasional untuk mengembangkan fork `afandiaziz/9router` di laptop pribadi dan me-release-nya dengan aman ke production VPS. Ditulis dalam bahasa Indonesia teknis; semua perintah diverifikasi terhadap file repository dan layout produksi saat ini.

**Terakhir diverifikasi:** 2026-08-19 · HEAD `master`: `137f02daf` (docs: plan fork development handbook) · Versi paket: `0.5.55` (lihat `package.json`).

---

## Daftar Isi

1. [Topologi Repository & Lifecycle](#1-topologi-repository--lifecycle)
2. [Kebijakan Development & Release](#2-kebijakan-development--release)
3. [Riwayat Sesi & Pelajaran](#3-riwayat-sesi--pelajaran)
4. [Arsitektur, Secret, Data & Batas Operasional](#4-arsitektur-secret-data--batas-operasional)
5. [Runbooks](#5-runbooks)
6. [Production Gates](#6-production-gates)
7. [Troubleshooting Cepat](#7-troubleshooting-cepat)

---

## 1. Topologi Repository & Lifecycle

### 1.1 Dua direktori yang berbeda — jangan dicampur

| Peran | Path | Isi |
|---|---|---|
| **Source repository** | `/home/ubuntu/9router-fork` | Checkout git fork. Di sinilah kode ditulis, test dijalankan, tag dibuat. |
| **Production runtime** | `/home/ubuntu/9router` | Hanya berisi `docker-compose.yml`, `.env`, dan `data/` (SQLite + backup). **Tidak ada source code.** |

Aturan utama: tidak pernah menjalankan `npm run dev` atau mengedit kode di `/home/ubuntu/9router`. Direktori itu hanya untuk `docker compose pull`, `docker compose up -d`, backup, dan rollback. Sebaliknya, `/home/ubuntu/9router-fork` tidak pernah menjalankan container produksi.

### 1.2 Pipeline rilis

```text
Laptop clone → origin/master → v* tag → GitHub Actions → GHCR → VPS Compose → nginx → public domain
```

Penjelasan tiap tahap, diverifikasi terhadap file di repo ini:

1. **Laptop clone** — developer bekerja pada clone lokal `https://github.com/afandiaziz/9router.git` (lihat [runbooks/laptop-setup.md](runbooks/laptop-setup.md)).
2. **`origin/master`** — push fitur ke branch `master` fork. `master` adalah **kandidat rilis**: apapun yang di-push ke sana harus sudah lulus test dan siap di-deploy (kebijakan di [bagian 2](#2-kebijakan-development--release)).
3. **Tag `v*`** — membuat dan push tag seperti `v0.5.55-fork21` mentrigger workflow `.github/workflows/docker-publish.yml`:
   ```yaml
   on:
     push:
       tags:
         - "v*"
     workflow_dispatch:
   ```
   Tanpa tag `v*`, CI tidak jalan otomatis (kecuali dipicu manual lewat `workflow_dispatch`).
4. **GitHub Actions → GHCR** — workflow melakukan `docker/build-push-action@v6` ke image `ghcr.io/${{ github.repository }}` = `ghcr.io/afandiaziz/9router`, platform `linux/amd64` saja, dengan dua tag: `v<versi>` (dari `type=semver,pattern={{version}}`) dan `latest` (`type=raw,value=latest`). Login registry memakai `secrets.GITHUB_TOKEN` bawaan — fork tidak punya secret Docker Hub, jadi **hanya GHCR** yang dipakai (commit `2cdf0143`).
5. **VPS Compose** — `/home/ubuntu/9router/docker-compose.yml` mereferensikan `image: ghcr.io/afandiaziz/9router:latest` dengan `container_name: 9router`. Deploy = `docker compose pull && docker compose up -d` (lihat [runbooks/release-and-deploy.md](runbooks/release-and-deploy.md)).
6. **nginx** — server block `/etc/nginx/sites-enabled/9router.afandiaziz.my.id` listen `443 ssl` (Certbot) + `80` (redirect), `server_name 9router.afandiaziz.my.id`, `proxy_pass http://127.0.0.1:20129;`.
7. **Public domain** — `https://9router.afandiaziz.my.id` melayani dashboard dan API, sesuai `NEXT_PUBLIC_BASE_URL=https://9router.afandiaziz.my.id` di `.env` produksi.

### 1.3 Remote git

Terverifikasi via `git remote -v` di source repo:

| Remote | URL | Fungsi |
|---|---|---|
| `origin` | `https://github.com/afandiaziz/9router.git` | Fork milik sendiri. Tujuan push branch, tag rilis, dan trigger CI. |
| `upstream` | `https://github.com/decolua/9router.git` | Repo asli. Hanya di-fetch untuk sinkronisasi; tidak pernah di-push. |

### 1.4 Branch

Branch lokal saat ini (terverifikasi via `git branch`):

| Branch | Peran |
|---|---|
| `master` | Kandidat rilis; apa yang ada di sini diasumsikan siap deploy. |
| `feature/quota-sharing` | Branch fitur Quota Sharing (historis, sudah merged). |
| `invalid-providers` | Branch fitur Invalid Providers (historis, sudah merged). |
| `tier1-security`, `tier2`, `tier3` | Branch staging tier cherry-pick PR upstream (lihat `FORK-CHANGES.md`). `tier2` belum merged ke master. |
| `backup/pre-v055-merge` | Backup branch sebelum merge v0.5.55. |

Kebijakan worktree: file `.worktrees` di-ignore (`chore: ignore .worktrees for isolated worktrees`, commit `0e38b2c9b`), jadi `git worktree add .worktrees/<nama> <branch>` boleh dipakai untuk pekerjaan paralel tanpa mengotori tree utama.

---

## 2. Kebijakan Development & Release

### 2.1 Penamaan branch

- Fitur fork baru: `feature/<nama-fitur>` (contoh nyata: `feature/quota-sharing`).
- Perbaikan/UI fork: branch deskriptif (contoh nyata: `invalid-providers`, `feat/check-usage-brutalist`).
- Upgrade upstream: branch khusus seperti `upgrade/v0.5.56` — tidak pernah merge langsung di `master`.
- Backup sebelum merge berisiko: `backup/pre-<deskripsi>` (contoh nyata: `backup/pre-v055-merge`).

### 2.2 Commit

Ikuti gaya conventional commits yang sudah dipakai di history: `feat(scope):`, `fix(scope):`, `docs:`, `test:`, `chore:`, `style:`. Contoh dari history: `fix(security): require proof that x-9r-real-ip came from the socket`, `feat(check-usage): brutalist (mocasus) page redesign`, `test(baseline): regenerate provider snapshot for opencode-go transports`.

### 2.3 Konvensi tag

Format: `v<versi-upstream>-fork<N>`, dengan `N` nomor urut rilis fork di atas basis upstream tersebut.

Terbukti di `git tag`: `v0.5.50-fork1` … `v0.5.50-fork19` di atas basis v0.5.50, lalu `v0.5.55-fork20` setelah merge upstream v0.5.55 (nomor fork **tidak di-reset** saat basis naik). Tag upstream murni (`v0.5.55`) juga ada di repo karena di-fetch dari upstream.

Hanya tag yang diawali `v*` yang memicu build CI. Tag rilis fork harus di-push ke `origin`:

```bash
# dijalankan di /home/ubuntu/9router-fork
git tag -a v0.5.55-fork21 -m "deskripsi rilis"
git push origin master
git push origin v0.5.55-fork21
```

### 2.4 Kebijakan sinkronisasi upstream & konflik

Referensi kanonik: `FORK-CHANGES.md` — tabel per-PR berisi status (deployed/staged/konflik/ditolak/dihindari) dan instruksi eksplisit:

> Saat `git merge upstream/master` menimbulkan konflik, cek tabel: kalau file yang konflik berasal dari PR yang sudah di-merge upstream dalam bentuk berbeda, buang versi fork (`git checkout --theirs`) dan hapus barisnya dari tabel.

Kebijakan:

- **Selalu trial merge di branch upgrade**, bukan di `master` (kasus nyata: merge v0.5.55, lihat [bagian 3.3](#33-merge-v0555--security-fix--fork20)).
- **Buat backup branch/tag** sebelum merge (contoh nyata: `backup/pre-v055-merge`).
- Prioritaskan versi upstream di luar fitur khas fork; pertahankan fitur fork (lihat [bagian 2.5](#25-fitur-fork-yang-dilindungi)).
- Catat keputusan konflik di `FORK-CHANGES.md` agar konflik berikutnya lebih cepat diselesaikan.
- PR upstream yang pernah terbukti merusak (contoh: #664, revert di commit `9ed5be64`) **jangan diambil lagi** — daftarnya ada di `FORK-CHANGES.md` bagian "Hindari" dan "Commit Custom".

Prosedur lengkap: [runbooks/upstream-sync.md](runbooks/upstream-sync.md).

### 2.5 Fitur fork yang dilindungi

Fitur-fitur ini **tidak ada di upstream** dan harus dipertahankan saat merge upstream apa pun:

| Fitur | Rangkuman | Bukti di repo |
|---|---|---|
| **Quota Sharing** | API key berbagi `sk-danton-*` dengan allowlist model, alias model, dan batas token per window (daily/weekly/monthly/lifetime). Tabel DB `quotaKeys` + `quotaUsage`. | commit `b9e788639`..`312d65553` (fork8–fork17); `FORK-CHANGES.md` bagian QUOTA SHARING |
| **Check Usage (public)** | Halaman publik `/check-usage` + API `/api/public/check-usage` untuk cek sisa kuota tanpa login; redesign brutalist terbaru. | commit `2053f01f4`, `33921fba9`, `a68b9180e` |
| **Invalid Providers** | Halaman dashboard Invalid Providers, endpoint `GET /api/providers/invalid`, agregasi `getInvalidConnections`, detail provider-node, bulk disable/delete/reset via `POST /api/providers/bulk`. | commit `301d9815c`..`3e1650ba6` (fork18–fork19) |
| **CI GHCR-only** | Workflow hanya publish ke GHCR, amd64, `latest` tanpa syarat. | commit `2cdf0143`, `.github/workflows/docker-publish.yml` |
| **Revert #664** | Method `transformRequest` ganda yang mematikan logika executor — jangan pernah diambil ulang. | commit `9ed5be64` |

Jika merge upstream menyentuh file-file milik fitur di atas, selesaikan konflik secara manual dengan mempertahankan perilaku fitur fork — jangan `checkout --theirs` membabi buta.

### 2.6 Production gates (ringkas)

Deploy hanya setelah seluruh gate di [bagian 6](#6-production-gates) hijau. Versi lengkap yang bisa dicentang ada di [runbooks/release-and-deploy.md](runbooks/release-and-deploy.md).

---

## 3. Riwayat Sesi & Pelajaran

Semua fakta di bagian ini diverifikasi terhadap `git log`, `git tag`, dan `FORK-CHANGES.md`.

### 3.1 Quota Sharing, Check Usage, lifetime quota, model alias (fork8–fork17)

Fitur buatan fork (bukan PR upstream), di-deploy bertahap:

| Tag | Isi utama |
|---|---|
| `v0.5.50-fork8` | Fitur lengkap pertama: skema v2 (`quotaKeys` + `quotaUsage`), window helper, repo CRUD, enforcement di `handleChat`, increment usage, halaman publik `/check-usage` + API, CRUD `/api/quota-keys`, dashboard, `/v1/models` tersaring (16 komit, 23 file baru). |
| `v0.5.50-fork9` | Polish UX; prefix diubah `qsk-` → `sk-danton-`. |
| `v0.5.50-fork10` | Fix: quota key bisa dipakai saat `requireApiKey=true` (`8fb149a3d`). |
| `v0.5.50-fork11` | Fix routing alias + format `keyPrefix` + `baseUrl` proxy-aware (`3fc23b245`). |
| `v0.5.50-fork12` | Fix fatal: `modelStr` `const` → `let` — semua request alias balas HTTP 500 `TypeError: Assignment to constant variable` sebelum fix ini (`061f0e5e4`). |
| `v0.5.50-fork13` | `/check-usage`: total requests + tombol refresh (`33921fba9`). |
| `v0.5.50-fork14` | Tabbed how-to-use, design system alignment, fix regen key (`89d700529`). |
| `v0.5.50-fork15` | Fix **lifetime quota diam-diam mencatat 0 usage** — tiga root cause (`93750b702`). |
| `v0.5.50-fork16` | Fix `/v1/models` mengembalikan list kosong untuk quota key; tambah tombol check-usage (`a8f097ed0`). |
| `v0.5.50-fork17` | Fix `/v1/models` membuang allowed models yang tidak ada di katalog statis (`312d65553`). |

Setelah itu `/check-usage` diredesain brutalist (branch `feat/check-usage-brutalist`, merge `a68b9180e`).

**Pelajaran:**

- **Lifetime quota tracking 0** menunjukkan fitur bisa "lulus test unit tapi mati di produksi" — verifikasi selalu lewat request nyata terhadap endpoint produksi setelah deploy, bukan hanya test suite.
- **Bug `const` vs `let` (fork12)** membuktikan satu baris bisa mematikan seluruh fitur; smoke test terhadap path alias wajib ada di gate deploy.
- **baseUrl salah di halaman publik (fork11)**: `new URL(request.url).origin` menghasilkan `http://localhost` di balik reverse proxy — selalu bangun URL publik dari header `x-forwarded-proto`/`x-forwarded-host`.

### 3.2 Invalid Providers & provider-node UI (fork18–fork19)

| Tag | Isi |
|---|---|
| `v0.5.50-fork18` | Endpoint `GET /api/providers/invalid` (`ad76d53d1`), agregasi repo `getInvalidConnections` (`301d9815c`), komponen `InvalidProviderGroup` (`7cbfe0b7d`), `ErrorStatusTabs` (`b26ad2fa0`), bulk endpoint `POST /api/providers/bulk` + repo atomic bulk disable/delete/reset (`2a4128da3`, `21dd6a52b`), halaman + sidebar link (`db978f375`), util klasifikasi error bersama (`bad7419b2`), fix allow-list/snapshot/chevron/stale-refetch (`edd58de49`). |
| `v0.5.50-fork19` | Expose detail provider-node untuk grup invalid (`bfa3930c6`), tampilkan detail di UI (`908562591`), perbaikan tipografi (`3e1650ba6`). |

Motivasi: instance ini mengelola ribuan koneksi provider (per FORK-CHANGES.md: 3594 koneksi, 3558 aktif), sehingga deteksi koneksi gagal dan aksi bulk adalah kebutuhan operasional, bukan kosmetik.

### 3.3 Merge v0.5.55 & security fix (fork20)

- Backup branch `backup/pre-v055-merge` dibuat sebelum merge.
- Merge `1e567a17e Merge tag v0.5.55 from decolua/9router` membawa masuk antara lain: **security fix GHSA-pjm4-8fpg-f9p6** (`92259214d` — `x-9r-real-ip`/Host fallback dulunya dipercaya dari header client ketika `custom-server.js` tidak ada di request path, sehingga caller remote bisa menyamar sebagai local untuk melewati auth API key dan mencapai `LOCAL_ONLY_PATHS`; fix: `custom-server.js` membuat secret per-proses `x-9r-peer-token` dan `src/lib/auth/trustedPeer.js` menggerbangi kepercayaan pada header itu, fail-closed di produksi), routing opencode-go via transports (`e1115e283`), fix Docker sql.js fallback (`27f3710c8`), dan pembacaan `usageMetadata` Gemini dari envelope antigravity (`59d858b63`).
- Regenerasi snapshot test provider untuk transports opencode-go (`540ebbe68`) — **generated snapshot memang harus ikut berubah** saat perilaku translator berubah; bersihkan/commit secara eksplisit, jangan biarkan churn tak terkontrol.
- Penyesuaian test `translator-helpers-edge` terhadap perilaku cache re-anchor v0.5.55 (`450b7d0fa`).
- Rilis: tag `v0.5.55-fork20`.

**Pelajaran tentang merge upstream:**

- Trial merge di branch + backup branch lebih aman daripada menebak dampak konflik; keputusan konflik didasarkan pada isi file, bukan asumsi (rincian tiga file konflik v0.5.55 ada di [runbooks/upstream-sync.md](runbooks/upstream-sync.md)).
- Security advisory upstream (GHSA) harus masuk secepatnya; fork yang menunda merge menanggung risiko endpoint lokal terekspos.

### 3.4 Pelajaran lintas-sesi

1. **GHCR `latest` bisa basi.** `latest` hanya berpindah setelah workflow dari tag baru selesai. Deploy sebelum digest registry berubah = menjalankan image lama sambil mengira sudah upgrade. Selalu verifikasi digest/timestamps sebelum `docker compose pull` (lihat [runbooks/release-and-deploy.md](runbooks/release-and-deploy.md)).
2. **`docker compose up -d` tidak selalu me-recreate container.** Compose hanya recreate jika konfigurasi/image berubah menurut docker. Verifikasi timestamp `Created` container setelah deploy; kalau tidak berubah, container masih menjalankan image lama.
3. **Trial merge, bukan tebakan.** Konflik v0.5.55 diselesaikan berdasarkan bukti merge, dan keputusan dicatat supaya konflik berulang cepat diselesaikan.
4. **Baseline test dilaporkan jujur.** Baseline yang tercatat di `FORK-CHANGES.md`: 88 gagal / 1810 lulus (+49 test quota) — 88 kegagalan itu **sudah ada sebelumnya** dan bukan regresi. Jangan pernah menulis "semua test lulus"; tulis "nol regresi terhadap baseline X gagal / Y lulus".
5. **Snapshot test yang di-generate menimbulkan churn.** Saat translator berubah (mis. v0.5.55), snapshot provider harus di-regenerate dan di-commit sebagai perubahan tersendiri (`test(baseline): ...`) supaya diff fitur tetap bersih.
6. **Database tidak pernah rusak selama insiden fork3–fork6** — yang rusak adalah UI (template literal tak terevaluasi, lalu filter server-side yang tak cocok dengan auth session). Pelajaran: pisahkan diagnosis "data hilang" vs "UI tidak menampilkan", dan tambahkan guard struktural ke test suite (commit `4daadad6`, `08e394c3`).
7. **Security fix mengubah asumsi trust.** Setelah GHSA-pjm4-8fpg-f9p6, header `x-9r-real-ip` hanya dipercaya bila dibuktikan datang dari `custom-server.js`. Dokumentasi/runbook yang menyarankan `npm run start` tanpa custom-server di balik proxy harus memahami konsekuensi ini.

---

## 4. Arsitektur, Secret, Data & Batas Operasional

### 4.1 Port

| Konteks | Port | Sumber kebenaran |
|---|---|---|
| Local dev / start (source repo) | `20127` | `package.json` scripts: `next dev --port 20127`, `node custom-server.js --port 20127` |
| Production (VPS) | `20129` | `PORT=20129` di `/home/ubuntu/9router/.env`; nginx `proxy_pass http://127.0.0.1:20129;` |
| Default image Docker upstream | `20128` | `Dockerfile` (`ENV PORT=20128`, `EXPOSE 20128`) — **tidak dipakai** instance ini; compose produksi menimpa via `.env` |

Catatan: README upstream menyebut `20128` di mana-mana. Di fork ini angka itu hanya relevan untuk image default; development laptop memakai `20127` dan produksi `20129`.

### 4.2 Layout data

Di container, `DATA_DIR=/app/data` (`Dockerfile`), dipetakan ke volume/named volume compose. Layout (dari `DOCKER.md`):

```text
$DATA_DIR/
├── db/
│   ├── data.sqlite       # database SQLite utama (providers, combos, keys, settings, usage)
│   └── backups/          # backup otomatis
└── ...                   # certs, logs, runtime configs
```

Di host produksi, data hidup di `/home/ubuntu/9router/data/` (termasuk `data/db/`). Stack DB: SQLite via `better-sqlite3` (optionalDependency) dengan fallback `node:sqlite` / `sql.js` — sejak v0.5.55, `sql.js` ikut dikirim di image agar fallback pure-JS bisa start (`27f3710c8`). Skema fork menambah tabel `quotaKeys` dan `quotaUsage` (`1ff511e04`).

Log request opsional: `<repo>/logs/...` bila `ENABLE_REQUEST_LOGS=true`.

### 4.3 Secret & portability

Kontrak environment ada di `.env.example`. Prinsip:

- **Tidak ada nilai secret yang boleh muncul di dokumentasi, commit, atau log.** Handbook ini hanya memakai nama variabel dan placeholder.
- `JWT_SECRET` menandatangani cookie auth dashboard; `INITIAL_PASSWORD` hanya dipakai saat belum ada hash tersimpan; `API_KEY_SECRET` untuk HMAC API key; `MACHINE_ID_SALT` untuk machine ID.
- **`DB_ENCRYPTION_KEY` wajib dibackup bersama database.** Secret koneksi provider (token OAuth, API key) dienkripsi at-rest memakai AES-256-GCM (PR #2776; per FORK-CHANGES.md: 348 key terenkripsi). Default key diturunkan dari mesin — artinya **memindahkan `DATA_DIR` ke mesin lain tanpa `DB_ENCRYPTION_KEY` membuat kredensial tidak terbaca**. Set variabel ini secara eksplisit jika DB harus portabel, dan simpan nilainya di luar repo bersama backup DB.
- `.env` tidak di-bake ke image (`.dockerignore`); injeksi via `env_file` di compose.

### 4.4 Batas kepercayaan nginx

- nginx terminasi TLS (`443 ssl`, Certbot) dan mem-proxy ke `127.0.0.1:20129`. Aplikasi hanya perlu listen di loopback/host — tidak ada TLS di dalam container.
- Header `x-forwarded-proto`/`x-forwarded-host` dari nginx dipakai aplikasi untuk membangun URL publik (fix fork11).
- Set `AUTH_COOKIE_SECURE=true` di `.env` produksi karena traffic publik HTTPS (kontrak di `.env.example`).
- `REQUIRE_API_KEY=true` dianjurkan untuk deploy yang terekspos internet (`.env.example`), dan instance ini memang menegakkan auth: setelah Tier 1, `/api/pxpipe/status` berubah 401 → 403 dan `GET /v1/models` memerlukan API key (lihat `FORK-CHANGES.md`).
- Setelah fix GHSA-pjm4-8fpg-f9p6: jangan pernah menganggap header `x-9r-real-ip` dari klien eksternal sebagai bukti "request lokal".

### 4.5 Batas data produksi

**Data produksi tidak boleh disalin ke laptop tanpa proses sanitasi eksplisit.** Alasannya:

- `data.sqlite` produksi memuat kredensial provider terenkripsi, API key, quota key `sk-danton-*` milik pihak ketiga, dan histori usage.
- Tanpa `DB_ENCRYPTION_KEY` yang cocok, kredensial tidak bisa didekripsi di mesin lain — tapi file DB-nya sendiri tetap data sensitif.
- Development laptop memakai DB baru yang dibuat otomatis di `DATA_DIR` lokal; jika butuh data uji, buat koneksi provider tiruan atau minta proses sanitasi yang disetujui — jangan `scp` `data/db` mentah.

---

## 5. Runbooks

Handbook ini menjelaskan konsep dan kebijakan. Checklist yang bisa dieksekusi ada di empat runbook:

| Runbook | Kapan dipakai |
|---|---|
| [runbooks/laptop-setup.md](runbooks/laptop-setup.md) | Bootstrap laptop baru (Windows+WSL2/macOS/Linux): clone, remote, install, dev server, test, build, verifikasi tanpa data produksi. |
| [runbooks/upstream-sync.md](runbooks/upstream-sync.md) | Membandingkan fork dengan upstream, trial merge, resolusi konflik, termasuk studi kasus v0.5.55. |
| [runbooks/release-and-deploy.md](runbooks/release-and-deploy.md) | Gate pra-rilis, tagging, verifikasi CI/GHCR, backup, deploy Compose, smoke test. |
| [runbooks/rollback-and-recovery.md](runbooks/rollback-and-recovery.md) | Rollback image vs restore DB, batasan migrasi skema, troubleshooting insiden deploy. |

---

## 6. Production Gates

Deploy hanya dilakukan setelah **semua** item berikut hijau (dari design spec yang disetujui):

- [ ] 1. Working tree bersih (`git status` kosong) dan target commit/tag jelas.
- [ ] 2. Diff/upstream comparison selesai direview (bukan di-skip karena "kelihatannya aman").
- [ ] 3. Targeted test fitur fork lulus (quota, check-usage, invalid providers).
- [ ] 4. Full suite dibandingkan dengan baseline; kegagalan dilaporkan jujur ("nol regresi vs baseline X gagal / Y lulus").
- [ ] 5. Production build berhasil (`npm run build` di source repo).
- [ ] 6. Path sensitif keamanan diperiksa (auth, `LOCAL_ONLY_PATHS`, trusted peer headers).
- [ ] 7. Database (`data/db`) dan `.env` produksi dibackup. **Peringatan: migrasi skema DB umumnya tidak bisa di-rollback** — backup adalah satu-satunya jalan kembali.
- [ ] 8. Tag `v*` di-push dan GitHub Actions/GHCR selesai dengan digest baru.
- [ ] 9. Container di-recreate dengan image baru (verifikasi timestamp `Created` berubah).
- [ ] 10. Health check, protected endpoint (401/403 tanpa auth), dan authenticated smoke test berhasil.
- [ ] 11. Rollback path diketahui **sebelum** deploy (tag image sebelumnya + lokasi backup DB + `DB_ENCRYPTION_KEY`).

---

## 7. Troubleshooting Cepat

| Gejala | Penyebab terverifikasi | Rujukan |
|---|---|---|
| Deploy "sukses" tapi perilaku lama | GHCR `latest` basi — workflow tag belum selesai | §3.4.1, release-and-deploy.md |
| `docker compose up -d` jalan tapi container tidak recreate | Compose tidak melihat perubahan; cek timestamp `Created` | §3.4.2, rollback-and-recovery.md |
| CI tidak jalan setelah push | Tag tidak diawali `v*`; workflow hanya trigger pada `v*` atau `workflow_dispatch` | §1.2, `.github/workflows/docker-publish.yml` |
| Full test suite "gagal 88" | Itu baseline yang sudah ada; bandingkan, jangan panik | §3.4.4, `FORK-CHANGES.md` |
| Diff test kotor setelah upgrade upstream | Snapshot provider perlu di-regenerate sebagai commit `test(baseline)` tersendiri | §3.4.5 |
| Merge upstream konflik di file PR lama | Cek tabel `FORK-CHANGES.md`; mungkin PR sudah di-merge upstream dalam bentuk lain → `checkout --theirs` | §2.4, upstream-sync.md |
| Kredensial provider tidak terbaca setelah pindah mesin | `DB_ENCRYPTION_KEY` tidak ikut; default key terikat mesin | §4.3 |
| URL di halaman publik menunjuk `localhost` | Origin dibangun dari `request.url`, bukan header proxy; pakai `x-forwarded-*` | §3.1 (fork11) |
| Request "lokal" tidak lagi dipercaya setelah v0.5.55 | Fix GHSA-pjm4-8fpg-f9p6: `x-9r-real-ip` wajib dibuktikan via `x-9r-peer-token` | §3.3 |

---

*Dokumen ini diverifikasi terhadap repository pada 2026-08-19. Jika topology berubah (port, domain, remote, registry), perbarui handbook dan keempat runbook bersamaan.*
