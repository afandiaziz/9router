// tests/unit/quota-enforcement.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the repo imports before importing quotaEnforcement
vi.mock("@/lib/db/repos/quotaKeysRepo.js", () => ({
  getQuotaKeyByFullKey: vi.fn(),
  getQuotaKeyProgress: vi.fn(),
}));

describe("quota enforcement", () => {
  let enforceQuotaKey;
  let getQuotaKeyByFullKey, getQuotaKeyProgress;

  beforeEach(async () => {
    vi.resetAllMocks();
    const mod = await import("@/lib/quotaEnforcement.js");
    enforceQuotaKey = mod.enforceQuotaKey;
    const repo = await import("@/lib/db/repos/quotaKeysRepo.js");
    getQuotaKeyByFullKey = repo.getQuotaKeyByFullKey;
    getQuotaKeyProgress = repo.getQuotaKeyProgress;
  });

  it("401 invalid key", async () => {
    getQuotaKeyByFullKey.mockResolvedValue(null);
    const r = await enforceQuotaKey("sk-danton-abc", { model: "x" }, {});
    expect(r.allowed).toBe(false);
    expect(r.response.status).toBe(401);
  });

  it("401 inactive key", async () => {
    getQuotaKeyByFullKey.mockResolvedValue({ id: "1", isActive: false, allowedModels: [], limit: 100 });
    const r = await enforceQuotaKey("sk-danton-abc", { model: "x" }, {});
    expect(r.allowed).toBe(false);
    expect(r.response.status).toBe(401);
  });

  it("403 model not allowed", async () => {
    getQuotaKeyByFullKey.mockResolvedValue({ id: "1", isActive: true, allowedModels: [{ model: "gcli/grok-4.5", alias: "xai/grok-4.5" }], limit: 100 });
    const r = await enforceQuotaKey("sk-danton-abc", { model: "grok-3" }, {});
    expect(r.allowed).toBe(false);
    expect(r.response.status).toBe(403);
  });

  it("resolves alias and rewrites body", async () => {
    const q = { id: "1", isActive: true, allowedModels: [{ model: "gcli/grok-4.5", alias: "xai/grok-4.5" }], limit: 100, limitPeriod: "monthly" };
    getQuotaKeyByFullKey.mockResolvedValue(q);
    getQuotaKeyProgress.mockResolvedValue({ tokensUsed: 10, percent: 10, resetAt: "2026-09-01T00:00:00.000Z" });
    const body = { model: "xai/grok-4.5" };
    const r = await enforceQuotaKey("sk-danton-abc", body, {});
    expect(r.allowed).toBe(true);
    expect(r.resolvedModel).toBe("gcli/grok-4.5");
  });

  it("429 when over limit", async () => {
    getQuotaKeyByFullKey.mockResolvedValue({ id: "1", isActive: true, allowedModels: [], limit: 100, limitPeriod: "monthly" });
    getQuotaKeyProgress.mockResolvedValue({ tokensUsed: 100, percent: 100, resetAt: "2026-09-01T00:00:00.000Z" });
    const r = await enforceQuotaKey("sk-danton-abc", { model: "x" }, {});
    expect(r.allowed).toBe(false);
    expect(r.response.status).toBe(429);
  });

  it("unlimited skips 429", async () => {
    getQuotaKeyByFullKey.mockResolvedValue({ id: "1", isActive: true, allowedModels: [], limit: null, limitPeriod: "lifetime" });
    const r = await enforceQuotaKey("sk-danton-abc", { model: "x" }, {});
    expect(r.allowed).toBe(true);
    expect(getQuotaKeyProgress).not.toHaveBeenCalled();
  });
});
