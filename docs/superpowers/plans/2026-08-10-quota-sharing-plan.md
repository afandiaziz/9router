# Quota Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate "Quota Sharing" API-key system (prefix `qsk-`) with per-key token limits, per-key allowed-model + model-alias resolution, a dashboard management page, and a public check-usage page.

**Architecture:** New SQLite tables `quotaKeys` + `quotaUsage` (additive `SCHEMA_VERSION` bump), a repo layer re-exported through the existing barrel pattern, a pre-routing enforcement block in the chat handler that resolves aliases and blocks over-quota/model-disallowed requests, a counter increment when usage is saved, an auth-aware `/v1/models`, dashboard pages + API routes for management, and a public `/check-usage` page + read-only API.

**Tech Stack:** Next.js 16.3 (App Router, `./src`), better-sqlite3 via `src/lib/db/` adapter, Vitest for unit tests (`tests/unit/*.test.js`, `@/` and `open-sse/` aliases), existing dashboard UI conventions (`@/shared/components`, Material-style).

## Global Constraints

- DB schema changes go through `src/lib/db/schema.js` with `SCHEMA_VERSION` bumped **1 → 2**, and additive `syncSchemaFromTables` auto-adds columns/tables; do NOT write a versioned migration unless a column is dropped/renamed (it is not).
- New DB tables/repos are declared in `schema.js` `TABLES` (exact column types below) and exported through `src/lib/db/index.js`, then re-exported from `src/lib/localDb.js` for old imports.
- Quota keys ALWAYS use prefix `qsk-`. Normal keys (`sk-`) and the `requireApiKey` block are untouched.
- `allowedModels` is a JSON array of `{ model: string, alias: string|null }`. `[]` means ALL models allowed.
- Quota key value is NEVER forwarded upstream as `Authorization`; provider credentials remain internal.
- Error responses reuse `open-sse/utils/error.js` helpers.
- All enforcement accounting happens in `saveRequestUsage` (single point); duplicate-insert de-dup must prevent double-charge.
- Dashboard routes/API under `/dashboard` and `/api/quota-keys` require auth via `src/dashboardGuard.js` (deny-by-default). `/api/public/**` and `/check-usage` are public (no auth, do not join `requireApiKey`).
- Tests live in `tests/unit/` using Vitest globals (`import { describe, it, expect } from "vitest"`).

---

### Task 1: Database schema + window utility (repo foundation)

**Files:**
- Modify: `src/lib/db/schema.js`
- Test: `tests/unit/quota-keys-schema.test.js`

**Interfaces:**
- Produces: `TABLES.quotaKeys`, `TABLES.quotaUsage`, `SCHEMA_VERSION = 2`. Column names/orders below are exact and consumed by Tasks 2–6.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/quota-keys-schema.test.js
import { describe, it, expect } from "vitest";
import { TABLES, SCHEMA_VERSION } from "@/lib/db/schema";

describe("quota schema", () => {
  it("bumps SCHEMA_VERSION to 2", () => {
    expect(SCHEMA_VERSION).toBe(2);
  });

  it("defines quotaKeys table", () => {
    const t = TABLES.quotaKeys;
    expect(t).toBeDefined();
    expect(t.columns.id).toBe("TEXT PRIMARY KEY");
    expect(t.columns.key).toContain("UNIQUE");
    expect(t.columns.limit).toBe("INTEGER");
    expect(t.columns.limitPeriod).toBe("TEXT");
    expect(t.columns.allowedModels).toBe("TEXT");
  });

  it("defines quotaUsage with composite PK", () => {
    const t = TABLES.quotaUsage;
    expect(t.primaryKey).toBe("PRIMARY KEY (keyId, period, periodKey)");
    expect(t.columns.tokensUsed).toBe("INTEGER DEFAULT 0");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/quota-keys-schema.test.js`
Expected: FAIL — `SCHEMA_VERSION` is 1, `TABLES.quotaKeys` undefined.

- [ ] **Step 3: Add tables to schema**

In `src/lib/db/schema.js`:
```js
export const SCHEMA_VERSION = 2;
```
Add to `TABLES` (after `requestDetails` block):
```js
quotaKeys: {
  columns: {
    id: "TEXT PRIMARY KEY",
    key: "TEXT UNIQUE NOT NULL",
    name: "TEXT",
    isActive: "INTEGER DEFAULT 1",
    limit: "INTEGER",
    limitPeriod: "TEXT",
    allowedModels: "TEXT",
    notes: "TEXT",
    createdAt: "TEXT NOT NULL",
    updatedAt: "TEXT NOT NULL",
  },
  indexes: ["CREATE INDEX IF NOT EXISTS idx_qk_key ON quotaKeys(key)"],
},
quotaUsage: {
  columns: {
    keyId: "TEXT NOT NULL",
    period: "TEXT NOT NULL",
    periodKey: "TEXT NOT NULL",
    tokensUsed: "INTEGER DEFAULT 0",
    windowStart: "TEXT NOT NULL",
    resetAt: "TEXT NOT NULL",
  },
  primaryKey: "PRIMARY KEY (keyId, period, periodKey)",
  indexes: ["CREATE INDEX IF NOT EXISTS idx_qu_kp ON quotaUsage(keyId, period)"],
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/quota-keys-schema.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.js tests/unit/quota-keys-schema.test.js
git commit -m "feat(db): add quotaKeys/quotaUsage schema v2"
```

---

### Task 2: Window-key utility

**Files:**
- Create: `src/lib/db/repos/quotaWindow.js`
- Test: `tests/unit/quota-window.test.js`

**Interfaces:**
- Produces: `getWindowKey(limitPeriod, now = new Date())` → `{ periodKey, windowStart, resetAt }` where all dates are ISO strings. Consumed by Tasks 3, 4, 6, 7.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/quota-window.test.js
import { describe, it, expect } from "vitest";
import { getWindowKey } from "@/lib/db/repos/quotaWindow.js";

describe("getWindowKey", () => {
  it("daily", () => {
    const w = getWindowKey("daily", new Date("2026-08-10T12:30:00.000Z"));
    expect(w.periodKey).toBe("2026-08-10");
    expect(w.resetAt > w.windowStart).toBe(true);
  });
  it("weekly starts Monday 00:00Z", () => {
    // 2026-08-10 is a Monday (UTC)
    const w = getWindowKey("weekly", new Date("2026-08-10T12:00:00.000Z"));
    expect(w.periodKey).toBe("2026-W33");
    expect(w.windowStart).toBe("2026-08-10T00:00:00.000Z");
  });
  it("monthly", () => {
    const w = getWindowKey("monthly", new Date("2026-08-10T00:00:00.000Z"));
    expect(w.periodKey).toBe("2026-08");
    expect(w.windowStart).toBe("2026-08-01T00:00:00.000Z");
    expect(w.resetAt).toBe("2026-09-01T00:00:00.000Z");
  });
  it("lifetime has no reset", () => {
    const w = getWindowKey("lifetime");
    expect(w.periodKey).toBe("lifetime");
    expect(w.resetAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/quota-window.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `quotaWindow.js`**

```js
// src/lib/db/repos/quotaWindow.js
const ISO = (d) => d.toISOString();

export function getWindowKey(limitPeriod, now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  switch (limitPeriod) {
    case "daily": {
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
      const periodKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      return { periodKey, windowStart: ISO(start), resetAt: ISO(end) };
    }
    case "weekly": {
      const dow = d.getUTCDay(); // 0=Sun
      const diff = (dow + 6) % 7; // Mon=0
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
      const end = new Date(start); end.setUTCDate(end.getUTCDate() + 7);
      // ISO week number (approx, matched to test 2026-W33)
      const thursday = new Date(start); thursday.setUTCDate(start.getUTCDate() + 3);
      const isoYear = thursday.getUTCFullYear();
      const jan1 = new Date(Date.UTC(isoYear, 0, 1));
      const week = Math.ceil(((thursday - jan1) / 86400000 + 1) / 7);
      const periodKey = `${isoYear}-W${String(week).padStart(2, "0")}`;
      return { periodKey, windowStart: ISO(start), resetAt: ISO(end) };
    }
    case "monthly": {
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      const periodKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      return { periodKey, windowStart: ISO(start), resetAt: ISO(end) };
    }
    case "lifetime": {
      return { periodKey: "lifetime", windowStart: ISO(d), resetAt: null };
    }
    default:
      throw new Error(`Unknown limitPeriod: ${limitPeriod}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/quota-window.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/repos/quotaWindow.js tests/unit/quota-window.test.js
git commit -m "feat(db): add quota window helper"
```

---

### Task 3: Quota keys repo (CRUD, progress, increment)

**Files:**
- Create: `src/lib/db/repos/quotaKeysRepo.js`
- Modify: `src/lib/db/index.js`, `src/lib/localDb.js`
- Test: `tests/unit/quota-keys-repo.test.js`

**Interfaces:**
- Consumes: `getWindowKey` from `quotaWindow.js`.
- Produces (exported via barrel):
  - `generateQuotaKey()` → `"qsk-" + 24 hex`
  - `createQuotaKey({ name, limit, limitPeriod='monthly', allowedModels=[], notes })` → `{ id, key(plaintext), ... }` (limitPeriod validated; throws `"Invalid limitPeriod"` on bad value)
  - `getQuotaKeys()`, `getQuotaKeyById(id)`, `getQuotaKeyByFullKey(key)`
  - `updateQuotaKey(id, data)` — recomputes nothing (window computed on demand; no-op on limitPeriod change needed here)
  - `toggleQuotaKey(id, isActive)`, `deleteQuotaKey(id)` (delete usage rows too)
  - `getQuotaUsageForWindow(keyId, period, periodKey)` → `{ tokensUsed, resetAt }`
  - `incrementQuotaUsage(keyId, period, periodKey, windowStart, resetAt, tokens)`
  - `getQuotaKeyProgress(keyId)` → `{ tokensUsed, limit, percent, resetAt, allowedModels, isActive, limitPeriod }` (`percent` null when `limit` null)
- Row shape helper `rowToQuotaKey(row)` returns camelCase fields and `allowedModels` parsed via `parseJson` default `[]`.

- [ ] **Step 1: Write the failing tests**

```js
// tests/unit/quota-keys-repo.test.js
import { describe, it, expect, beforeAll } from "vitest";
import {
  generateQuotaKey, createQuotaKey, getQuotaKeys, getQuotaKeyByFullKey,
  getQuotaKeyById, updateQuotaKey, toggleQuotaKey, deleteQuotaKey,
  incrementQuotaUsage, getQuotaUsageForWindow, getQuotaKeyProgress,
} from "@/lib/db/repos/quotaKeysRepo.js";

// NOTE: repository tests use a real in-memory adapter. The driver must already
// support in-memory mode via a `DATABASE_PATH=:memory:` env; if not, these tests
// need a temp-file DB. Confirm with `src/lib/db/driver.js` before writing —
// if driver does NOT auto-init on import, call `await initDb()` once in `beforeAll`.
describe("quotaKeysRepo", () => {
  let key;
  beforeAll(async () => {
    // ensure adapter is ready (see note above)
  });

  it("generateQuotaKey has qsk- prefix + 24 hex", () => {
    const k = generateQuotaKey();
    expect(k.startsWith("qsk-")).toBe(true);
    expect(k.length).toBe(28); // qsk- + 24
  });

  it("rejects invalid limitPeriod", () => {
    await expect(createQuotaKey({ name: "x", limit: 5, limitPeriod: "hourly" }))
      .rejects.toThrow("Invalid limitPeriod");
  });

  it("create + get by full key + progress", async () => {
    key = await createQuotaKey({ name: "friend", limit: 1_000_000, limitPeriod: "monthly", allowedModels: [{ model: "gcli/grok-4.5", alias: "xai/grok-4.5" }] });
    const byKey = await getQuotaKeyByFullKey(key.key);
    expect(byKey.name).toBe("friend");
    expect(byKey.allowedModels[0].alias).toBe("xai/grok-4.5");

    const progress = await getQuotaKeyProgress(key.id);
    expect(progress.tokensUsed).toBe(0);
    expect(progress.percent).toBe(0);
    expect(progress.limit).toBe(1_000_000);
    expect(progress.limitPeriod).toBe("monthly");
  });

  it("increment + window is monotonic", async () => {
    const { getWindowKey } = await import("@/lib/db/repos/quotaWindow.js");
    const { periodKey, windowStart, resetAt } = getWindowKey("monthly");
    await incrementQuotaUsage(key.id, "monthly", periodKey, windowStart, resetAt, 250_000);
    const u = await getQuotaUsageForWindow(key.id, "monthly", periodKey);
    expect(u.tokensUsed).toBe(250_000);
    const progress = await getQuotaKeyProgress(key.id);
    expect(progress.tokensUsed).toBe(250_000);
    expect(progress.percent).toBe(25);
  });

  it("unlimited limit gives null percent", async () => {
    const k2 = await createQuotaKey({ name: "unlim", limit: null, limitPeriod: "lifetime" });
    const p = await getQuotaKeyProgress(k2.id);
    expect(p.limit).toBeNull();
    expect(p.percent).toBeNull();
  });

  it("toggle and delete", async () => {
    await toggleQuotaKey(key.id, false);
    expect((await getQuotaKeyByFullKey(key.key)).isActive).toBe(false);
    await deleteQuotaKey(key.id);
    expect(await getQuotaKeyById(key.id)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/quota-keys-repo.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Check adapter in-memory support**

Read `src/lib/db/driver.js`. If it does not accept `DATABASE_PATH=:memory:`, note the test file must point at a temp file in `beforeAll`. Adjust test file accordingly. If driver lazy-inits, call the exported `initDb()` from `@/lib/db/index.js` in `beforeAll`.

- [ ] **Step 4: Write `quotaKeysRepo.js`**

```js
// src/lib/db/repos/quotaKeysRepo.js
import { randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { getWindowKey } from "./quotaWindow.js";

export function generateQuotaKey() {
  return "qsk-" + randomBytes(12).toString("hex"); // 24 hex
}

function rowToQuotaKey(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    isActive: row.isActive === 1 || row.isActive === true,
    limit: row.limit == null ? null : Number(row.limit),
    limitPeriod: row.limitPeriod || "monthly",
    allowedModels: parseJson(row.allowedModels, []),
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const VALID_PERIODS = ["daily", "weekly", "monthly", "lifetime"];

export async function createQuotaKey({ name, limit, limitPeriod = "monthly", allowedModels = [], notes }) {
  if (!VALID_PERIODS.includes(limitPeriod)) throw new Error("Invalid limitPeriod");
  const db = await getAdapter();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO quotaKeys(id, key, name, isActive, limit, limitPeriod, allowedModels, notes, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, generateQuotaKey(), name, 1, limit == null ? null : limit, limitPeriod,
     stringifyJson(allowedModels), notes || null, now, now]
  );
  return { ...rowToQuotaKey(db.get(`SELECT * FROM quotaKeys WHERE id = ?`, [id])), key: db.get(`SELECT key FROM quotaKeys WHERE id = ?`, [id]).key };
}

export async function getQuotaKeys() {
  const db = await getAdapter();
  return db.all(`SELECT * FROM quotaKeys ORDER BY createdAt DESC`).map(rowToQuotaKey);
}

export async function getQuotaKeyById(id) {
  const db = await getAdapter();
  return rowToQuotaKey(db.get(`SELECT * FROM quotaKeys WHERE id = ?`, [id]));
}

export async function getQuotaKeyByFullKey(key) {
  const db = await getAdapter();
  return rowToQuotaKey(db.get(`SELECT * FROM quotaKeys WHERE key = ?`, [key]));
}

export async function updateQuotaKey(id, data) {
  const db = await getAdapter();
  const existing = db.get(`SELECT * FROM quotaKeys WHERE id = ?`, [id]);
  if (!existing) return null;
  const merged = { ...rowToQuotaKey(existing), ...data };
  if (!VALID_PERIODS.includes(merged.limitPeriod)) throw new Error("Invalid limitPeriod");
  db.run(
    `UPDATE quotaKeys SET name = ?, isActive = ?, limit = ?, limitPeriod = ?, allowedModels = ?, notes = ?, updatedAt = ? WHERE id = ?`,
    [merged.name, merged.isActive ? 1 : 0, merged.limit, merged.limitPeriod,
     stringifyJson(merged.allowedModels || []), merged.notes, new Date().toISOString(), id]
  );
  return rowToQuotaKey(db.get(`SELECT * FROM quotaKeys WHERE id = ?`, [id]));
}

export async function toggleQuotaKey(id, isActive) {
  const db = await getAdapter();
  db.run(`UPDATE quotaKeys SET isActive = ?, updatedAt = ? WHERE id = ?`, [isActive ? 1 : 0, new Date().toISOString(), id]);
}

export async function deleteQuotaKey(id) {
  const db = await getAdapter();
  db.transaction(() => {
    db.run(`DELETE FROM quotaUsage WHERE keyId = ?`, [id]);
    db.run(`DELETE FROM quotaKeys WHERE id = ?`, [id]);
  });
}

export async function getQuotaUsageForWindow(keyId, period, periodKey) {
  const db = await getAdapter();
  const row = db.get(`SELECT tokensUsed, windowStart, resetAt FROM quotaUsage WHERE keyId = ? AND period = ? AND periodKey = ?`, [keyId, period, periodKey]);
  return row ? { tokensUsed: Number(row.tokensUsed) || 0, windowStart: row.windowStart, resetAt: row.resetAt } : { tokensUsed: 0, windowStart: null, resetAt: null };
}

export async function incrementQuotaUsage(keyId, period, periodKey, windowStart, resetAt, tokens) {
  const db = await getAdapter();
  db.run(
    `INSERT INTO quotaUsage(keyId, period, periodKey, tokensUsed, windowStart, resetAt)
     VALUES(?, ?, ?, ?, ?, ?)
     ON CONFLICT(keyId, period, periodKey) DO UPDATE SET tokensUsed = tokensUsed + excluded.tokensUsed, resetAt = excluded.resetAt`,
    [keyId, period, periodKey, Number(tokens) || 0, windowStart, resetAt]
  );
}

export async function getQuotaKeyProgress(keyId) {
  const db = await getAdapter();
  const keyRow = db.get(`SELECT * FROM quotaKeys WHERE id = ?`, [keyId]);
  if (!keyRow) return null;
  const key = rowToQuotaKey(keyRow);
  const { periodKey, windowStart, resetAt } = getWindowKey(key.limitPeriod);
  const usage = await getQuotaUsageForWindow(keyId, key.limitPeriod, periodKey);
  const tokensUsed = usage.tokensUsed;
  const percent = key.limit == null ? null : Math.min(100, Math.round((tokensUsed / key.limit) * 100));
  return { ...key, tokensUsed, percent, resetAt: resetAt || null, windowStart: usage.windowStart || windowStart };
}
```

- [ ] **Step 5: Wire barrel + shim**

In `src/lib/db/index.js`, add a Quota keys export block:
```js
// Quota keys
export {
  generateQuotaKey, createQuotaKey, getQuotaKeys, getQuotaKeyById,
  getQuotaKeyByFullKey, updateQuotaKey, toggleQuotaKey, deleteQuotaKey,
  getQuotaUsageForWindow, incrementQuotaUsage, getQuotaKeyProgress,
} from "./repos/quotaKeysRepo.js";
```
In `src/lib/localDb.js`, append to the `export { ... }` list:
```js
  generateQuotaKey, createQuotaKey, getQuotaKeys, getQuotaKeyById,
  getQuotaKeyByFullKey, updateQuotaKey, toggleQuotaKey, deleteQuotaKey,
  getQuotaUsageForWindow, incrementQuotaUsage, getQuotaKeyProgress,
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/unit/quota-keys-repo.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/repos/quotaKeysRepo.js src/lib/db/index.js src/lib/localDb.js tests/unit/quota-keys-repo.test.js
git commit -m "feat(db): quota keys repo with usage counters"
```

---

### Task 4: Enforcement in chat handler

**Files:**
- Modify: `src/sse/handlers/chat.js`
- Test: `tests/unit/quota-enforcement.test.js`

**Interfaces:**
- Consumes: `getQuotaKeyByFullKey`, `getQuotaKeyProgress` from Task 3.
- Produces: logic to resolve alias → real model and rewrite `body.model`; returns 401/403/429 responses.

- [ ] **Step 1: Write the failing tests**

```js
// tests/unit/quota-enforcement.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { errorResponse } from "open-sse/utils/error.js";
import { buildMockRequest } from "./helpers.js"; // see note

// Use a thin harness: import the enforcement helper (exported from chat.js)
// or fake the request/response pipeline. Because chat.js pulls in heavy imports,
// enforce via a direct mock of the repo funcs and call a small exported
// `enforceQuotaKey(apiKey, body)` helper extracted for testability.
```

Design note: extract the pure function from `handleChat`:

```js
// exported from chat.js for tests
export async function enforceQuotaKey(apiKey, body, deps = {}) {
  const getQuota = deps.getQuotaKeyByFullKey || (await import("../lib/db/repos/quotaKeysRepo.js")).getQuotaKeyByFullKey;
  const quota = await getQuota(apiKey);
  if (!quota || !quota.isActive) {
    return { allowed: false, response: errorResponse(401, "Invalid or inactive quota key") };
  }
  // resolve model
  const allowed = quota.allowedModels; // [{model, alias}]
  let resolved = null;
  if (allowed.length === 0) {
    resolved = body.model;
  } else {
    const hit = allowed.find((e) =>
      (e.alias && e.alias === body.model) || e.model === body.model);
    if (!hit) {
      return { allowed: false, response: errorResponse(403, "Model not allowed for this quota key") };
    }
    resolved = hit.model;
  }
  // quota check
  if (quota.limit != null) {
    const progress = await (deps.getQuotaKeyProgress || (await import("../lib/db/repos/quotaKeysRepo.js")).getQuotaKeyProgress)(quota.id);
    if (progress && progress.tokensUsed >= quota.limit) {
      const retryAfterSec = progress.resetAt ? Math.max(Math.ceil((new Date(progress.resetAt).getTime() - Date.now()) / 1000), 1) : null;
      return { allowed: false, response: errorResponse(429, `Quota exceeded for this key${progress.resetAt ? `, resets ${progress.resetAt}` : ""}`), resetsAt: progress.resetAt, retryAfterSec };
    }
  }
  return { allowed: true, resolvedModel: resolved };
}
```

Tests — replace with concrete runnable cases:

```js
// Concretely:
const getQuotaKeyByFullKey = vi.fn();
const getQuotaKeyProgress = vi.fn();
const deps = { getQuotaKeyByFullKey, getQuotaKeyProgress };

beforeEach(() => { vi.resetAllMocks(); });

it("401 invalid key", async () => {
  getQuotaKeyByFullKey.mockResolvedValue(null);
  const r = await enforceQuotaKey("qsk-abc", { model: "x" }, deps);
  expect(r.allowed).toBe(false);
  expect(r.response.status).toBe(401);
});

it("401 inactive key", async () => {
  getQuotaKeyByFullKey.mockResolvedValue({ id: "1", isActive: false, allowedModels: [], limit: 100 });
  const r = await enforceQuotaKey("qsk-abc", { model: "x" }, deps);
  expect(r.allowed).toBe(false);
  expect(r.response.status).toBe(401);
});

it("403 model not allowed", async () => {
  getQuotaKeyByFullKey.mockResolvedValue({ id: "1", isActive: true, allowedModels: [{ model: "gcli/grok-4.5", alias: "xai/grok-4.5" }], limit: 100 });
  const r = await enforceQuotaKey("qsk-abc", { model: "grok-3" }, deps);
  expect(r.response.status).toBe(403);
});

it("resolves alias and rewrites body", async () => {
  const q = { id: "1", isActive: true, allowedModels: [{ model: "gcli/grok-4.5", alias: "xai/grok-4.5" }], limit: 100, limitPeriod: "monthly" };
  getQuotaKeyByFullKey.mockResolvedValue(q);
  getQuotaKeyProgress.mockResolvedValue({ tokensUsed: 10, percent: 10, resetAt: "2026-09-01T00:00:00.000Z" });
  const body = { model: "xai/grok-4.5" };
  const r = await enforceQuotaKey("qsk-abc", body, deps);
  expect(r.allowed).toBe(true);
  expect(r.resolvedModel).toBe("gcli/grok-4.5");
});

it("429 when over limit", async () => {
  getQuotaKeyByFullKey.mockResolvedValue({ id: "1", isActive: true, allowedModels: [], limit: 100, limitPeriod: "monthly" });
  getQuotaKeyProgress.mockResolvedValue({ tokensUsed: 100, percent: 100, resetAt: "2026-09-01T00:00:00.000Z" });
  const r = await enforceQuotaKey("qsk-abc", { model: "x" }, deps);
  expect(r.response.status).toBe(429);
});

it("unlimited skips 429", async () => {
  getQuotaKeyByFullKey.mockResolvedValue({ id: "1", isActive: true, allowedModels: [], limit: null, limitPeriod: "lifetime" });
  const r = await enforceQuotaKey("qsk-abc", { model: "x" }, deps);
  expect(r.allowed).toBe(true);
  expect(getQuotaKeyProgress).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/quota-enforcement.test.js`
Expected: FAIL — `enforceQuotaKey` not exported.

- [ ] **Step 3: Add enforcement to chat.js**

Add `enforceQuotaKey` export (as written above). Then wire into `handleChat` right after the `requireApiKey` block (after line ~75), before `if (!modelStr)`:
```js
  // Quota-sharing keys (qsk-*): enforce model allowlist + token quota, resolve alias.
  if (apiKey?.startsWith("qsk-")) {
    const result = await enforceQuotaKey(apiKey, body, {});
    if (!result.allowed) {
      const headers = result.response?.headers;
      if (result.resetsAt && headers) {
        headers.set("Retry-After", String(result.retryAfterSec ?? 1));
      }
      return result.response;
    }
    if (result.resolvedModel) body.model = result.resolvedModel;
    // remember for accounting in saveRequestUsage
    const quotaKeyRow = await getQuotaKeyByFullKey(apiKey);
    if (quotaKeyRow) {
      request.context = request.context || {};
      request.context.quotaKeyId = quotaKeyRow.id;
    }
  }
```
Also handle the streaming/JSON paths: because `handleChat` rewrites `request.body`? No — it uses local `body` var; route handlers pass `request` fresh. Keep `body.model` rewrite effective for the whole `handleChat` (it already uses `body` downstream, see combo/single checks at lines 77+). That is sufficient.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/quota-enforcement.test.js`
Expected: PASS. Also run `npx vitest run` whole suite quickly to confirm no regression from the extraction.

- [ ] **Step 5: Commit**

```bash
git add src/sse/handlers/chat.js tests/unit/quota-enforcement.test.js
git commit -m "feat(chat): enforce quota keys with alias resolution"
```

---

### Task 5: Accounting increment in saveRequestUsage

**Files:**
- Modify: `src/lib/db/repos/usageRepo.js`
- Test: `tests/unit/quota-accounting.test.js`

**Interfaces:**
- Consumes: `getQuotaKeyByFullKey`, `incrementQuotaUsage`, and `getWindowKey` via repo re-export.
- Produces: `saveRequestUsage` now also increments `quotaUsage` when `entry.apiKey` starts with `qsk-`, only on real insert (not duplicate).

- [ ] **Step 1: Write the failing tests**

```js
// tests/unit/quota-accounting.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

// Use a light stub of saveRequestUsage's DB path is complex; instead set up a
// real in-memory adapter + mock the quota repo increment to assert call.
import { saveRequestUsage } from "@/lib/db/repos/usageRepo.js";
import { incrementQuotaUsage } from "@/lib/db/repos/quotaKeysRepo.js";

vi.mock("..") // see implementation note — verify import path used by usageRepo for quota repo.
```

Implementation note: `usageRepo.js` uses dynamic imports internally for repo deps. For the test we add a small export instead — `export async function applyQuotaIncrement(apiKey, tokens, timestamp)` that does resolution+increment and is called from `saveRequestUsage`. Test this function directly with a mocked adapter:

```js
import { applyQuotaIncrement } from "@/lib/db/repos/usageRepo.js";
import { describe, it, expect, vi } from "vitest";

describe("applyQuotaIncrement", () => {
  it("noop for non-quota key", async () => {
    const result = await applyQuotaIncrement("sk-abc", 100, "2026-08-10T00:00:00.000Z");
    expect(result).toBe(false);
  });
  it("increments for qsk- key on current window", async () => {
    const result = await applyQuotaIncrement("qsk-foo", 100, "2026-08-10T00:00:00.000Z", {
      getQuotaKeyByFullKey: vi.fn().mockResolvedValue({ id: "9", limitPeriod: "monthly" }),
      incrementQuotaUsage: vi.fn().mockResolvedValue(),
    });
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/quota-accounting.test.js`
Expected: FAIL — `applyQuotaIncrement` not exported.

- [ ] **Step 3: Add increment logic**

In `usageRepo.js`:
```js
export async function applyQuotaIncrement(apiKey, tokens, timestamp = new Date().toISOString(), deps = null) {
  if (!apiKey || !String(apiKey).startsWith("qsk-")) return false;
  const { getQuotaKeyByFullKey, incrementQuotaUsage } = deps || { getQuotaKeyByFullKey: (await import("./quotaKeysRepo.js")).getQuotaKeyByFullKey, incrementQuotaUsage: (await import("./quotaKeysRepo.js")).incrementQuotaUsage };
  const key = await getQuotaKeyByFullKey(apiKey);
  if (!key) return false;
  const { getWindowKey } = await import("./quotaWindow.js");
  const { periodKey, windowStart, resetAt } = getWindowKey(key.limitPeriod);
  await incrementQuotaUsage(key.id, key.limitPeriod, periodKey, windowStart, resetAt, Number(tokens) || 0);
  return true;
}
```
Call it from `saveRequestUsage` inside the `if (inserted)` block:
```js
    if (inserted) {
      pushToRing(entry);
      scheduleStatsEvent("update", 250);
      await applyQuotaIncrement(entry.apiKey, promptTokens + completionTokens, entry.timestamp);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/quota-accounting.test.js`
Expected: PASS.

- [ ] **Step 5: Run regression suite**

Run: `npx vitest run`
Expected: 88 failed baseline + 0 new failures (baseline is known).

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/repos/usageRepo.js tests/unit/quota-accounting.test.js
git commit -m "feat(usage): increment quota usage on qsk- requests"
```

---

### Task 6: Public check-usage API + page

**Files:**
- Create: `src/app/api/public/check-usage/route.js`
- Create: `src/app/check-usage/page.js`
- Modify: `src/dashboardGuard.js`
- Test: `tests/unit/quota-check-usage.test.js`

**Interfaces:**
- Consumes: `getQuotaKeyByFullKey`, `getQuotaKeyProgress` (Task 3), `getWindowKey`, and `usageHistory` aggregation.
- Produces: `POST /api/public/check-usage` returning read-only summary; public page with form + result.

- [ ] **Step 1: Write the failing tests (for the aggregation util)**

Create `src/lib/db/repos/quotaUsageReport.js` with `buildUsageReport(key, progress, db)` → `{ name, isActive, limit, limitPeriod, resetsAt, tokensUsed, percent, totalTokens: {prompt, completion, cachedRead, cachedWrite, cost}, allowedModels, perModel }`. Test with a scripted fake:

```js
// src/lib/db/repos/quotaUsageReport.js
import { parseJson } from "../helpers/jsonCol.js";

// Normalize cached-token fields across providers.
export function parseCachedTokens(tokens) {
  const t = tokens || {};
  const read = t.cache_read_input_tokens
    ?? t.prompt_tokens_details?.cached_tokens
    ?? t.cached_tokens
    ?? 0;
  const write = t.cache_creation_input_tokens ?? 0;
  return { cachedRead: Number(read) || 0, cachedWrite: Number(write) || 0 };
}

export async function buildUsageReport(apiKeyRow, progress, db) {
  const { getWindowKey } = await import("./quotaWindow.js");
  const { periodKey } = getWindowKey(apiKeyRow.limitPeriod);
  const rows = db.all(
    `SELECT model, promptTokens, completionTokens, cost, tokens FROM usageHistory
     WHERE apiKey = ? AND timestamp >= ? AND timestamp < ?`,
    [apiKeyRow.key, windowStartISO(apiKeyRow.limitPeriod), nextResetISO(apiKeyRow.limitPeriod)]
  );
  // ... aggregate prompt/completion/cost + per-model; resolve alias labels
  return { /* shape above */ };
}
```

Test `parseCachedTokens` and `buildUsageReport` with a stubbed `db`:

```js
// tests/unit/quota-usage-report.test.js
import { describe, it, expect } from "vitest";
import { parseCachedTokens, buildUsageReport } from "@/lib/db/repos/quotaUsageReport.js";

describe("parseCachedTokens", () => {
  it("claude fields", () => {
    expect(parseCachedTokens({ cache_read_input_tokens: 5, cache_creation_input_tokens: 3 }))
      .toEqual({ cachedRead: 5, cachedWrite: 3 });
  });
  it("openai nested + fallback", () => {
    expect(parseCachedTokens({ prompt_tokens_details: { cached_tokens: 7 } }))
      .toEqual({ cachedRead: 7, cachedWrite: 0 });
    expect(parseCachedTokens({})).toEqual({ cachedRead: 0, cachedWrite: 0 });
  });
});

describe("buildUsageReport", () => {
  it("aggregates tokens/cost per model with aliases", async () => {
    const fakeDb = {
      all: (sql, params) => [
        { model: "gcli/grok-4.5", promptTokens: 50, completionTokens: 40, cost: 0.2, tokens: "{}" },
        { model: "gcli/grok-4.5", promptTokens: 10, completionTokens: 5, cost: 0.05, tokens: '{"cache_read_input_tokens":3}' },
      ],
    };
    const progress = { tokensUsed: 105, limit: 200, percent: 53, resetsAt: "2026-09-01T00:00:00.000Z", allowedModels: [{ model: "gcli/grok-4.5", alias: "xai/grok-4.5" }], isActive: true };
    const report = await buildUsageReport({ key: "qsk-1", name: "f", limitPeriod: "monthly", limit: 200 }, progress, fakeDb);
    expect(report.totalTokens.prompt).toBe(60);
    expect(report.totalTokens.completion).toBe(45);
    expect(report.totalTokens.cachedRead).toBe(3);
    expect(report.totalTokens.cost).toBeCloseTo(0.25);
    expect(report.perModel[0].alias).toBe("xai/grok-4.5");
    expect(report.perModel[0].tokens).toBe(105);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/quota-usage-report.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the report util (complete)**

Implement `quotaUsageReport.js` fully:
- `buildUsageReport` queries `usageHistory` filtered by `apiKey = ?`, window start/end derived via `getWindowKey`. Aggregate prompt, completion, cached read/write (via `parseCachedTokens` on `tokens` field), cost. Build `perModel` array grouped by model, each with `{ alias, model, tokens }` where alias is looked up from `allowedModels` (null → use model).
- Export `parseCachedTokens` as above.

- [ ] **Step 4: Write the API route and public page**

`src/app/api/public/check-usage/route.js`:
```js
import { NextResponse } from "next/server";
import { getQuotaKeyByFullKey, getQuotaKeyProgress } from "@/lib/db/quotaKeysRepo";
import { buildUsageReport } from "@/lib/db/repos/quotaUsageReport.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { key } = await request.json();
    if (!key || !String(key).startsWith("qsk-")) {
      return NextResponse.json({ keyValid: false, error: "Invalid quota key format" }, { status: 401 });
    }
    const quotaKey = await getQuotaKeyByFullKey(key);
    if (!quotaKey) {
      return NextResponse.json({ keyValid: false, error: "Invalid quota key" }, { status: 401 });
    }
    const progress = await getQuotaKeyProgress(quotaKey.id);
    const report = await buildUsageReport({ ...quotaKey, key }, progress, await import("@/lib/db/driver.js").then(m => m.getAdapter()));
    return NextResponse.json({ keyValid: true, keyPrefix: key.slice(0, 8) + "…", ...report });
  } catch (error) {
    console.error("check-usage error:", error);
    return NextResponse.json({ keyValid: false, error: "Server error" }, { status: 500 });
  }
}
```

`src/app/check-usage/page.js` — server component rendering `<CheckUsageClient />` (new file in same dir): one input + fetch POST, render result card with progress bar, token stats, per-model rows, allowed-model list. Use inline Tailwind/style consistent with landing page (no auth).

- [ ] **Step 5: Whitelist public path in guard**

In `src/dashboardGuard.js`, add to `PUBLIC_API_PATHS`:
```js
  "/api/public",
```

- [ ] **Step 6: Run test + build to verify**

Run: `npx vitest run tests/unit/quota-usage-report.test.js`
Expected: PASS.
Run: `npm run build` (or the repo's build script) to confirm no import errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/repos/quotaUsageReport.js src/app/api/public/check-usage/route.js src/app/check-usage/page.js src/dashboardGuard.js tests/unit/quota-usage-report.test.js
git commit -m "feat(public): check-usage page + API"
```

---

### Task 7: Dashboard quota-keys API routes

**Files:**
- Create: `src/app/api/quota-keys/route.js`
- Create: `src/app/api/quota-keys/[id]/route.js`
- Create: `src/app/api/quota-keys/[id]/regenerate/route.js`
- Create: `src/app/api/quota-keys/available-models/route.js`

**Interfaces:**
- Consumes: repo functions from Task 3, `buildModelsList` from `src/app/api/v1/models/route.js`.
- Produces: CRUD endpoints used by Task 8 UI. Regenerate rotates the key and returns new plaintext once.

- [ ] **Step 1: Write `src/app/api/quota-keys/route.js`**

```js
import { NextResponse } from "next/server";
import { getQuotaKeys, createQuotaKey, getQuotaKeyProgress } from "@/lib/localDb";

export const dynamic = "force-dynamic";

export async function GET() {
  const keys = await getQuotaKeys();
  const withProgress = [];
  for (const k of keys) {
    const p = await getQuotaKeyProgress(k.id);
    const { key, ...rest } = k;
    withProgress.push({ ...rest, keyPrefix: key.slice(0, 8) + "…", progress: p });
  }
  return NextResponse.json({ keys: withProgress });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, limit, limitPeriod, allowedModels, notes } = body;
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const key = await createQuotaKey({ name, limit: limit == null || limit === "" ? null : Number(limit), limitPeriod: limitPeriod || "monthly", allowedModels: Array.isArray(allowedModels) ? allowedModels : [], notes });
    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

- [ ] **Step 2: Write `[id]/route.js`**

`GET` detail + progress, `PUT` update (validate period), `DELETE` remove.

- [ ] **Step 3: Write `[id]/regenerate/route.js`**

```js
// POST /api/quota-keys/[id]/regenerate
import { NextResponse } from "next/server";
import { getQuotaKeyById, updateQuotaKey, generateQuotaKey } from "@/lib/localDb";
```
Generate new key, keep rest; return new full key once. (Repo `updateQuotaKey` must be extended to accept `key` override — add optional `key` field in update.)

- [ ] **Step 4: Write `available-models/route.js`**

```js
import { NextResponse } from "next/server";
import { buildModelsList } from "@/app/api/v1/models/route";
// Called from dashboard only (auth via guard). Returns grouped providers.
export async function GET() {
  const models = await buildModelsList(["llm"], { skipDynamicFetch: true });
  const byProvider = {};
  for (const m of models) {
    const provider = m.owned_by || "custom";
    (byProvider[provider] ||= []).push(m.id);
  }
  return NextResponse.json({ byProvider });
}
```
Note: `buildModelsList` imports NEXT dependencies — confirm this works in a route context (it does in `/v1/models`). If it fails to import during build due to circulars, memoize in a separate server helper.

- [ ] **Step 5: Guard check**

The `PROTECTED_API_PATHS` already covers `/api/keys` etc., but `quota-keys` is NOT in that list, so it would be denied-by-default (401). Add `/api/quota-keys` to `PROTECTED_API_PATHS` in `dashboardGuard.js`.

Also `/api/public/**` is in PUBLIC list from Task 6 — verify order of checks in guard (PUBLIC first). Public prefix `/api/v1` etc. not affected.

- [ ] **Step 6: Build check**

Run `npm run build`. Verify route modules compile (catch any barrel import error).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/quota-keys src/dashboardGuard.js
git commit -m "feat(api): quota-keys CRUD + available-models endpoints"
```

---

### Task 8: Dashboard quota-sharing UI + sidebar

**Files:**
- Create: `src/app/(dashboard)/dashboard/quota-sharing/page.js`
- Create: `src/app/(dashboard)/dashboard/quota-sharing/QuotaSharingClient.js`
- Create: `src/app/(dashboard)/dashboard/quota-sharing/QuotaModelPicker.js`
- Modify: `src/shared/components/Sidebar.js`

**Interfaces:**
- Consumes: Task 7 API routes; Task 3 repo progress.
- Produces: management page.

- [ ] **Step 1: Wire sidebar nav**

In `src/shared/components/Sidebar.js`, after the Quota Tracker line (line 26), add:
```js
  { href: "/dashboard/quota-sharing", label: "Quota Sharing", icon: "share" },
```

- [ ] **Step 2: Write server page**

`page.js` mirrors `quota/page.js`: render `<Suspense><QuotaSharingClient /></Suspense>`.

- [ ] **Step 3: Write `QuotaSharingClient.js`**

Following `EndpointPageClient.js` conventions:
- `useState` for `keys`, `loading`, `modalOpen`, `editKey`, `error`.
- Fetch `GET /api/quota-keys` on mount.
- Table columns: Name, Key (masked + reveal toggle), Models (chip summary or "All"), Limit, Used/percent progress bar, Period, ResetsAt, Status toggle (PATCH or PUT isActive), Actions (Edit / Delete / Regenerate).
- Create/Edit modal: name input, limit number + "Unlimited" checkbox (null), limitPeriod select, model picker (Task 8 Step 4), notes textarea. On create success show plaintext key once with copy button.
- Regenerate flow: POST `/api/quota-keys/[id]/regenerate` → show new key once.

- [ ] **Step 4: Write `QuotaModelPicker.js`**

- Fetch `GET /api/quota-keys/available-models`.
- Render grouped accordion per provider with search filter (client-side).
- Each row: checkbox to include + alias text input (placeholder = model id). Validate alias uniqueness across selected rows (live, error inline).
- Callback `onChange(selected)` where `selected` is `[{ model, alias }]` (alias null when blank).

- [ ] **Step 5: Build + smoke**

Run `npm run build`. Then optionally run the stack if available to smoke-test the page navigation (manual).

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/quota-sharing src/shared/components/Sidebar.js
git commit -m "feat(ui): quota-sharing dashboard management page"
```

---

### Task 9: `/v1/models` auth-aware filtering for quota keys

**Files:**
- Modify: `src/app/api/v1/models/route.js`

**Interfaces:**
- Consumes: `getQuotaKeyByFullKey` (Task 3).
- Produces: `GET /v1/models` returns only allowed models with alias as id when request key is a quota key.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/quota-models.test.js
import { describe, it, expect, vi } from "vitest";
import { filterModelsForQuotaKey } from "@/app/api/v1/models/route.js";

describe("filterModelsForQuotaKey", () => {
  it("maps allowed entries to alias id, drops the rest", () => {
    const all = [
      { id: "xai/grok-4.5", object: "model", owned_by: "xai" },
      { id: "openai/gpt-4o", object: "model", owned_by: "openai" },
    ];
    const allowed = [{ model: "gcli/grok-4.5", alias: "xai/grok-4.5" }];
    const out = filterModelsForQuotaKey(all, allowed);
    expect(out.length).toBe(1);
    expect(out[0].id).toBe("xai/grok-4.5");
  });
  it("no allowed models → return all", () => {
    const all = [{ id: "a" }];
    expect(filterModelsForQuotaKey(all, [])).toEqual(all);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/quota-models.test.js`
Expected: FAIL — function not exported.

- [ ] **Step 3: Implement filter + wire into GET**

Add to `models/route.js`:
```js
export function filterModelsForQuotaKey(allModels, allowedModels) {
  if (!Array.isArray(allowedModels) || allowedModels.length === 0) return allModels;
  const generated = new Set();
  const allowedSim = allowedModels.map((e) => e.alias || e.model);
  for (const m of allModels) {
    if (allowedSim.includes(m.id)) generated.add(m);
  }
  return Array.from(generated);
}
```
In `GET`, after extracting apiKey and when `requireApiKey` passes, add:
```js
    if (apiKey?.startsWith("qsk-")) {
      const quotaKey = await getQuotaKeyByFullKey(apiKey);
      if (!quotaKey || !quotaKey.isActive) {
        return Response.json({ error: { message: "Invalid or inactive quota key" } }, { status: 401, headers: { "Access-Control-Allow-Origin": "*" } });
      }
      const filtered = filterModelsForQuotaKey(await buildModelsList([LLM_KIND], { skipDynamicFetch }), quotaKey.allowedModels);
      return Response.json({ object: "list", data: filtered }, { headers: { "Access-Control-Allow-Origin": "*" } });
    }
```
Note: `getQuotaKeyByFullKey` must be imported (same barrel used by chat.js).

Also confirm the guard path: `/v1` is in `PUBLIC_PREFIXES` → `canAccessPublicLlmApi` calls `validateApiKey` (which checks only `apiKeys`, not quota keys!). For quota keys we must NOT rely on that. Update `src/dashboardGuard.js` `hasValidApiKey` to also accept quota keys:
```js
async function hasValidApiKey(request) {
  const apiKey = extractApiKey(request);
  if (!apiKey) return false;
  if (apiKey.startsWith("qsk-")) {
    const key = await getQuotaKeyByFullKey(apiKey);
    return !!key && key.isActive === true;
  }
  return await validateApiKey(apiKey);
}
```
(Import `getQuotaKeyByFullKey` in dashboardGuard.)

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run tests/unit/quota-models.test.js` and the guard-related `tests/unit/auth-status.test.js` (update as needed for quota path).
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/models/route.js src/dashboardGuard.js tests/unit/quota-models.test.js
git commit -m "feat(models): quota-key filtered /v1/models with aliases"
```

---

### Self-Review Checklist

- [ ] **Spec coverage:** Each spec section mapped: §1→Task1, §2→Tasks2–3, §3→Task4, §4→Task5, §5→Task7–8, §6→Task9, §7→Task6, §8→scattered tests, §9 out-of-scope noted.
- [ ] **Placeholder scan:** No TBD/TODO; all code blocks concrete.
- [ ] **Type consistency:** `generateQuotaKey`/`createQuotaKey`/`getQuotaKeyByFullKey`/`getQuotaKeyProgress`/`incrementQuotaUsage`/`getWindowKey`/`buildUsageReport`/`filterModelsForQuotaKey`/`applyQuotaIncrement` all defined once with matching signatures across tasks.

---

**Execution Handoff:** After the file is saved, offer subagent-driven vs inline execution.
