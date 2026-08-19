# Runbook: Sinkronisasi Upstream

Prosedur membandingkan fork `afandiaziz/9router` dengan upstream `decolua/9router`, melakukan trial merge yang aman, dan menyelesaikan konflik berdasarkan bukti — bukan tebakan. Termasuk studi kasus nyata merge v0.5.55.

Kebijakan yang menjadi dasar runbook ini ada di handbook [bagian 2.4](../FORK-DEVELOPMENT-HANDBOOK.md#24-kebijakan-sinkronisasi-upstream--konflik) (sinkronisasi & konflik) dan [bagian 2.5](../FORK-DEVELOPMENT-HANDBOOK.md#25-fitur-fork-yang-dilindungi) (fitur fork yang dilindungi). Semua perintah diverifikasi terhadap repository saat ini.

**Terakhir diverifikasi:** 2026-08-19 · Basis saat ini: `v0.5.55` (merge `1e567a17e`).

---

## Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Membandingkan Fork dengan Upstream](#2-membandingkan-fork-dengan-upstream)
3. [Trial Merge yang Aman](#3-trial-merge-yang-aman)
4. [Kebijakan Resolusi Konflik](#4-kebijakan-resolusi-konflik)
5. [Verifikasi Sebelum Merge ke Master](#5-verifikasi-sebelum-merge-ke-master)
6. [Studi Kasus: Merge v0.5.55](#6-studi-kasus-merge-v0555)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prasyarat

- Setup laptop selesai sesuai [runbooks/laptop-setup.md](laptop-setup.md): kedua remote terkonfigurasi, dependency root dan `tests/` terinstall, working tree bersih (`git status --short --branch` tanpa perubahan).
- `FORK-CHANGES.md` sudah dibaca — tabel per-PR di sana adalah referensi kanonik status setiap perubahan fork terhadap upstream (deployed/staged/konflik/ditolak/dihindari).

## 2. Membandingkan Fork dengan Upstream

Selalu mulai dari `master` yang bersih dan sinkron dengan `origin`:

```bash
git checkout master
git pull origin master
```

### 2.1 Fetch upstream beserta tag

```bash
git fetch upstream --tags
```

Output yang diharapkan: baris `From https://github.com/decolua/9router` dengan `* [new branch]` / `* [new tag]` bila ada yang baru; **tidak ada output sama sekali itu normal** dan berarti upstream tidak berubah sejak fetch terakhir. `--tags` wajib: perbandingan tag ([langkah 2.5](#25-membandingkan-tag)) bergantung padanya.

### 2.2 Titik temu (merge-base)

```bash
git merge-base master upstream/master
```

Output: satu hash commit, mis. `699edac3273e13d4744bc46f6082618f08560702`. Ini adalah commit upstream terakhir yang sudah masuk ke fork (untuk basis v0.5.55, hash ini adalah commit tag `v0.5.55`). Semua commit upstream **setelah** hash ini adalah kandidat untuk di-merge.

### 2.3 Jumlah commit kiri/kanan

```bash
git rev-list --count master..upstream/master   # commit upstream yang belum ada di fork
git rev-list --count upstream/master..master   # commit fork yang belum ada di upstream
```

Interpretasi:

- Angka pertama **0** berarti fork sudah memuat seluruh upstream — tidak ada yang perlu di-merge (situasi terverifikasi per 2026-08-19: `0`).
- Angka pertama **> 0** berarti ada pekerjaan merge; lanjutkan ke [bagian 3](#3-trial-merge-yang-aman).
- Angka kedua **> 0** itu normal dan diharapkan — itu fitur fork (`113+` per 2026-08-19). Angka ini tidak pernah nol selama fork hidup dan **terus bertambah** — setiap commit fork baru (termasuk commit dokumentasi seperti runbook ini) ikut menaikkannya. Jalankan perintahnya; jangan andalkan angka yang tertulis di sini.

### 2.4 Log dan file yang berubah di upstream

```bash
git log --oneline master..upstream/master
git diff --stat master...upstream/master
```

Perhatikan titik dua (`..`, urutan commit) vs titik tiga (`...`, diff terhadap merge-base). Baca log untuk menemukan:

- **Security fix / advisory GHSA** — prioritaskan merge secepatnya (pelajaran dari GHSA-pjm4-8fpg-f9p6: fork yang menunda merge menanggung risiko endpoint lokal terekspos).
- **PR yang masuk daftar "Hindari" di `FORK-CHANGES.md`** — contoh nyata: kasus `transformRequest` ganda yang mematikan logika executor, direvert di `9ed5be64`. Catatan penomoran: `FORK-CHANGES.md` memberi label PR **#664**, sedangkan pesan commit revert itu sendiri merujuk issue **#560** ("closes #560") — dokumen ini tidak menyatakan mana yang benar; keduanya menunjuk peristiwa revert yang sama (`9ed5be64`). PR seperti ini jangan diambil lagi; kalau sudah masuk upstream, rencanakan revert sesudah merge.
- Perubahan pada file milik **fitur fork yang dilindungi** (quota sharing, check-usage, invalid providers — daftar lengkap di handbook bagian 2.5) — tandai untuk resolusi manual.

### 2.5 Membandingkan tag

```bash
git tag -l "v*" | sort -V | tail -5
git describe --tags master
```

Interpretasi: tag fork berformat `v<versi-upstream>-fork<N>` dan nomor `N` **tidak di-reset** saat basis naik (bukti: `v0.5.50-fork19` → `v0.5.55-fork20`). Tag upstream murni seperti `v0.5.55` hadir karena di-fetch. Kalau `git describe` menunjuk basis yang lebih tua dari tag upstream terbaru, ada release upstream yang belum di-merge.

## 3. Trial Merge yang Aman

Aturan keras: **tidak pernah `git merge upstream/master` langsung di `master`.** Selalu lewat branch upgrade + backup.

### 3.1 Backup

```bash
git branch backup/pre-v0XX-merge master
```

Contoh nyata di repo: `backup/pre-v055-merge`. Untuk rilis yang lebih besar bisa juga tag: `git tag backup/pre-v0XX-merge master`. Verifikasi: `git branch -l "backup/*"`.

### 3.2 Branch upgrade

```bash
git checkout -b upgrade/v0.5.56 master
```

Sesuaikan nomor versi dengan tag upstream yang akan di-merge.

### 3.3 Trial merge (tanpa auto-commit)

```bash
git merge --no-commit --no-ff v0.5.56
```

atau merge branch upstream langsung: `git merge --no-commit --no-ff upstream/master`. Memakai **tag** lebih tepat daripada branch karena hasilnya tercatat eksplisit di pesan merge (preseden: `Merge tag v0.5.55 from decolua/9router`).

Output yang mungkin:

- `Automatic merge went well; stopped before committing as requested` — tidak ada konflik; lanjut ke [bagian 5](#5-verifikasi-sebelum-merge-ke-master).
- `CONFLICT (content): Merge conflict in <file>` — lanjut ke [bagian 4](#4-kebijakan-resolusi-konflik).

### 3.4 Daftar konflik

```bash
git status --short | grep -E "^(UU|AA|DD|DU|UD|AU|UA)"
git diff --name-only --diff-filter=U
```

Kode status: `UU` = dua sisi mengubah file yang sama; `DU`/`UD` = satu sisi menghapus, sisi lain mengubah (kasus `opencode-go.js` di v0.5.55, lihat [bagian 6](#6-studi-kasus-merge-v0555)).

### 3.5 Abort (jalan keluar bersih)

Kalau konflik terlalu banyak atau butuh analisis dulu:

```bash
git merge --abort
git status --short --branch   # harus bersih kembali
```

`--abort` mengembalikan working tree persis ke kondisi sebelum merge — aman dilakukan kapan pun sebelum `git commit`. Branch upgrade dan backup tetap ada; hapus branch upgrade kalau mau mengulang dari nol: `git branch -D upgrade/v0.5.56`.

## 4. Kebijakan Resolusi Konflik

Urutan keputusan untuk setiap file konflik, berdasarkan bukti isi file — bukan asumsi:

1. **Cek `FORK-CHANGES.md` dulu.** Instruksi kanoniknya: kalau file yang konflik berasal dari PR fork yang sudah di-merge upstream dalam bentuk berbeda, buang versi fork (`git checkout --theirs -- <file>`) dan hapus barisnya dari tabel.
2. **Di luar fitur khas fork → prioritaskan upstream.** File upstream murni (executor, translator, registry, dsb.) diselesaikan dengan versi upstream (`--theirs`), supaya delta fork tetap kecil dan merge berikutnya murah.
3. **File milik fitur fork yang dilindungi (quota sharing, check-usage, invalid providers, CI GHCR-only) → pertahankan perilaku fork.** Jangan `checkout --theirs` membabi buta; selesaikan secara manual, gabungkan perubahan upstream tanpa mematikan fitur fork. Daftar file/fitur ada di handbook bagian 2.5.
4. **Konflik campuran (fitur fork menyentuh file upstream) → resolusi manual.** Baca kedua sisi (`git diff --ours`, `git diff --theirs`, atau marker `<<<<<<<` di file), gabungkan dengan mempertahankan perilaku fork di atas kode upstream baru.
5. **Setelah setiap resolusi:** `git add <file>`, lalu lanjutkan sampai `git status` bersih dari konflik, baru `git commit`.
6. **Catat keputusan di `FORK-CHANGES.md`** (file, keputusan, alasan, commit hash) supaya konflik berulang cepat diselesaikan.

Referensi cepat `--ours`/`--theirs` saat merge:

| Perintah | Arti |
|---|---|
| `git checkout --ours -- <file>` | Ambil versi fork (branch tempat Anda berada) |
| `git checkout --theirs -- <file>` | Ambil versi upstream (yang sedang di-merge) |
| `git diff --ours -- <file>` / `git diff --theirs -- <file>` | Lihat sisi masing-masing sebelum memutuskan |
| `git log --oneline --merge -- <file>` | Commit dari kedua sisi yang menyentuh file ini (hanya saat merge berjalan / MERGE_HEAD tersedia) |

**Mengapa trial merge, bukan tebakan:** hanya trial merge yang menunjukkan konflik *yang benar-benar terjadi* pada kombinasi commit saat ini. Membaca diff upstream secara terpisah tidak bisa memprediksi interaksi dengan perubahan fork; marker konflik dan daftar `--diff-filter=U` adalah bukti konkret yang bisa diverifikasi, ditautkan di commit message, dan dipelajari ulang nanti. Studi kasus di [bagian 6](#6-studi-kasus-merge-v0555) menunjukkan ketiga konflik v0.5.55 tidak bisa diputuskan secara benar tanpa melihat isi file hasil trial merge.

## 5. Verifikasi Sebelum Merge ke Master

Jalankan di branch upgrade, setelah semua konflik terselesaikan dan ter-commit:

```bash
# test tertarget untuk area yang tersentuh merge (contoh)
npm --prefix tests -- test unit/qoder.test.js
npm --prefix tests -- test unit/qoder-billing.test.js

# suite penuh
npm --prefix tests test

# build produksi
npm run build
```

Kriteria lulus (dari pelajaran lintas-sesi di handbook):

- **Nol regresi terhadap baseline** 88 gagal / 1810 lulus — jumlah gagal tidak bertambah, tidak ada test yang tadinya lulus ikut gagal. Tulis hasil apa adanya; jangan pernah klaim "semua test lulus".
- `npm run build` selesai tanpa `Failed to compile`.
- Kalau merge mengubah translator/executor dan snapshot provider ikut berubah: regenerate dan commit snapshot sebagai commit terpisah `test(baseline): ...` (preseden: `540ebbe68` untuk transports opencode-go, `450b7d0fa` untuk penyesuaian cache re-anchor v0.5.55).

Setelah hijau, baru gabungkan ke master dan push:

```bash
git checkout master
git merge --no-ff upgrade/v0.5.56
git push origin master
```

Rilis mengikuti konvensi tag handbook: `git tag -a v0.5.56-fork21 -m "..." && git push origin v0.5.56-fork21` (nomor fork melanjutkan, tidak di-reset). Backup branch boleh dipertahankan; ia adalah bukti titik pemulihan.

## 6. Studi Kasus: Merge v0.5.55

Fakta dari `git log`: backup branch `backup/pre-v055-merge` dibuat lebih dulu; merge dilakukan sebagai `1e567a17e Merge tag v0.5.55 from decolua/9router`; pesan merge mencatat keputusan eksplisit:

> Accept upstream for all conflicts (opencode-go executor removed per upstream refactor, qoder billing-block wrapQoderSSE, gemini usageMetadata envelope). Fork-only features (quota sharing, invalid providers) retained. Adds GHSA-pjm4-8fpg-f9p6 auth-bypass fix.

Tiga file konflik dan keputusannya:

| File | Sifat konflik | Keputusan | Alasan berbasis bukti |
|---|---|---|---|
| `open-sse/executors/opencode-go.js` | Upstream **menghapus** file ini (refactor: routing opencode-go pindah ke transports, `e1115e283`); sisi fork masih memodifikasinya | **Terima penghapusan upstream** | Diff upstream menunjukkan logika executor dialihkan ke `open-sse/providers/registry/opencode-go.js` + transports; mempertahankan file lama berarti kode mati yang divergen dari arah upstream |
| `open-sse/executors/qoder.js` | Kedua sisi mengubah executor Qoder; upstream menambah wrapper `wrapQoderSSE` untuk billing-block | **Terima versi upstream** (`--theirs`) | Qoder bukan fitur khas fork; wrapper upstream adalah perbaikan perilaku billing. Terverifikasi pasca-merge: `wrapQoderSSE` ada di `open-sse/executors/qoder.js` dan dicakup test `tests/unit/qoder-billing.test.js` |
| `open-sse/services/usage/google.js` | Kedua sisi menyentuh ekstraksi usage Gemini; upstream memindahkan pembacaan `usageMetadata` ke envelope antigravity (`59d858b63`) | **Terima versi upstream** (`--theirs`) | Bug nyata: antigravity/gemini-cli membungkus payload dalam `{ response: {...} }`, sehingga `extractUsageFromResponse` yang hanya membaca top-level mencatat `IN 0 \| OUT 0`. Fix upstream menyelesaikan root cause; versi fork tidak menambah perilaku apa pun di file ini |

Fitur fork (quota sharing, invalid providers) tidak ikut konflik dan tetap utuh setelah merge — sesuai kebijakan prioritas. Merge ini juga membawa masuk security fix **GHSA-pjm4-8fpg-f9p6** (`92259214d`): `x-9r-real-ip`/Host fallback dulunya dipercaya dari header client, sehingga caller remote bisa menyamar sebagai lokal; fix menggerbangi kepercayaan itu via `x-9r-peer-token` per-proses di `custom-server.js` + `src/lib/auth/trustedPeer.js`, fail-closed di produksi.

**Pelajaran yang diambil fork (handbook bagian 3.3–3.4):** keputusan ketiga file di atas mustahil dibuat benar dari membaca changelog saja — misalnya, "upstream menghapus file" baru terlihat sebagai status `DU` saat trial merge, dan keputusan menerima penghapusan baru aman setelah diff membuktikan logikanya pindah ke registry/transports. Karena itu prosedur baku fork adalah trial merge di branch + backup, bukan menebak dampak konflik.

## 7. Troubleshooting

| Gejala | Penyebab umum | Tindakan |
|---|---|---|
| `git merge --abort` error `MERGE_HEAD missing` | Tidak ada merge yang sedang berjalan | Aman — tree sudah bersih; cek `git status` |
| Konflik muncul lagi di file yang sama setiap merge | PR fork sudah diambil upstream dalam bentuk lain | Ikuti instruksi `FORK-CHANGES.md`: `checkout --theirs`, hapus baris dari tabel |
| Merge membawa PR yang ada di daftar "Hindari" (mis. kasus yang direvert di `9ed5be64`) | Upstream mengadopsi PR bermasalah | Setelah merge selesai, revert commit itu (preseden: `9ed5be64`) dan catat di `FORK-CHANGES.md` |
| Snapshot test provider gagal setelah merge translator | Snapshot generated memang harus berubah | Regenerate dan commit terpisah `test(baseline): ...` (preseden: `540ebbe68`) |
| Jumlah test gagal naik di atas baseline 88 | Regresi nyata dari resolusi konflik | Jangan merge ke master; identifikasi resolusi yang salah dari commit merge itu sendiri: `git log --oneline --cc -- <file>` untuk menemukan merge yang menyentuh file, lalu `git diff <merge-sha>^1 <merge-sha> -- <file>` untuk melihat perubahan yang diterapkan resolusi terhadap sisi fork. Perbaiki resolusinya (checkout ulang versi yang benar + edit manual), commit koreksi di branch upgrade, dan ulangi verifikasi. Catatan: `git log --merge` **tidak bisa** dipakai di sini karena merge sudah ter-commit (MERGE_HEAD sudah tidak ada) — `--merge` hanya bermakna saat merge masih berjalan |
| Lupa branch upgrade dan terlanjur merge di `master` | Prosedur tidak diikuti | Selama belum di-push: `git reset --hard origin/master`, lalu ulangi dari [bagian 3](#3-trial-merge-yang-aman) dengan benar. Kalau sudah di-push: koordinasi — jangan force-push `master` tanpa keputusan eksplisit |
