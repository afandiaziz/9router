# Runbook: Rollback & Recovery

Prosedur memulihkan produksi `9router` (`/home/ubuntu/9router`, domain `9router.afandiaziz.my.id`) setelah deploy bermasalah: rollback image, restore database, dan troubleshooting insiden. Prinsip utama: **rollback image dan restore DB adalah dua operasi terpisah** — jangan mencampurnya.

Runbook pendamping: [release-and-deploy.md](release-and-deploy.md). Topologi produksi dan kebijakan ada di [FORK-DEVELOPMENT-HANDBOOK.md](../FORK-DEVELOPMENT-HANDBOOK.md).

**Terakhir diverifikasi:** 2026-08-19 · Backup nyata di disk: `data/db.bak-2026-08-19-0107`, `data/db.bak-prefork5-2026-08-10-1540`.

---

## Daftar Isi

1. [Prinsip dan Keputusan Awal](#1-prinsip-dan-keputusan-awal)
2. [Amankan Bukti Keadaan Gagal](#2-amankan-bukti-keadaan-gagal)
3. [Rollback Image (Tanpa Menyentuh DB)](#3-rollback-image-tanpa-menyentuh-db)
4. [Restore Database (Schema-Aware)](#4-restore-database-schema-aware)
5. [Verifikasi Pasca-Rollback](#5-verifikasi-pasca-rollback)
6. [Troubleshooting Insiden](#6-troubleshooting-insiden)

---

## 1. Prinsip dan Keputusan Awal

Dua skenario, dua jalur berbeda:

| Skenario | Gejala | Jalur |
|---|---|---|
| **A — Image buruk, DB sehat** | Container crash, error runtime, fitur rusak; DB tidak dimigrasi atau migrasi kompatibel-mundur | [Bagian 3](#3-rollback-image-tanpa-menyentuh-db) saja |
| **B — Migrasi skema merusak** | Aplikasi jalan tapi data korup/error migrasi; versi lama tidak bisa membaca skema baru | [Bagian 4](#4-restore-database-schema-aware) (restore DB) **lalu** pin image versi lama |

Aturan keras:

- **Jangan restore DB kalau hanya image yang bermasalah** — restore DB membuang data yang ditulis setelah backup; itu mahal dan biasanya tidak perlu.
- **Jangan rollback image melewati migrasi skema tanpa restore DB** — image lama yang membaca skema baru bisa gagal start atau (lebih buruk) menulis data korup. Backup otomatis aplikasi memang dibuat **sebelum setiap migrasi skema** di `data/db/backups/` (komentar di `src/lib/db/backup.js`), tetapi ia mengecualikan tabel `requestDetails` dan hanya menyimpan 3 terakhir (`KEEP_BACKUPS = 3`) — jangan mengandalkannya sebagai satu-satunya jalan kembali.
- **`DB_ENCRYPTION_KEY` adalah bagian dari backup DB.** DB terenkripsi tidak bisa dibuka tanpa key yang sama (handbook bagian 4.3). Sebelum restore apa pun, pastikan `.env` yang akan dipakai memuat key yang **cocok dengan backup DB-nya** — inilah alasan `.env` ikut dibackup di runbook rilis.

## 2. Amankan Bukti Keadaan Gagal

Sebelum mengubah apa pun, bekukan keadaan gagal — Anda akan membutuhkannya untuk diagnosis dan mungkin untuk membuktikan apa yang terjadi:

```bash
cd /home/ubuntu/9router
TS=$(date +%Y-%m-%d-%H%M)
mkdir -p "incident-${TS}"
docker compose logs --tail 500 9router > "incident-${TS}/logs.txt" 2>&1
docker inspect 9router > "incident-${TS}/inspect.json"
docker compose ps > "incident-${TS}/ps.txt"
cp docker-compose.yml "incident-${TS}/"
```

Jangan `docker compose down -v` atau menghapus volume/data sebelum bukti tersimpan. Direktori `incident-*` adalah lokal VPS; jangan di-commit.

## 3. Rollback Image (Tanpa Menyentuh DB)

Dipakai untuk skenario A. Compose produksi memakai `:latest` (komentar di file: "Rollback manual edit to specific version"), jadi rollback = **pin tag versi sebelumnya**.

### 3.1 Hentikan penulisan (singkat)

```bash
cd /home/ubuntu/9router
docker compose stop 9router
```

Rollback image biasa sebenarnya bisa dilakukan `up -d` langsung, tetapi stop eksplisit memberi jendela yang tenang dan membuat urutan kejadian jelas saat insiden.

### 3.2 Pin versi sebelumnya

Edit `docker-compose.yml`, ganti baris image:

```yaml
    image: ghcr.io/afandiaziz/9router:0.5.55-fork20
```

Sesuaikan dengan tag rilis stabil terakhir (daftar tag: `git tag -l "v*" | sort -V | tail -5` di repo fork; tag GHCR memakai format semver tanpa prefix `v`, mis. `0.5.55-fork20`). Backup compose lama sudah jadi kebiasaan produksi (bukti: `docker-compose.yml.bak-prefork5-2026-08-10-1540`) — tiru polanya:

```bash
cp docker-compose.yml "docker-compose.yml.bak-rollback-$(date +%Y-%m-%d-%H%M)"
```

### 3.3 Pull tag yang di-pin dan recreate

```bash
docker compose pull
docker compose up -d
docker inspect 9router --format '{{.Created}} | {{.Config.Image}} | {{.Image}}'
```

Kriteria lulus: `Created` berubah (container baru), `Config.Image` menunjuk tag yang di-pin (bukan `latest`).

> **Mengapa perlu recreate eksplisit:** mengubah tag di compose file saja tidak mengganti container yang sedang jalan; `up -d`-lah yang membuat ulang container dari image yang di-pin. Tanpa langkah ini, Anda hanya mengedit teks.

### 3.4 Setelah stabil, kembalikan ke `latest` secara sadar

Pin version bersifat sementara. Setelah versi perbaikan dirilis (runbook rilis), kembalikan `image:` ke `:latest` melalui alur deploy normal — jangan biarkan produksi tertinggal di pin lama tanpa catatan.

## 4. Restore Database (Schema-Aware)

Dipakai untuk skenario B, atau bila data rusak karena sebab lain. **Operasi ini destruktif terhadap data yang ditulis setelah backup** — jalankan hanya setelah keputusan eksplisit bahwa kehilangan data itu bisa diterima.

### 4.1 Periksa kompatibilitas skema dulu

Pertanyaan kunci: *apakah versi image yang akan dipakai bisa membaca skema DB target?*

- Backup pra-migrasi aplikasi ada di `data/db/backups/<label>-<versi>-<timestamp>/` — nama direktorinya mencatat versi aplikasi saat backup dibuat (dari `makeBackupDir` di `src/lib/db/backup.js`). Cocokkan dengan tag image tujuan.
- Backup manual pra-deploy (`data/db.bak-predeploy-*` dari runbook rilis) dibuat dari skema versi **sebelumnya** — aman dipasangkan dengan rollback image ke versi itu.
- Backup manual lain dengan pola `data/db.bak-*` (bukti nyata di disk: `db.bak-prefork4-2026-08-10-1442`, `db.bak-prefork5-2026-08-10-1540`) **boleh dipakai hanya bila kompatibel-skema** dengan image tujuan — mis. backup `prefork<N>` dibuat sebelum rilis fork N, sehingga cocok untuk image versi sebelum fork N. Daftar kandidat: `ls -d data/db.bak-*`. Bila ragu soal kompatibilitas, pilih backup yang lebih tua, bukan yang lebih baru.
- Tidak ada jalur restore otomatis (komentar `src/lib/db/backup.js`: "There is NO automated restore path; recovery is manual") — semua langkah di bawah manual dan harus diverifikasi satu per satu.

### 4.2 Hentikan penulisan ke DB

```bash
cd /home/ubuntu/9router
docker compose stop 9router
```

Wajib: SQLite mode WAL tidak boleh disalin saat ada writer aktif, dan container yang jalan akan terus menulis.

### 4.3 Amankan state rusak (jangan dihapus)

```bash
TS=$(date +%Y-%m-%d-%H%M)
mv data/db "data/db.failed-${TS}"
```

Memindahkan (bukan menghapus) menjaga bukti dan memberi jalan memulihkan data pasca-backup secara manual bila ternyata dibutuhkan.

### 4.4 Restore dari backup (konsisten DB+WAL+SHM)

```bash
cp -a "data/db.bak-<label>-<timestamp>" data/db
ls -la data/db
```

- Selalu restore **seluruh direktori** (`data.sqlite` + `data.sqlite-wal` + `data.sqlite-shm` dari momen yang sama). Mencampur `data.sqlite` dari satu waktu dengan `-wal` dari waktu lain menghasilkan database tidak konsisten.
- Kalau memakai backup aplikasi di `data/db/backups/<slug>/`: isinya adalah `data.sqlite` hasil `backupDbLite` — salin sebagai `data/db/data.sqlite` **tanpa** file WAL/SHM lama (hapus keduanya; SQLite akan membuat ulang saat start). Ingat: backup lite ini **tidak memuat `requestDetails`** — observability log akan kosong setelah restore. Ini konsekuensi yang disengaja, bukan kerusakan.

### 4.5 Pastikan `DB_ENCRYPTION_KEY` cocok

```bash
grep -c "^DB_ENCRYPTION_KEY=" .env
diff <(grep "^DB_ENCRYPTION_KEY=" .env) <(grep "^DB_ENCRYPTION_KEY=" ".env.bak-predeploy-<timestamp>") && echo "KEY COCOK"
```

Key di `.env` saat ini **harus identik** dengan key yang berlaku saat backup dibuat. Kalau beda: restore `.env` dari backup pasangannya (`.env.bak-predeploy-<timestamp>`, permission 600), bukan menebak key. DB terenkripsi dengan key yang salah akan gagal dibuka atau terbaca sebagai rusak.

### 4.6 Pin image ke versi yang cocok dengan skema, lalu start

Ikuti [langkah 3.2–3.3](#32-pin-versi-sebelumnya) untuk memastikan image yang dijalankan adalah versi yang kompatibel dengan skema hasil restore (biasanya versi saat backup dibuat), kemudian:

```bash
docker compose up -d
docker compose logs --tail 100 9router
```

Kriteria: tidak ada error migrasi, tidak ada error enkripsi, container `Up`.

## 5. Verifikasi Pasca-Rollback

Ulangi smoke test penuh dari runbook rilis [bagian 4](release-and-deploy.md#4-smoke-test):

```bash
docker compose ps
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:20129/api/health      # 200
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:20129/api/providers   # 401
curl -s -o /dev/null -w "%{http_code}\n" https://9router.afandiaziz.my.id/api/health  # 200
```

Lalu verifikasi terautentikasi (dashboard + fitur fork: check-usage, quota sharing, invalid providers) dan — untuk restore DB — cek bahwa data historis yang diharapkan ada dan data pasca-backup memang hilang sesuai keputusan. Catat hasil di direktori `incident-*`.

## 6. Troubleshooting Insiden

| Gejala | Penyebab umum | Tindakan |
|---|---|---|
| `docker compose pull` tidak mengambil image baru | Tag `latest` di registry masih menunjuk digest lama (propagasi GHCR) | Bandingkan digest registry (`docker buildx imagetools inspect ghcr.io/afandiaziz/9router:latest`) dengan digest container (`docker inspect`). Kalau sama padahal CI hijau: tunggu beberapa menit, ulangi pull. Jangan `up -d` sebelum digest berubah |
| Container tetap versi lama setelah deploy | `up -d` tidak me-recreate karena image/konfigurasi dianggap sama | Cek `docker inspect ... .Created`; kalau tidak berubah: `docker compose up -d --force-recreate 9router`. Verifikasi ulang digest |
| Push tag tidak memicu workflow | Workflow hanya mendengarkan tag `v*` dan `workflow_dispatch` (terverifikasi di `docker-publish.yml`) | Pastikan nama tag diawali `v` (`v0.5.56-fork21`, bukan `0.5.56-fork21`); cek tab Actions; alternatif: trigger manual `workflow_dispatch` dari Actions |
| Workflow gagal build/test | Lihat log job | `gh run view --log-failed`; perbaiki di branch, push commit, **buat tag baru** (jangan memindahkan tag yang sudah di-push) |
| Aplikasi gagal start setelah restore: error enkripsi | `DB_ENCRYPTION_KEY` tidak cocok dengan backup | Bandingkan `.env` dengan `.env.bak-*` pasangan backup ([langkah 4.5](#45-pastikan-db_encryption_key-cocok)); restore `.env` yang benar; jangan pernah men-generate key baru untuk DB lama |
| Image lama gagal membaca DB setelah rollback tanpa restore | Migrasi skema versi baru tidak kompatibel-mundur | Ini skenario B: hentikan, restore DB dari backup pra-deploy/pra-migrasi ([bagian 4](#4-restore-database-schema-aware)), pin image versi backup |
| Health lokal 200 tapi publik 502/timeout | Nginx tidak menjangkau container: port mismatch atau container mati | Verifikasi `docker compose ps`; pastikan container listen di `127.0.0.1:20129` sesuai `ports:` compose dan nginx `proxy_pass http://127.0.0.1:20129`; cek `nginx -t` dan `sudo systemctl reload nginx` bila config berubah |
| Endpoint terproteksi mengembalikan 200 tanpa auth | Regresi auth (bandingkan GHSA-pjm4-8fpg-f9p6) | **Insiden keamanan**: segera rollback image ke versi baik terakhir ([bagian 3](#3-rollback-image-tanpa-menyentuh-db)), bekukan bukti ([bagian 2](#2-amankan-bukti-keadaan-gagal)), eskalasi |
| Sisa branch trial merge / artefak percobaan mengotori repo | Trial merge tidak dibersihkan | Di repo fork (bukan VPS): `git merge --abort` bila masih ada merge berjalan, `git branch -D upgrade/<versi>` untuk branch percobaan, verifikasi `git status --short --branch` bersih. Backup branch `backup/*` **dipertahankan** — ia titik pemulihan |
| `.env` hilang/tertimpa dan tidak ada backup | Prosedur backup tidak diikuti | Tanpa `DB_ENCRYPTION_KEY` asli, DB terenkripsi **tidak dapat dipulihkan**. Cari salinan di `.env.bak-*` atau backup VPS tingkat host; kalau tidak ada, data harus dianggap hilang — inilah mengapa backup `.env` wajib di runbook rilis |

---

*Kedua runbook saling melengkapi: rilis tanpa rencana rollback dilarang, rollback tanpa bukti keadaan gagal menyulitkan diagnosis.*
