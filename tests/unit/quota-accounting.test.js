// tests/unit/quota-accounting.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("applyQuotaIncrement", () => {
  let applyQuotaIncrement;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/lib/db/repos/usageRepo.js");
    applyQuotaIncrement = mod.applyQuotaIncrement;
  });

  it("noop for non-quota key", async () => {
    const result = await applyQuotaIncrement("sk-abc", 100, "2026-08-10T00:00:00.000Z");
    expect(result).toBe(false);
  });

  it("noop for null/undefined key", async () => {
    expect(await applyQuotaIncrement(null, 100)).toBe(false);
    expect(await applyQuotaIncrement(undefined, 100)).toBe(false);
  });

  it("increments for quota key on current window", async () => {
    const mockGetQuotaKeyByFullKey = vi.fn().mockResolvedValue({ id: "9", limitPeriod: "monthly" });
    const mockIncrementQuotaUsage = vi.fn().mockResolvedValue();

    const result = await applyQuotaIncrement("sk-danton-foo", 100, "2026-08-10T00:00:00.000Z", {
      getQuotaKeyByFullKey: mockGetQuotaKeyByFullKey,
      incrementQuotaUsage: mockIncrementQuotaUsage,
    });

    expect(result).toBe(true);
    expect(mockGetQuotaKeyByFullKey).toHaveBeenCalledWith("sk-danton-foo");
    expect(mockIncrementQuotaUsage).toHaveBeenCalledWith("9", "monthly", expect.any(String), expect.any(String), expect.any(String), 100);
  });

  it("returns false when key not found", async () => {
    const mockGetQuotaKeyByFullKey = vi.fn().mockResolvedValue(null);
    const mockIncrementQuotaUsage = vi.fn().mockResolvedValue();

    const result = await applyQuotaIncrement("sk-danton-unknown", 100, "2026-08-10T00:00:00.000Z", {
      getQuotaKeyByFullKey: mockGetQuotaKeyByFullKey,
      incrementQuotaUsage: mockIncrementQuotaUsage,
    });

    expect(result).toBe(false);
    expect(mockIncrementQuotaUsage).not.toHaveBeenCalled();
  });
});
