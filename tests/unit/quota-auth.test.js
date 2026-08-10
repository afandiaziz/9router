// tests/unit/quota-auth.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/repos/quotaKeysRepo.js", () => ({
  getQuotaKeyByFullKey: vi.fn(),
}));

vi.mock("@/lib/localDb", () => ({
  validateApiKey: vi.fn(),
}));

describe("isValidApiKey", () => {
  let isValidApiKey;
  let getQuotaKeyByFullKey, validateApiKey;

  beforeEach(async () => {
    vi.resetAllMocks();
    const auth = await import("@/sse/services/auth.js");
    isValidApiKey = auth.isValidApiKey;
    const repo = await import("@/lib/db/repos/quotaKeysRepo.js");
    getQuotaKeyByFullKey = repo.getQuotaKeyByFullKey;
    const localDb = await import("@/lib/localDb");
    validateApiKey = localDb.validateApiKey;
  });

  it("returns null/false for empty", async () => {
    expect(await isValidApiKey(null)).toBe(false);
    expect(await isValidApiKey("")).toBe(false);
  });

  it("accepts active quota key (sk-danton-) without touching apiKeys", async () => {
    getQuotaKeyByFullKey.mockResolvedValue({ id: "1", isActive: true });
    const result = await isValidApiKey("sk-danton-abc123");
    expect(result).toBe(true);
    expect(getQuotaKeyByFullKey).toHaveBeenCalledWith("sk-danton-abc123");
    expect(validateApiKey).not.toHaveBeenCalled();
  });

  it("rejects inactive quota key", async () => {
    getQuotaKeyByFullKey.mockResolvedValue({ id: "1", isActive: false });
    expect(await isValidApiKey("sk-danton-abc123")).toBe(false);
  });

  it("rejects unknown quota key", async () => {
    getQuotaKeyByFullKey.mockResolvedValue(null);
    expect(await isValidApiKey("sk-danton-unknown")).toBe(false);
  });

  it("falls back to validateApiKey for normal keys", async () => {
    validateApiKey.mockResolvedValue(true);
    expect(await isValidApiKey("sk-abcd1234")).toBe(true);
    expect(validateApiKey).toHaveBeenCalledWith("sk-abcd1234");
  });
});
