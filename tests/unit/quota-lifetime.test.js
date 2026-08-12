// tests/unit/quota-lifetime.test.js
// Regression coverage for lifetime-period quota keys. All three cases failed before
// the fix: getWindowKey("lifetime") returned windowStart=now (excluding all history)
// and resetAt=null, which the NOT NULL quotaUsage.resetAt column rejected — every
// increment threw and was swallowed by saveRequestUsage's try/catch.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-lifetime-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  await import("@/lib/db/index.js").then(m => m.initDb());
});

afterAll(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("lifetime quota accounting (regression for the reported bug)", () => {
  it("increments succeed and enforcement sees them", async () => {
    const { createQuotaKey, getQuotaKeyProgress } = await import("@/lib/db/repos/quotaKeysRepo.js");
    const { applyQuotaIncrement } = await import("@/lib/db/repos/usageRepo.js");

    const key = await createQuotaKey({ name: "lifetime-key", limit: 50_000_000, limitPeriod: "lifetime" });

    // This threw SqliteError (NOT NULL resetAt) before the fix, swallowed by saveRequestUsage.
    await applyQuotaIncrement(key.key, 588);
    await applyQuotaIncrement(key.key, 1_000);

    const progress = await getQuotaKeyProgress(key.id);
    expect(progress.tokensUsed).toBe(1_588);
    expect(progress.limit).toBe(50_000_000);
    expect(progress.resetAt).toBeNull(); // lifetime never resets
  });

  it("enforcement blocks once the lifetime limit is exceeded", async () => {
    const { createQuotaKey } = await import("@/lib/db/repos/quotaKeysRepo.js");
    const { applyQuotaIncrement } = await import("@/lib/db/repos/usageRepo.js");
    const { enforceQuotaKey } = await import("@/lib/quotaEnforcement.js");

    const key = await createQuotaKey({ name: "small", limit: 1_000, limitPeriod: "lifetime" });
    let res = await enforceQuotaKey(key.key, { model: "gcli/grok-4.5" });
    expect(res.allowed).toBe(true);

    await applyQuotaIncrement(key.key, 1_500); // exceed
    res = await enforceQuotaKey(key.key, { model: "gcli/grok-4.5" });
    expect(res.allowed).toBe(false);
    expect(res.response.status).toBe(429);
  });

  it("check-usage report counts lifetime requests", async () => {
    const { createQuotaKey } = await import("@/lib/db/repos/quotaKeysRepo.js");
    const { buildUsageReport } = await import("@/lib/db/repos/quotaUsageReport.js");
    const { saveRequestUsage } = await import("@/lib/db/repos/usageRepo.js");
    const { getAdapter } = await import("@/lib/db/driver.js");

    const key = await createQuotaKey({ name: "report", limit: null, limitPeriod: "lifetime" });
    await saveRequestUsage({ provider: "grok-cli", model: "grok-4.5", apiKey: key.key, tokens: { prompt_tokens: 213, completion_tokens: 375 } });

    const db = await getAdapter();
    const report = await buildUsageReport({ ...key, key: key.key }, { isActive: true, allowedModels: [], limit: null, tokensUsed: 0, percent: null, resetAt: null }, db);
    expect(report.totalRequests).toBe(1);
    expect(report.totalTokens.prompt).toBe(213);
    expect(report.totalTokens.completion).toBe(375);
  });
});
