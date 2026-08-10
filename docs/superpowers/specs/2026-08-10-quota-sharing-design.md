# Quota Sharing — Design Design

**Tanggal**: 2026-08-10
**Target**: `~/9router-fork` (fork afandiaziz/9router, deployed via `ghcr.io/afandiaziz/9router:latest` di `~/9router`)
**Status**: Design disetujui, menunggu implementation plan

---

## Ringkasan

Fitur "Quota Sharing" menambahkan sistem **API key terpisah** yang memungkinkan owner berbagi akses ke pool model 9router dengan **batas token** dan **restriksi model** per key. Setiap quota key punya:

- `limit` — batas total token (atau unlimited)
- `limitPeriod` — daily | weekly | monthly | lifetime (dipilih per key)
- `allowedModels` — daftar model yang diizinkan + **alias** yang dilihat pengguna

Plus halaman dashboard **management** + halaman publik **check-usage**.

Sistem ini **terpisah** dari `apiKeys` existing (Endpoint & Key). Nama key berprefix `qsk-`.

---

## 1. Skema Database

`SCHEMA_VERSION` naik dari `1` → `2`. Tabel baru di `src/lib/db/schema.js`:

### `quotaKeys`

```
id            TEXT PRIMARY KEY        -- uuid
key           TEXT UNIQUE NOT NULL    -- qsk-{random24}
name          TEXT
isActive      INTEGER DEFAULT 1
limit         INTEGER                 -- cap token. NULL = unlimited
limitPeriod   TEXT                    -- 'daily'|'weekly'|'monthly'|'lifetime' (default 'monthly')
allowedModels TEXT                    -- JSON array [{ model, alias }]. [] = semua diizinkan
notes         TEXT                    -- opsional
createdAt     TEXT NOT NULL
updatedAt     TEXT NOT NULL
```

Index: `idx_qk_key ON quotaKeys(key)`.

### `quotaUsage`

```
keyId        TEXT NOT NULL            -- ref quotaKeys.id
period       TEXT NOT NULL            -- 'daily'|'weekly'|'monthly'|'lifetime'
periodKey    TEXT NOT NULL            -- '2026-08' (monthly) / '2026-W32' (weekly) / tgl (daily)
tokensUsed   INTEGER DEFAULT 0        -- prompt + completion
windowStart  TEXT NOT NULL            -- ISO start window
resetAt      TEXT NOT NULL            -- ISO saat window reset
PRIMARY KEY (keyId, period, periodKey)
```

Index: `idx_qu_kp ON quotaUsage(keyId, period)`.

**Keputusan:**
- Satu baris per (key, window) → `INSERT ... ON CONFLICT DO UPDATE SET tokensUsed = tokensUsed + excluded` atomic.
- `resetAt` di-recompute on-demand dari `limitPeriod` (tahan perubahan limit).
- `allowedModels` = JSON `[{ model, alias }]`; `alias` null berarti pakai nama asli; `[]` = semua diizinkan.

### Key format

- `qsk-{24 hex}` — di-generate via `generateQuotaKey()`.
- Prefix `qsk-` beda dari `sk-` normal → deteksi murah di enforcement tanpa query dahulu.

---

## 2. Repo Layer

New file: `src/lib/db/repos/quotaKeysRepo.js`.

| Fungsi | Peran |
|--------|-------|
| `generateQuotaKey()` | `qsk-` + 24 hex |
| `createQuotaKey({name, limit, limitPeriod, allowedModels, notes})` | insert, default `limitPeriod='monthly'`, `allowedModels=[]` |
| `getQuotaKeys()` | list semua + progress |
| `getQuotaKeyByFullKey(key)` | lookup untuk enforcement |
| `getQuotaKeyById(id)` | detail untuk edit |
| `updateQuotaKey(id, data)` | re-hitung window jika `limitPeriod` berubah |
| `toggleQuotaKey(id, isActive)` | enable/disable |
| `deleteQuotaKey(id)` | hapus key + baris usage |
| `getWindowKey(limitPeriod, now)` | → `{ periodKey, windowStart, resetAt }` |
| `getQuotaUsageForWindow(keyId, period, periodKey)` | baca counter |
| `incrementQuotaUsage(keyId, period, periodKey, resetAt, tokens)` | upsert atomic +tokens |
| `getQuotaKeyProgress(keyId)` | `{ tokensUsed, limit, percent, resetAt, allowedModels, isActive }` |

---

## 3. Enforcement (di `chat.js`)

Pre-check di `handleChat`, **setelah** blok `requireApiKey` (baris 64-75), **sebelum** routing:

```
1. apiKey = extractApiKey(request)
2. if (!apiKey?.startsWith("qsk-")) → flow normal (bukan quota key)
3. quota = getQuotaKeyByFullKey(apiKey)
4. !quota || !quota.isActive → 401 "Invalid or inactive quota key"
5. resolve body.model:
   - match entry.alias == body.model  → resolved = entry.model
   - match entry.model == body.model  → resolved = entry.model
   - no match → 403 "Model not allowed for this quota key"
6. body.model = resolved           // REWRITE sebelum routing
7. remaining = (limit ?? ∞) - tokensUsed
8. remaining <= 0 → 429 { error: quota_exceeded, resetsAt } (+Retry-After)
9. else request.context.quotaKey = { keyId, ... }
```

**Detail:**
- Hanya blokir bila `tokensUsed >= limit` (limit non-null). Tanpa headroom.
- `limit` null → skip step 7-8 (unlimited).
- Combo di-check terhadap `body.model` (nama combo). **Per-member restriction di luar scope** (dicatat).
- Rewrite `body.model` di pre-check → routing path (combo, `getModelInfo`, capacity adapter) **tidak berubah**.
- Quota key **tidak** diteruskan sebagai upstream `Authorization` — provider tetap pakai kredensial server.

---

## 4. Accounting (di `saveRequestUsage`, `usageRepo.js`)

`saveRequestUsage(entry)` sudah dipanggil dari `requestDetail.js` (streaming, non-streaming, sseToJson) dengan `entry.apiKey`. Tambah di akhir, dalam alur yang sama dengan insert yang ada:

```
if entry.apiKey?.startsWith("qsk-"):
    resolve keyId (by full key)
    periodKey = getWindowKey(limitPeriod)      // recompute on-demand
    incrementQuotaUsage(keyId, period, periodKey, resetAt,
                        entry.promptTokens + entry.completionTokens)
```

**Perlindungan de-dup:** `saveRequestUsage` mengecek existing row (timestamp+provider+model+connection+key+token) sebelum insert → duplicate/retry **tidak** double-charge counter. `quotaUsage` increment terjadi hanya saat terjadi insert sungguhan.

---

## 5. Management UI

### API routes

**`src/app/api/quota-keys/route.js`**
- `GET /api/quota-keys` — list (masked key, include progress). Full key **tidak** ditampilkan.
- `POST /api/quota-keys` — create `{ name, limit, limitPeriod, allowedModels, notes }`. Return full key sekali (hanya saat create).

**`src/app/api/quota-keys/[id]/route.js`**
- `PUT` — update; re-hitung window jika `limitPeriod` berubah.
- `DELETE` — hapus key + usage.
- `PATCH` (opsional) — toggle active.

**`src/app/api/quota-keys/[id]/regenerate/route.js`** — rotate `qsk-` value.

**`src/app/api/quota-keys/available-models/route.js`** — server-side: `buildModelsList([LLM_KIND], {skipDynamicFetch:true})`, regroup by `owned_by` (provider), untuk picker.

Auth: routes di bawah dashboard → dilindungi session guard yang sama dengan route dashboard lainnya. **Verifikasi di implementasi.**

### Halaman `/dashboard/quota-sharing`

- `page.js` (server) → render `<QuotaSharingClient />`.
- **Header** + tombol "New Quota Key".
- **Keys table**: Name, Masked key + reveal, Model restriction (chips / "All models"), Limit, Used/Percent (progress bar), Period, ResetsAt, Status, Actions (edit/delete/regenerate).
- **Create/Edit modal**: name, limit (number + "unlimited"), limitPeriod (select), model picker, notes. Full key ditampilkan sekali post-create + copy.
- **`QuotaModelPicker`**: fetch `/api/quota-keys/available-models`; daftar **dikelompokkan per provider** (accordion); **search bar**; tiap baris: toggle + input alias (opsional, live validate konflik alias); serialize ke `allowedModels`.
- **Search/filter** di table (small).

### Sidebar

Tambah di `src/shared/components/Sidebar.js` (setelah "Quota Tracker", baris 26):
`{ href: "/dashboard/quota-sharing", label: "Quota Sharing", icon: "share" }`

---

## 6. `/v1/models` aware quota key

Di `GET /v1/models` (models/route.js), setelah `extractApiKey`:

```
if key startsWith "qsk-":
    quota = getQuotaKeyByFullKey(key)
    invalid/inactive → 401
    allowedModels kosong → return semua (existing buildModelsList)
    ada isi → build dari buildModelsList (rewrite model list), expose id = alias ?? model
             HANYA expose model yang di-allow
else (tanpa key / sk- biasa):
    behavior existing (tidak berubah)
```

Tujuan: pengguna quota-sharing melihat **daftar model yang boleh dipakai** dengan nama alias di `/v1/models`.

---

## 7. Halaman publik `/check-usage`

**Dua state**: form (no-auth) → result (setelah key dimasukkan).

### Form
- Input key `qsk-...` + tombol "Check Usage".
- `POST /api/public/check-usage` dengan `{ key }`.
- Error: invalid / inactive → pesan jelas.

### Result screen

| Item | Sumber |
|------|--------|
| Status (active/disabled), name | `quotaKeys` |
| Overall progress bar + percent | `quotaUsage.tokensUsed / quotaKeys.limit`. `limit` null → label "Unlimited" |
| ResetsAt | `getWindowKey(limitPeriod)` on-demand |
| Total tokens: input + output | `SUM(promptTokens) + SUM(completionTokens)` dari `usageHistory` window (filter apiKey) |
| Cached read | `tokens.cache_read_input_tokens` / `prompt_tokens_details.cached_tokens` — parse via util |
| Cached write | `tokens.cache_creation_input_tokens` — parse via util |
| Est. cost | `SUM(usageHistory.cost)` untuk window key |
| Per-model breakdown | `usageHistory` GROUP BY model; bar = proporsi terhadap *total key limit* (bukan per-model limit); label = alias (resolve `allowedModels`), secondary = nama asli |
| Allowed models list | `allowedModels`; `[]` → "All models allowed" |

### API

**`POST /api/public/check-usage`** — `{ key }` → 200 `{ keyValid, name, isActive, limit, limitPeriod, resetsAt, tokensUsed, percent, totalTokens: {prompt, completion, cachedRead, cachedWrite, cost}, allowedModels, perModel: [{alias, model, tokens}] }` | 401 invalid.

- Read-only; **tidak** expose full key (masked).
- **Di luar** dashboard guard & **tidak** ikut `requireApiKey` — path `/api/public/**` dikecualikan dari dashboard guard saat implementasi.

### Util normalisasi cached tokens

`parseCachedTokens(tokens)` — satu fungsi untuk memetakan field berbeda per provider:
- Claude: `cache_creation_input_tokens` (write), `cache_read_input_tokens` (read)
- OpenAI: `prompt_tokens_details.cached_tokens` (read)
- fallback 0

**Catatan source-of-truth ganda:** enforcement memakai `quotaUsage` (counter atomic); tampilan breakdown & cost memakai `usageHistory` (GROUP BY). Bisa micro-mismatch hanya bila duplicate-insert (de-dup mencegahnya) — acceptable & dicatat.

---

## 8. Testing Plan

| Area | Isi |
|------|-----|
| **Unit repo** | `getWindowKey` boundary (daily/weekly/monthly/lifetime, perubahan hari/bulan), upsert increment, progress kalkulasi (limit null → percent null) |
| **Unit enforcement** | valid qsk aktif, invalid, inactive, model not allowed → 403, alias resolve → body.model rewrite, quota habis → 429 + Retry-After, unlimited skip |
| **Unit accounting** | increment hanya saat insert nyata, duplicate tidak double-charge |
| **Unit models endpoint** | qsk- melihat hanya allowed (alias), tanpa key/sk- tidak berubah |
| **Unit check-usage** | valid/invalid/inactive, summarize angka benar |
| **Integration (opsional)** | chat request pakai qsk- → usage tercatat & counter jalan |

Test harus mengikuti struktur test repo (di `~/9router-fork/tests/`).

---

## 9. Di Luar Scope (YAGNI)

- Restriksi per-member combo
- Quota pool / multiple key berbagi satu budget (omniroute `quota_pools`) — satu key = satu limit
- Rate-limit per request / concurrent session limit
- Webhook notifikasi quota habis
- Usage metrics historis di halaman check-usage (chart) — periode saat ini saja

---

## Konvensi yang diikuti

- Migration via `SCHEMA_VERSION` bump + additive `syncSchemaFromTables` (pola existing).
- Dashboard UI memakai konvensi styling/komponen `@/shared/components` yang sudah ada (`EndpointPageClient.js` sebagai referensi).
- Error response memakai `open-sse/utils/error.js` (`errorResponse`, style `unavailableResponse`).
- Halaman publik tanpa auth seperti landing page; no-login.
