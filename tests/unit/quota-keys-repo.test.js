// tests/unit/quota-keys-repo.test.js
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-quota-repo-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  // Force re-import of driver with new DATA_DIR
  await import("@/lib/db/index.js").then(m => m.initDb());
});

afterAll(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("quotaKeysRepo", () => {
  let key;

  it("generateQuotaKey has sk-danton- prefix + 24 hex", async () => {
    const { generateQuotaKey } = await import("@/lib/db/repos/quotaKeysRepo.js");
    const k = generateQuotaKey();
    expect(k.startsWith("sk-danton-")).toBe(true);
    expect(k.length).toBe(10 + 24); // sk-danton- + 24 hex
  });

  it("rejects invalid limitPeriod", async () => {
    const { createQuotaKey } = await import("@/lib/db/repos/quotaKeysRepo.js");
    await expect(createQuotaKey({ name: "x", limit: 5, limitPeriod: "hourly" }))
      .rejects.toThrow("Invalid limitPeriod");
  });

  it("create + get by full key + progress", async () => {
    const { createQuotaKey, getQuotaKeyByFullKey, getQuotaKeyProgress } = await import("@/lib/db/repos/quotaKeysRepo.js");
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
    const { incrementQuotaUsage, getQuotaUsageForWindow, getQuotaKeyProgress } = await import("@/lib/db/repos/quotaKeysRepo.js");
    const { periodKey, windowStart, resetAt } = getWindowKey("monthly");
    await incrementQuotaUsage(key.id, "monthly", periodKey, windowStart, resetAt, 250_000);
    const u = await getQuotaUsageForWindow(key.id, "monthly", periodKey);
    expect(u.tokensUsed).toBe(250_000);
    const progress = await getQuotaKeyProgress(key.id);
    expect(progress.tokensUsed).toBe(250_000);
    expect(progress.percent).toBe(25);
  });

  it("unlimited limit gives null percent", async () => {
    const { createQuotaKey, getQuotaKeyProgress } = await import("@/lib/db/repos/quotaKeysRepo.js");
    const k2 = await createQuotaKey({ name: "unlim", limit: null, limitPeriod: "lifetime" });
    const p = await getQuotaKeyProgress(k2.id);
    expect(p.limit).toBeNull();
    expect(p.percent).toBeNull();
  });

  it("toggle and delete", async () => {
    const { toggleQuotaKey, getQuotaKeyByFullKey, deleteQuotaKey, getQuotaKeyById } = await import("@/lib/db/repos/quotaKeysRepo.js");
    await toggleQuotaKey(key.id, false);
    expect((await getQuotaKeyByFullKey(key.key)).isActive).toBe(false);
    await deleteQuotaKey(key.id);
    expect(await getQuotaKeyById(key.id)).toBeNull();
  });
});
