# Fork changes — afandiaziz/9router

Catatan PR upstream yang di-cherry-pick ke fork ini. Basis: **v0.5.50** (`03f8487c`, upstream push
terakhir 2026-08-05). Semua PR di bawah masih **open** di `decolua/9router` — upstream tidak me-merge
satu PR pun sejak tanggal itu.

Terakhir diperbarui: 2026-08-09.

## Cara memakai file ini

Saat `git merge upstream/master` menimbulkan konflik, cek tabel di bawah: kalau file yang konflik
berasal dari PR yang sudah di-merge upstream dalam bentuk berbeda, buang versi fork (`git checkout
--theirs`) dan hapus barisnya dari tabel.

---

## Tier 1 — security & usage (di `master`, sudah produksi)

Merge commit: `dbe4d159` · tag: `v0.5.50-fork1` · image: `ghcr.io/afandiaziz/9router:latest`

| PR | Commit | Isi |
|---|---|---|
| [#3078](https://github.com/decolua/9router/pull/3078) | `decbc960` | `/api/pxpipe` → `LOCAL_ONLY_PATHS` (defense in depth) |
| [#3085](https://github.com/decolua/9router/pull/3085) | `50e6ed30` | tegakkan `requireApiKey` pada `GET /v1/models` |
| [#3063](https://github.com/decolua/9router/pull/3063) | `7eba0ea3` `2407914` `8827471` `ba54d62` | SSRF guard `resolveBaseUrl`; blokir login remote password default; deklarasi `chalk`+`prop-types` |
| [#3081](https://github.com/decolua/9router/pull/3081) | `9f810f65` | `stream_options.include_usage` untuk upstream OpenAI-compatible |
| [#3083](https://github.com/decolua/9router/pull/3083) | `482c558f` | baca `cached_tokens` dari `prompt_tokens_details` bersarang |

Verifikasi produksi: `/api/pxpipe/status` berubah 401 → 403 setelah deploy (gate `LOCAL_ONLY_PATHS`
aktif). Test: 88 gagal / 1677 lulus — **nol regresi** vs baseline v0.5.50 (88 gagal / 1656 lulus).

## Tier 2 — performa, token, provider, keamanan (branch `tier2`, belum di `master`)

29 PR masuk. Test: 88 gagal / 1783 lulus — **nol regresi** vs baseline.

### P1 — skala 2475 koneksi

| PR | Isi |
|---|---|
| [#2798](https://github.com/decolua/9router/pull/2798) | timeout relay test proxy-pool → 30s |
| [#410](https://github.com/decolua/9router/pull/410) | lewati model combo yang kuotanya habis, lintas request |
| [#2879](https://github.com/decolua/9router/pull/2879) | kunci akun sampai rate-limit reset sebenarnya |
| [#879](https://github.com/decolua/9router/pull/879) | parse `retryAfter` untuk backoff presisi saat 429 |
| [#2997](https://github.com/decolua/9router/pull/2997) | undici connection pooling, cegah connection exhaustion |

### P2 — akurasi token & usage

| PR | Isi |
|---|---|
| [#2422](https://github.com/decolua/9router/pull/2422) | grup usage per API key tetap terpisah |
| [#2658](https://github.com/decolua/9router/pull/2658) | cache token Claude masuk total prompt |
| [#2762](https://github.com/decolua/9router/pull/2762) | reasoning token berhenti dibilling dua kali |
| [#2453](https://github.com/decolua/9router/pull/2453) | pertahankan exact cost non-negatif dari provider |
| [#2668](https://github.com/decolua/9router/pull/2668) | data usage ikut dalam backup DB |
| [#2361](https://github.com/decolua/9router/pull/2361) | periode analitik 90d / 180d / 365d / all-time |

### P3 — provider & combo yang dipakai

| PR | Isi |
|---|---|
| [#2526](https://github.com/decolua/9router/pull/2526) | combo: sembunyikan koneksi provider nonaktif |
| [#3125](https://github.com/decolua/9router/pull/3125) | combo: resolve nama ber-prefix provider ke model anggota |
| [#1434](https://github.com/decolua/9router/pull/1434) | combo: cegah circular dependency |
| [#2689](https://github.com/decolua/9router/pull/2689) | combo: retry-before-fallback saat 200 kosong |
| [#2439](https://github.com/decolua/9router/pull/2439) | xai: model Grok terkini + bare routing |
| [#2724](https://github.com/decolua/9router/pull/2724) | grok: tampilkan usage request harian |
| [#2647](https://github.com/decolua/9router/pull/2647) | grok-cli: lengkapi residual Responses codec |
| [#1805](https://github.com/decolua/9router/pull/1805) | qoder: teruskan status error upstream via HTTP status |
| [#2909](https://github.com/decolua/9router/pull/2909) | qoder: tampilkan quota organisasi saat total nol |
| [#2853](https://github.com/decolua/9router/pull/2853) | codex: pertahankan durasi quota window |
| [#2508](https://github.com/decolua/9router/pull/2508) | codex: inject token saver prompt sebagai instructions |
| [#2928](https://github.com/decolua/9router/pull/2928) | codex: buang tool output yatim |
| [#2345](https://github.com/decolua/9router/pull/2345) | codex: normalisasi expiry reset credit |
| [#2112](https://github.com/decolua/9router/pull/2112) | openai-compatible: default `text.format` untuk responses provider |
| [#2786](https://github.com/decolua/9router/pull/2786) | `/v1/models`: resolusi model OpenCode + OpenAI-compatible |

### P4 — keamanan

| PR | Isi |
|---|---|
| [#1666](https://github.com/decolua/9router/pull/1666) | mask request debug log |
| [#2776](https://github.com/decolua/9router/pull/2776) | enkripsi secret koneksi provider at-rest (AES-256-GCM) |

## Tier 3 — UI/UX usage, observability, bulk actions (di `master`)

Merge commit: `795c6d59` · 7 PR. Test: 88 gagal / 1810 lulus — **nol regresi**.

| PR | Isi |
|---|---|
| [#3051](https://github.com/decolua/9router/pull/3051) | stream kosong dicatat `error` (bukan `success`) + error frame in-band ke klien |
| [#3163](https://github.com/decolua/9router/pull/3163) | chart usage per jam mengikuti timezone browser (param `tz`) |
| [#3068](https://github.com/decolua/9router/pull/3068) | bug React reconciliation saat ganti viewMode; sort di-reset |
| [#2972](https://github.com/decolua/9router/pull/2972) | default view mode `tokens` — **resolusi manual**, konflik dengan #3068 |
| [#2811](https://github.com/decolua/9router/pull/2811) | `cachedInputTokens` commandcode masuk statistik |
| [#2777](https://github.com/decolua/9router/pull/2777) | bulk enable/disable koneksi provider |
| [#2998](https://github.com/decolua/9router/pull/2998) | paginasi daftar koneksi provider (10/halaman) |

### Kenapa #3051 penting

Deskripsi PR menyebut kasus produksi 2026-08-05: akun Claude dengan OAuth kedaluwarsa tetap
`isActive`, request dirutekan ke sana, klien menerima **HTTP 200 dengan 0 byte**, dan observability
mencatatnya `success`. Ini konsisten dengan anomali di instance ini — 24.762 request historis,
**semua** berstatus `ok`, nol error. Kegagalan model ini memang tak pernah tercatat sebelumnya.

---

## Perubahan milik fork (bukan dari upstream)

| Commit | Isi |
|---|---|
| `2cdf0143` | CI: publish hanya ke GHCR (fork tak punya secret Docker Hub), amd64 saja, tag `latest` tanpa syarat |
| `9ed5be64` | Revert PR #664 — lihat catatan di bawah |
| (di `tier3`) | `fix(test)`: guard struktural #2998 memakai path cwd-relative → gagal karena suite jalan dari `tests/`. Di-anchor ke `import.meta.url`. |
| `4daadad6` | `fix(providers)`: perbaiki template literal #2998 yang tidak dievaluasi — lihat catatan di bawah |

### Insiden fork3 — daftar koneksi kosong (BACA INI)

Tag `v0.5.50-fork3` menyebabkan **seluruh kredensial provider tampak hilang** di dashboard —
OAuth, API key, free tier, custom. Menambah koneksi baru pun tampak tidak tersimpan.

**Tidak ada data yang hilang.** 3502 baris `providerConnections` utuh sepanjang insiden, termasuk
koneksi yang ditambahkan selagi fork3 berjalan. Yang rusak hanya kuerinya.

Penyebabnya satu karakter di [#2998](https://github.com/decolua/9router/pull/2998):

```js
fetch("/api/providers?provider=${encodeURIComponent(providerId)}")   // kutip ganda!
```

Template literal di dalam kutip ganda tidak pernah dievaluasi. Request terkirim sebagai
`?provider=%24%7BencodeURIComponent(providerId)%7D`; `WHERE provider = '<string mentah itu>'`
tidak cocok dengan apa pun, jadi mengembalikan nol baris. Commit yang sama juga menghapus filter
sisi klien `filter(c => c.provider === providerId)` karena dianggap sudah ditangani server —
sehingga tidak ada jaring pengaman.

Rollback ke fork2 "memulihkan" data justru karena barisnya memang tidak pernah pergi.

Perbaikan (`4daadad6`, tag `v0.5.50-fork4`): backtick pada URL, kembalikan filter klien sebagai
defense in depth, plus dua guard struktural. Guard diuji terbalik — kutip ganda dikembalikan,
test gagal; diperbaiki, test lulus.

**Pelajaran:** test suite #2998 punya 27 test tapi tak satu pun memverifikasi URL yang benar-benar
dikirim. Guard struktural yang hanya mencocokkan nama variabel tidak menangkap kesalahan sintaks
yang tetap valid secara JavaScript.

### Kenapa PR #664 di-revert

[#664](https://github.com/decolua/9router/pull/664) menambahkan `transformRequest` **kedua** di
`open-sse/executors/default.js` (baris ~385), padahal kelas `DefaultExecutor` sudah punya
`transformRequest` di baris ~70. Di JavaScript, definisi metode kedua menimpa yang pertama secara
diam-diam — sehingga seluruh logika baris 70-88 mati: `stream_options`, `text.format`,
`injectReasoningContent`, `stripUnsupportedParams`, `dropClientMetadata`.

Efek paling serius: ia mematikan PR #3081 yang sudah dipakai di produksi.

Terdeteksi lewat 3 test yang gagal (`default-executor-stream-usage`,
`openai-compat-responses-text-format`, `reasoningContentInjector`). Kontribusi #664
(`max_tokens` → `max_completion_tokens`) sudah dicakup [#2134](https://github.com/decolua/9router/pull/2134)
tanpa efek samping.

**Jangan ambil #664 lagi.** Kalau upstream me-merge-nya, laporkan bug ini ke sana.

---

## Sudah ada di v0.5.50 — tidak perlu diambil

| PR | Bukti |
|---|---|
| [#2699](https://github.com/decolua/9router/pull/2699) | `--dns-result-order=ipv4first` sudah di `cli/cli.js:615` |
| [#1893](https://github.com/decolua/9router/pull/1893) | `x-9r-real-ip` sudah di `custom-server.js:57-60` |

## Ditolak setelah dibaca

| PR | Alasan |
|---|---|
| [#3080](https://github.com/decolua/9router/pull/3080) | menghapus `requireApiKey: true` dari `DEFAULT_SETTINGS` dan menggantungkannya ke env — melemahkan default. DB instance ini sudah menyimpan `requireApiKey: true` eksplisit (stored menang atas default), jadi tanpa manfaat. |

## Konflik — belum diambil

Masing-masing CLEAN terhadap `master`, tapi bentrok dengan PR lain yang lebih dulu masuk. Butuh
resolusi manual bila diinginkan.

| PR | File konflik | Isi |
|---|---|---|
| [#1570](https://github.com/decolua/9router/pull/1570) | `open-sse/utils/proxyFetch.js` | timeout proxy agent — bentrok dengan #2997 |
| [#2364](https://github.com/decolua/9router/pull/2364) | `src/lib/db/repos/usageRepo.js` | statistik API key terpisah — tumpang tindih dengan #2422 |
| [#2822](https://github.com/decolua/9router/pull/2822) | `open-sse/utils/requestLogger.js` | token provider berhenti ditulis ke log — bentrok dengan #1666 |
| [#2709](https://github.com/decolua/9router/pull/2709) | `open-sse/utils/requestLogger.js` | redaksi kredensial dari log — bentrok dengan #1666 |
| [#3042](https://github.com/decolua/9router/pull/3042) | `src/app/(dashboard)/dashboard/combos/page.js` | combo test runner |
| [#1819](https://github.com/decolua/9router/pull/1819) | `tests/unit/codex-reset-credits.test.js` | binding usage/quota ke akun ChatGPT — bentrok dengan #2345 |
| [#2869](https://github.com/decolua/9router/pull/2869) | `open-sse/services/combo.js` | tool-call ganda dari openai-compat |

---

## Hindari

| PR | Alasan |
|---|---|
| #3120, #3159 | claytontavaresdan — 5 PR sejenis (#3157, #3153, #3150, #3146, #3144) sudah ditutup upstream tanpa merge |
| #3026 | +49391 baris, 560 file, konflik |
| #3048 | +14571 baris, konflik |
| #1405 | +10045 baris, Nix flake — tidak dipakai |
| #3132 | +4777 baris, ElevenLabs TTS — tidak dipakai |
| #2823 | +1696 baris, Zed — tidak dipakai |

---

## Prosedur update

```bash
# 1. tarik upstream
cd ~/9router-fork
git fetch upstream
git merge upstream/master        # konflik? cek tabel di atas
git push origin master

# 2. build image (Actions → Run workflow, atau push tag)
git tag v0.5.5X-forkN && git push origin v0.5.5X-forkN

# 3. deploy — BACKUP DULU, migrasi skema DB umumnya tak bisa di-rollback
cd ~/9router
docker compose stop 9router
cp -a data/db data/db.bak-$(date +%F)
docker compose pull && docker compose up -d
```

Rollback: `cp docker-compose.yml.bak docker-compose.yml && docker compose up -d`
(image upstream `decolua/9router:latest` masih ada di disk).

## Konteks survei

Dari 653 PR open upstream: **250 CLEAN** terhadap v0.5.50, 403 konflik. Dari yang clean: 165 ≤150
baris, 144 punya test. Laporan lengkap berkategori pernah dibuat di `/tmp/full_report.txt` (tidak
persisten — regenerasi bila perlu).

## Tier 6 — production recovery (master)

Merge commit: `08e394c36` · tag: `v0.5.50-fork6`

| PR | Isi |
|---|---|
| [Server-side filter bug](https://github.com/decolua/9router/pull/#2998-followup) | Remove provider filter from `/api/providers/route.js` to restore compatibility |

**Penyebab outage:** Server-side filtering di #2998 mengembalikan `{connections:[]}` saat:
1. Request tidak punya valid session → auth guard return success dengan array kosong
2. Parameter query malformed → SQL WHERE tidak match

**Solusi:** Kembalikan ke pola fork2 — API return semua koneksi, client-side yang filter. Lebih reliable untuk dashboard yang sudah authenticated via session cookie.

Deployed: `v0.5.50-fork6` via local tarball (GitHub Actions belum aktif). Data verified intact:
- Connections: 3594 (active: 3558)
- API keys: 348 (terenkripsi: 348/348)  
- OAuth: 3246
- Disk: 96% full

---
*Updated 2026-08-10*
