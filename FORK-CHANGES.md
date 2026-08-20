# Fork changes — afandiaziz/9router

Catatan PR upstream yang di-cherry-pick ke fork ini. Basis: **v0.5.50** (`03f8487c`, upstream push terakhir 2026-08-05). Semua PR di bawah masih **open** di `decolua/9router` — upstream tidak me-merge satu PR pun sejak tanggal itu.

Terakhir diperbarui: 2026-08-10.

## Cara memakai file ini

Saat `git merge upstream/master` menimbulkan konflik, cek tabel di bawah: kalau file yang konflik berasal dari PR yang sudah di-merge upstream dalam bentuk berbeda, buang versi fork (`git checkout --theirs`) dan hapus barisnya dari tabel.

---

## TIER 1 — Security & Usage (✅ DEPLOYED - Master)

Merge commit: `dbe4d159` · tag: `v0.5.50-fork1` · image: `ghcr.io/afandiaziz/9router:latest`

| # | Commit | Isi | Dampak Produksi |
|---|--------|-----|----------------|
| [#3078](https://github.com/decolua/9router/pull/3078) | `decbc960` | `/api/pxpipe` → `LOCAL_ONLY_PATHS` (defense in depth) | ✅ Local-only endpoint protection |
| [#3085](https://github.com/decolua/9router/pull/3085) | `50e6ed30` | tegakkan `requireApiKey` pada `GET /v1/models` | ✅ Auth enforcement di models |
| [#3063](https://github.com/decolua/9router/pull/3063) | `7eba0ea3` | SSRF guard `resolveBaseUrl`; blokir login remote password default; deklarasi `chalk`+`prop-types` | ✅ Hardening security |
| [#3081](https://github.com/decolua/9router/pull/3081) | `9f810f65` | `stream_options.include_usage` untuk upstream OpenAI-compatible | ✅ Token usage tracking aktif |
| [#3083](https://github.com/decolua/9router/pull/3083) | `482c558f` | baca `cached_tokens` dari `prompt_tokens_details` bersarang | ✅ Akurasi token billing diperbaiki |

**Verifikasi produksi**: `/api/pxpipe/status` berubah 401 → 403 setelah deploy (gate `LOCAL_ONLY_PATHS` aktif). Test: 88 gagal / 1677 lulus — **nol regresi** vs baseline v0.5.50 (88 gagal / 1656 lulus).

---

## TIER 2 — Performance, Token, Provider, Security (📋 STAGED - Branch tier2)

**Status**: Belum di-merge ke master, tersedia di branch `tier2`. Bisa di-merge kapan pun sesuai kebutuhan.

Test suite: 88 gagal / 1783 lulus — **nol regresi**.

### P1 — Skala Besar (5 PRs) ⭐ Prioritas tinggi untuk instance dengan 2795+ koneksi

| # | Isi | Dampak |
|---|-----|--------|
| [#2798](https://github.com/decolua/9router/pull/2798) | timeout relay test proxy-pool → 30s | Timeout lebih stabil untuk proxy pool |
| [#410](https://github.com/decolua/9router/pull/410) | lewati model combo yang kuotanya habis, lintas request | Rotasi otomatis saat quota habis |
| [#2879](https://github.com/decolua/9router/pull/2879) | kunci akun sampai rate-limit reset sebenarnya | Hindari spam saat rate-limited |
| [#879](https://github.com/decolua/9router/pull/879) | parse `retryAfter` untuk backoff presisi saat 429 | Backoff lebih akurat berdasarkan header |
| [#2997](https://github.com/decolua/9router/pull/2997) | undici connection pooling, cegah connection exhaustion | Pooling connection yang lebih efisien |

### P2 — Akurasi Token & Cost Tracking (6 PRs) ⭐ Penting untuk billing accuracy

| # | Isi | Dampak |
|---|-----|--------|
| [#2422](https://github.com/decolua/9router/pull/2422) | grup usage per API key tetap terpisah | Statistic per key lebih akurat |
| [#2658](https://github.com/decolua/9router/pull/2658) | cache token Claude masuk total prompt | Cache handling lebih efisien |
| **#2762** | reasoning token berhenti dibilling dua kali | ⭐ **Hemat cost!** Tidak double-billing |
| [#2453](https://github.com/decolua/9router/pull/2453) | pertahankan exact cost non-negatif dari provider | Biaya tidak jadi minus |
| [#2668](https://github.com/decolua/9router/pull/2668) | data usage ikut dalam backup DB | Recovery lebih lengkap |
| [#2361](https://github.com/decolua/9router/pull/2361) | periode analitik 90d / 180d / 365d / all-time | Time-range fleksibel |

### P3 — Provider & Combo Integration (15 PRs) ⭐ Relevan untuk grok-cli 2123 akun Anda

| # | Isi | Dampak |
|---|-----|--------|
| [#2526](https://github.com/decolua/9router/pull/2526) | combo: sembunyikan koneksi provider nonaktif | UI lebih bersih |
| [#3125](https://github.com/decolua/9router/pull/3125) | combo: resolve nama ber-prefix provider ke model anggota | Model resolution lebih pintar |
| [#1434](https://github.com/decolua/9router/pull/1434) | combo: cegah circular dependency | Stability improvements |
| [#2689](https://github.com/decolua/9router/pull/2689) | combo: retry-before-fallback saat 200 kosong | Retry logic lebih baik |
| **#2439** | xai: model Grok terkini + bare routing | ⭐ **Untuk grok-cli integration** |
| **#2724** | grok: tampilkan usage request harian | Dashboard grok usage info |
| **#2647** | grok-cli: lengkapi residual Responses codec | ✓ Codec lengkap untuk grok-cli |
| [#1805](https://github.com/decolua/9router/pull/1805) | qoder: teruskan status error upstream via HTTP status | Error propagation lebih baik |
| [#2909](https://github.com/decolua/9router/pull/2909) | qoder: tampilkan quota organisasi saat total nol | Quota visibility lebih baik |
| [#2853](https://github.com/decolua/9router/pull/2853) | codex: pertahankan durasi quota window | Window duration terjaga |
| [#2508](https://github.com/decolua/9router/pull/2508) | codex: inject token saver prompt sebagai instructions | Token optimization |
| [#2928](https://github.com/decolua/9router/pull/2928) | codex: buang tool output yatim | Clean tool handling |
| [#2345](https://github.com/decolua/9router/pull/2345) | codex: normalisasi expiry reset credit | Credit reset lebih konsisten |
| [#2112](https://github.com/decolua/9router/pull/2112) | openai-compatible: default `text.format` untuk responses provider | Format text standar |
| [#2786](https://github.com/decolua/9router/pull/2786) | `/v1/models`: resolusi model OpenCode + OpenAI-compatible | Model discovery lengkap |

### P4 — Security Enhancements (2 PRs)

| # | Isi | Status |
|---|-----|--------|
| [#1666](https://github.com/decolua/9router/pull/1666) | mask request debug log | ✅ Sudah ada di production |
| **#2776** | enkripsi secret koneksi provider at-rest (AES-256-GCM) | ✅ **AKTIF** — semua 348 API keys terenkripsi |

---

## TIER 3 — UI/UX, Observability, Bulk Actions (✅ DEPLOYED - Master)

Merge commit: `795c6d59` · 7 PRs. Test: 88 gagal / 1810 lulus — **nol regresi**.

| # | Commit | Isi | Dampak Langsung |
|---|--------|-----|-----------------|
| **#3051** | `ddf0969db` | stream kosong dicatat `error` (bukan `success`) + error frame in-band ke klien | ✅ **LIVE** — sudah menangkap 2+ empty streams! |
| [#3163](https://github.com/decolua/9router/pull/3163) | `8dece3c` | chart usage per jam mengikuti timezone browser (param `tz`) | Chart sesuai local time user |
| [#3068](https://github.com/decolua/9router/pull/3068) | `d8b5ffabe` | bug React reconciliation saat ganti viewMode; sort di-reset | Sortable table tidak crash |
| **#2972** | `8908cfbe6` | default view mode `tokens` instead of `costs` | ⚠️ Resolusi manual konflik dengan #3068 |
| [#2811](https://github.com/decolua/9router/pull/2811) | `8cb480e03` | `cachedInputTokens` commandcode masuk statistik | Lebih detail breakdown |
| **#2777** | `6011d45f5` | bulk enable/disable koneksi provider | ✅ **PRAKTIS** — 2795+ koneksi bisa manage sekaligus |
| **#2998** | `d51733de9` | paginasi daftar koneksi provider (10/halaman) | Performa load lebih cepat |

### Kenapa #3051 Sangat Penting

Deskripsi PR menyebut kasus produksi 2026-08-05: akun Claude dengan OAuth kedaluwarsa tetap `isActive`, request dirutekan ke sana, klien menerima **HTTP 200 dengan 0 byte**, dan observability mencatatnya `success`. Ini konsisten dengan anomali di instance ini — **24.762 request historis, SEMUA berstatus `ok`, NOL error**. Kegagalan model ini memang tak pernah tercatat sebelumnya.

Setelah deploy #3051, kita mulai melihat error records! Jadi jangan kaget kalau dashboard mulai menampilkan error setelah deploy. Itu bukan regresi; itu kegagalan yang selama ini tidak terlihat sekarang终于 tercatat.

---

## QUOTA SHARING (FEATURE BARU MILIK FORK) — ✅ DEPLOYED (forks 8–12)

**Fitur buatan sendiri** — tidak berasal dari PR upstream mana pun. Terinspirasi fitur Quota Sharing di OmnIRoute. Dibangun di atas master dan di-deploy bertahap dari `v0.5.50-fork8` sampai `v0.5.50-fork12`.

**Konsep:** buat API key khusus (`sk-danton-*`) yang bisa dibagikan ke pihak lain, dengan pembatasan model yang boleh dipakai + batas token. Key ini terpisah dari API key utama admin.

| Fitur | Keterangan |
|-------|-----------|
| **Separate quota keys** | Prefix `sk-danton-`, 24 hex char acak setelah prefix. Bisa di-buat, di-edit, di-rotate, diaktifkan/nonaktifkan, dihapus. |
| **Restriction model** | Tiap key punya daftar `allowedModels`. `[]` = semua model boleh. |
| **Model alias** | Setiap model yang diizinkan bisa diberi alias. Quota user memakai nama alias (mis. `composer-2.5`); tanpa alias pakai nama model asli. |
| **Total token limit** | `limit` + `limitPeriod` (daily/weekly/monthly/lifetime). Usage dihitung per window; kalau lewat → 429 `quota_exceeded`. |
| **Public check-usage** | Halaman `https://9router.afandiaziz.my.id/check-usage` — siapa saja bisa cek sisa kuota + pemakaian lewat input key (tanpa login). |
| **/v1/models tersaring** | Request `GET /v1/models` pakai quota key hanya menampilkan model yang diizinkan (id = alias bila ada). |
| **Accounting terpisah** | Usage quota tercatat di tabel `quotaUsage` (per key per window), terpisah dari usage API key utama. |

### Implementasi (16 komit, 23 file baru)

| Fork | Komit | Isi |
|------|-------|-----|
| **fork8** | `b9e788639` | docs(spec): quota sharing design |
| | `96c4877cc` | docs(plan): quota sharing implementation plan |
| | `1ff511e04` | feat(db): skema v2 — tabel `quotaKeys` + `quotaUsage`, fix SQL keyword `limit` |
| | `f32fe1b7e` | feat(db): quota window helper (daily/weekly/monthly/lifetime) |
| | `639a38c3d` | feat(db): quota keys repo (CRUD, progress, increment usage) |
| | `78e9ef0bb` | feat(chat): enforce quota key + resolve alias di `handleChat` |
| | `f72a5abe6` | feat(usage): increment kuota saat `sk-danton-*` dipakai |
| | `2053f01f4` | feat(public): page `/check-usage` + API `/api/public/check-usage` |
| | `3df4b09e8` | feat(api): CRUD `/api/quota-keys` + `/available-models` |
| | `5a27e0904` | feat(ui): halaman dashboard quota-sharing |
| | `f1fe6817c` | feat(models): `/v1/models` tersaring untuk quota key |
| **fork9** | `d85a33ae6` | feat(quota): polish UX — prefix diubah `qsk-` → `sk-danton-`, chip model + copy, defensive guard |
| **fork10** | `8fb149a3d` | fix(quota): quota key bisa dipakai saat `requireApiKey=true` (validasi `isValidApiKey`) + polish |
| **fork11** | `3fc23b245` | fix(quota): bug routing alias + format `keyPrefix` (`sk-danton-xxxx…`) + `baseUrl` proxy-aware |
| **fork12** | `061f0e5e4` | fix(quota): `modelStr` `const` → `let` — alias gagal karena `TypeError: Assignment to constant variable` (HTTP 500) |

### Timeline Deploy & CI

| Fork | Tag | CI Run | Keterangan |
|------|-----|--------|-----------|
| 8 | `v0.5.50-fork8` | — | Fitur lengkap pertama |
| 9 | `v0.5.50-fork9` | — | Polish UX + rename prefix |
| 10 | `v0.5.50-fork10` | — | Fix dukungan `requireApiKey` |
| 11 | `v0.5.50-fork11` | 31403074365 | Fix routing alias + keyPrefix + baseUrl |
| 12 | `v0.5.50-fork12` | 31404005621 | Fix `modelStr` const→let (alias beneran jalan) |

### Bug #1 (fork11): keyPrefix format

Kueri `keyPrefix` awalnya `sk-dant` (8 karakter slice). Diminta format `sk-danton-xxxx…` — prefix + **4 karakter awal setelah prefix** + titik-titik. Diperbaiki di fork11 (3 file: `check-usage`, `quota-keys`, `quota-keys/[id]`).

### Bug #2 (fork11): baseUrl salah di /check-usage

`new URL(request.url).origin` memberi `http://localhost`. Diperbaiki memakai header `x-forwarded-proto` / `x-forwarded-host` (proxy-aware; nginx + custom-server mempertahankan Host).

### Bug #3 (fork12): alias routing 500 — root cause

Request alias (`composer-2.5`) balas **HTTP 500 `TypeError: Assignment to constant variable`** di semua request `sk-danton-*`. Di `src/sse/handlers/chat.js`, `modelStr` dideklarasikan `const` di bawah `enforceQuotaKey`, lalu kode fix reassign `modelStr = result.resolvedModel` — **assign ke `const` = crash**.

```javascript
// ❌ fork11 (500 on every quota-key request)
const modelStr = body.model;
...
modelStr = result.resolvedModel;   // TypeError: Assignment to constant variable

// ✅ fork12
let modelStr = body.model;
...
modelStr = result.resolvedModel;   // works
```

**Verifikasi produksi (fork12):**

| Request model | Hasil |
|---------------|-------|
| `composer-2.5` (alias → `gcli/grok-composer-2.5`) | ✅ 200 chat completion |
| `composer-2.5-fast` (alias) | ✅ 200 |
| `gcli/grok-4.5` (tanpa alias) | ✅ 200 |
| `grok-3` (tidak di allowlist) | ✅ 403 "Model not allowed for this quota key" |

### Catatan

- Prefix quota key: **`sk-danton-`** (di fork9 dari `qsk-`) — dikunci agar konsisten dengan nama instance (`9router`).
- SQL reserved keyword `limit` di-quote (`"limit"`) — fix di `buildCreateTableSql` + repo.
- Test unit quota: 49 lulus (`tests/unit/quota-*.test.js`), nol regresi terhadap baseline.
- Semua fitur tersaring hanya untuk key `sk-danton-*`; API key utama & mode lokal tidak terpengaruh.

---

## RILIS v0.5.55-fork21 s/d fork25 — ✅ DEPLOYED (Master)

Basis: v0.5.55 (setelah merge upstream fork20). Semua fitur fork sendiri kecuali fork25 (batch PR upstream).

### fork21 — Redesign brutalist `/check-usage` (gaya mocasus)

Reskin halaman publik `/check-usage` ke desain neo-brutalist (referensi `mocasus.my.id`). Terisolasi penuh, tidak menyentuh dashboard.

| Aspek | Keterangan |
|-------|-----------|
| CSS scoped | File baru `src/app/check-usage/brutal.css`, semua rule di bawah `.brutal-scope` — nol kebocoran ke dashboard (dark theme tak terpengaruh). |
| Visual | Background cream, border hitam `2px`, offset shadow `4px 4px 0 #000`, primary pink, aksen kuning, font Space Grotesk / Plus Jakarta Sans. Selalu light. |
| Animasi | float (hero), reveal-up (kartu), pulse-soft, spin (refresh), tilt-shake (hover), click-spark (pink particle saat klik). Semua dijaga `prefers-reduced-motion`. |
| Kontrak | Logika React + `POST /api/public/check-usage` tidak berubah 1:1. Guest tetap hanya menerima `keyPrefix` bertopeng. |

Merge `a68b9180e`. Verifikasi: eslint 0, render HTTP 200, final review PASS.

### fork22 — Fix "Usage by Model" menampilkan alias (root cause: prefix mismatch)

**Gejala:** section "Usage by Model" menampilkan nama model asli (`grok-composer-2.5`), bukan alias (`danton/composer-2.5`), padahal alias sudah di-set.

**Root cause (dikonfirmasi dari DB produksi):** `buildUsageReport` (`src/lib/db/repos/quotaUsageReport.js`) mencocokkan `allowedModels.find(e => e.model === m.model)` secara exact. Tapi:
- `usageHistory.model` mencatat model **tanpa prefix** provider → `grok-composer-2.5`
- `allowedModels[].model` menyimpan **berprefix** → `gcli/grok-composer-2.5`
- exact match gagal → `entry` undefined → alias jatuh ke nama model.

Test lama tak menangkapnya karena memakai string berprefix di kedua sisi.

**Fix:** exact match dulu, lalu **slash-boundary suffix match** (`allowed.endsWith("/"+logged)` / sebaliknya). Batasan `/` menjaga presisi: `grok-4.5` tidak cocok `grok-4.5-high`, `4.5` tidak cocok `grok-4.5`; menangani prefix multi-segmen (`vertex/google/gemini-2.5-pro`). Test: `tests/unit/quota-usage-report.test.js` (3 kasus baru). Commit `26852a90`.

### fork23 — Quota copy-key dashboard + polish `/check-usage`

| Area | Perubahan |
|------|-----------|
| Dashboard Quota Sharing | `GET /api/quota-keys` (auth-only) kini kirim key penuh; kartu menampilkan key penuh (tak bertopeng) + tombol **Copy** per kartu. Guest `/check-usage` tetap masked (tidak disentuh). |
| `/check-usage` header | Emphasis swap: `name` jadi primary (pink bold), `keyPrefix` jadi muted/mono. |
| Warna | `tokensUsed`/`limit` + `resetsAt` dari muted → foreground (terbaca); 4 stat card dari pastel `0.2` → `0.55` (lebih nyala). |
| Chip | Allowed-model chip diperbesar `0.75rem` → `0.9rem` + animasi copy-pop (rubber-band scale) saat klik-copy. |
| Progress bar | Ganti `animate-pulse-soft` (opacity) → **fill-grow** (0→target via `barWidth` state + transition) + **shimmer** diagonal (`::after`). |
| Cookie | `qsk` (path `/check-usage`, SameSite=Strict, expiry = `resetsAt` else +30 hari). Auto-fill + auto-load saat kunjungan berikutnya; bersih saat key stale / "Check Another Key". |

Ditambah simplify tampilan Usage-by-Model (inline via GitHub: buang sub-label `(model)`, tokens mono).

### fork24 — Refactor payload report

`perModel` entry jadi `{model: <alias-resolved>, tokens}` (field `alias` dilebur ke `model`); `allowedModels` di report jadi display-only `{model: <alias-or-name>}`. Frontend tetap jalan karena baca `m.alias || m.model` (fallback ke `m.model`). Test disesuaikan. Commit `f61efcc7`.

### fork25 — Batch 16 PR upstream (zero-conflict)

Diambil dari 50 PR terbaru `decolua/9router`, diprioritaskan yang nol/minim konflik. Diverifikasi lewat **stacked trial-merge** (bukan hanya per-PR vs master) + test tiap PR (84 pass / 0 fail) + baseline (OAuth byte-identik; providers `+4` additive).

**16 PR:** #3411 (gemini schema 400), #3370 (SSRF IPv6 🔒), #3369 (tool-result id), #3368 (CLI heap), #3393 (dashboard crash <8 char), #3366 (antigravity empty parts), #3395 (antigravity image aspect ratio), #3382 (Gemini 3.7 Flash defaultModels), #3359 (Hermes prompt sanitization), #3408 (commandcode thinking suffix), #3357 (codebuddy-intl system prompt), #3379 (Cline OAuth), #3380 (OIDC SSO), #3381 (credential store owner-only 🔒), #3396 (provider Reasonix/OVH/JoyCode/OpenModel), #3338 (rtk lang detect).

Merge `bbac8f4f`; regen baseline `e060e49e` (`providers-baseline.json` + `alias-baseline.json` untuk 4 provider baru).

**Di-defer** (bukan zero-conflict saat diuji nyata, untuk batch berikutnya):
- **#3363 (Nous Research)** — konflik saat di-stack dengan #3396 di `registry/index.js` (auto-generated; selesaikan via regen).
- **#3333 (DeepSeek tool dedup)** — merge git bersih, tapi 3 test-nya gagal karena butuh #3332/#3278 (strip suffix `(max)`) yang tidak ikut. Bundel dengan #3332/#3347.

---

## PERUBAHAN MILIK FORK (Bukan dari Upstream)


### Commit Custom #1: CI Configuration

| Commit | Isi | Dampak |
|--------|-----|--------|
| `2cdf0143` | CI: publish hanya ke GHCR (fork tak punya secret Docker Hub), amd64 saja, tag `latest` tanpa syarat | Build workflow sederhana, hanya ke GitHub Container Registry |

---

### Commit Custom #2: Revert Broken PR #664

| Commit | Isi | Dampak |
|--------|-----|--------|
| `9ed5be64` | Revert PR #664 | ⚠️ CRITICAL FIX — Prevented breaking #3081 functionality |

**Kenapa #664 merusak:**  
PR #664 menambahkan kedua `transformRequest` method di `open-sse/executors/default.js`:
- Method pertama (~line 70): full logic (stream_options, text.format, injectReasoningContent, stripUnsupportedParams, dropClientMetadata)
- Method kedua (~line 385): override silent tanpa implementasi lengkap

Di JavaScript, definisi kedua menimpa yang pertama secara diam-diam — sehingga seluruh logika penting mati! Efek paling serius: **PR #3081 (stream_options.include_usage) dimatikan**!

**Deteksi**: 3 test failure (`default-executor-stream-usage`, `openai-compat-responses-text-format`, `reasoningContentInjector`)

**Kontribusi #664** (`max_tokens` → `max_completion_tokens`) sudah dicakup oleh [#2134](https://github.com/decolua/9router/pull/2134) tanpa efek samping.

**Kesimpulan**: Jangan ambil #664 lagi. Kalau upstream merge, laporkan bug ini.

---

### Commit Custom #3: Template Literal Bug Fix (#2998 Regression)

| Commit | Isi | Root Cause |
|--------|-----|------------|
| `4daadad6` | fix(providers): restore connection list broken by unevaluated template literal | Quote ganda vs backtick |

**Masalah:** String literal di [`src/app/(dashboard)/dashboard/providers/[id]/page.js`](src/app/(dashboard)/dashboard/providers/[id]/page.js:299):

```javascript
// ❌ BEFORE (broken by #2998 original)
fetch("/api/providers?provider=${encodeURIComponent(providerId)}")  // quotes!

// ✅ AFTER (fixed)
fetch(`/api/providers?provider=${encodeURIComponent(providerId)}`)  // backtick!
```

**Impact:** URL tidak dievaluasi → request terkirim sebagai `?provider=%24%7BencodeURIComponent(providerId)%7D` → SQL WHERE tidak match → return `{connections:[]}`

**Data intact?** Ya! Database utuh sepanjang insiden. Hanya UI yang show "no connections".

**Verification:** Guard struktural ditambahkan ke test suite — akan fail jika bug kembali.

---

### Commit Custom #4: Server-side Filter Removal (Production Recovery)

| Commit | Isi | Root Cause |
|--------|-----|------------|
| `08e394c3` | fix(providers): remove server-side filter to restore compatibility | Auth mismatch on session cookies |

**Problem introduced by #2998:**  
Server-side filtering di `/api/providers/route.js`:

```javascript
const provider = searchParams.get("provider");
const connections = await getProviderConnections(provider ? { provider } : {});
```

Ketika dashboard auth menggunakan session cookie (bukan API key), server filter mengembalikan `{connections:[]}` bukan error. Client-side page menerima "success" tapi array kosong.

**Root cause:** Dashboard authenticated via session, API filter expect API key auth. Mismatch!

**Solution:** Return ALL connections from API, client-side component filter per provider ID. Sama seperti working fork2 behavior.

**Deployed:** `v0.5.50-fork6` via manual build, production live dengan 3594 connections visible kembali.

---

### Commit Custom #5: Documentation

| Commit | Isi |
|--------|-----|
| `17fbf76d` | docs: catat insiden fork3 dan perbaikannya di fork4 |
| `4abba4310` | docs: update FORK-CHANGES.md with tier6 recovery notes |

Full changelog maintenance dan post-mortem documentation.

---

## Timeline Insiden & Recovery

### Phase 1: Initial Setup (Aug 5-9)
- v0.5.50 base established
- Tier 1-3 merged successfully
- All features working normally

### Phase 2: First Regression (fork3)
- **Tag**: `v0.5.50-fork3`
- **Symptom**: Provider credentials "lost" in dashboard
- **Actual**: Database intact (3502 connections), but UI showed empty
- **Root Cause**: #2998 template literal bug (double quotes)

### Phase 3: Second Regression (fork4/fork5)
- **Tags**: `v0.5.50-fork4`, `v0.5.50-fork5`
- **Symptom**: Same issue - empty provider list
- **Root Cause**: Server-side filter incompatible with session auth
- **Data**: Still intact, just not displayed

### Phase 4: Final Fix (fork6)
- **Tag**: `v0.5.50-fork6`
- **Deploy**: Manual build + tarball import
- **Result**: ✅ All 3594 connections restored
- **Status**: Production stable

### Phase 5: Automation Enabled (fork7)
- **Tag**: `v0.5.50-fork7`
- **Trigger**: GitHub Actions auto-build initiated
- **Action ID**: 31379534027
- **URL**: https://github.com/afandiaziz/9router/actions/runs/31379534027

---

## Ditolak Setelah Dibaca

| PR | Alasan |
|----|--------|
| [#3080](https://github.com/decolua/9router/pull/3080) | Menghapus `requireApiKey: true` dari `DEFAULT_SETTINGS` dan menggantungkannya ke env — melemahkan default security. Instance ini sudah menyimpan `requireApiKey: true` eksplisit di DB (stored menang atas default), jadi benefit minimal. |

---

## Konflik — Belum Diambil

Masing-masing CLEAN terhadap `master`, tapi bentrok dengan PR lain yang lebih dulu masuk. Butuh resolusi manual bila diinginkan.

| PR | File Konflik | Isi |
|----|--------------|-----|
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
|----|--------|
| #3120, #3159 | claytontavaresdan — 5 PR sejenis (#3157, #3153, #3150, #3146, #3144) sudah ditutup upstream tanpa merge |
| #3026 | +49391 baris, 560 file, konflik besar |
| #3048 | +14571 baris, konflik |
| #1405 | +10045 baris, Nix flake — infrastructure tidak dipakai |
| #3132 | +4777 baris, ElevenLabs TTS — feature tidak relevan |
| #2823 | +1696 baris, Zed editor integration — tidak dipakai |

---

## Prosedur Update

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
cp -a data/db data/db.bak-$(date +%F-%H%M)
docker compose pull && docker compose up -d
```

Rollback: Edit `docker-compose.yml`, ubah image ke versi sebelumnya, lalu restart.

---

## Summary Statistik Total Perubahan

### Upstream PRs: 41 PRs Merged

| Tier | Count | Status |
|------|-------|--------|
| T1 — Security | 5 | ✅ Deployed |
| T2 — Performance | 29 | 📋 Staged in branch |
| T3 — UI/Observability | 7 | ✅ Deployed |

### Custom Fork Changes: 5 Commits

| Type | Count | Purpose |
|------|-------|---------|
| CI Config | 1 | GHCR publishing |
| Regressions Fixed | 2 | Quote bug + filter removal |
| Critical Revert | 1 | PR #664 undo |
| Documentation | 1 | Changelog maintenance |

### Fitur Baru Milik Fork: Quota Sharing (16 komit, forks 8–12)

| Type | Count |
|------|-------|
| Schema + repo DB (quotaKeys/quotaUsage) | 3 |
| Enforcement + accounting (chat/api) | 4 |
| UI + API (dashboard, check-usage, models) | 7 |
| Fix bug produksi (alias routing, keyPrefix, baseUrl) | 3 |
| Docs (design + plan) | 2 |
| **Total** | **16 komit** (fork7..HEAD) · **23 file baru** (13 source + 8 test + 2 docs) |

### Production Impact

- **Active Connections**: 3594 (3558 active)
- **Encrypted Secrets**: 348 API keys @ AES-256-GCM
- **Features Live**: Empty stream detection, bulk actions, token tracking
- **Quota Sharing**: ✅ Live — key `sk-danton-*`, model alias, token limit per window, public `/check-usage`
- **Tests Passing**: 88 failed / 1810 passed (baseline maintained) + 49 quota tests lulus

---

*File updated: 2026-08-10 WITA*
*Last verified: Production running stably with all fixes applied*
*Export directory: ~/9router-export/*
