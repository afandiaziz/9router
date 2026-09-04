import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getQuotaKeyByFullKey: vi.fn(),
  getQuotaKeyProgress: vi.fn(),
  getAdapter: vi.fn(),
  getCapsOverrides: vi.fn(),
  getComboByName: vi.fn(),
}));

vi.mock("@/lib/db/repos/quotaKeysRepo.js", () => ({
  getQuotaKeyByFullKey: mocks.getQuotaKeyByFullKey,
  getQuotaKeyProgress: mocks.getQuotaKeyProgress,
}));

vi.mock("@/lib/db/driver.js", () => ({
  getAdapter: mocks.getAdapter,
}));

vi.mock("@/lib/db/index.js", () => ({
  getCapsOverrides: mocks.getCapsOverrides,
}));

vi.mock("@/lib/db/repos/combosRepo.js", () => ({
  getComboByName: mocks.getComboByName,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json(body, init = {}) {
      return new Response(JSON.stringify(body), {
        status: init.status || 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  },
}));

describe("POST /api/public/check-usage capabilities resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdapter.mockResolvedValue({ all: () => [] });
    mocks.getCapsOverrides.mockResolvedValue({});
    mocks.getComboByName.mockResolvedValue(null);
    mocks.getQuotaKeyByFullKey.mockResolvedValue({
      id: "quota-1",
      key: "sk-danton-samplekey12345",
      name: "Team Key",
      limitPeriod: "monthly",
    });
  });

  it("resolves capabilities for standard models and combos in allowedModels", async () => {
    mocks.getQuotaKeyProgress.mockResolvedValue({
      isActive: true,
      limit: 50000,
      tokensUsed: 1000,
      percent: 2,
      resetAt: null,
      allowedModels: [
        { model: "google/gemini-2.5-flash", alias: "fast-gemini" },
      ],
    });

    const { POST } = await import("@/app/api/public/check-usage/route.js");
    const req = new Request("http://localhost/api/public/check-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "sk-danton-samplekey12345" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.keyValid).toBe(true);
    expect(body.allowedModels).toHaveLength(1);
    expect(body.allowedModels[0].model).toBe("fast-gemini");
    expect(body.allowedModels[0].caps).toHaveProperty("vision", true);
    expect(body.allowedModels[0].caps).toHaveProperty("reasoning", true);
    expect(body.allowedModels[0].caps).toHaveProperty("tools", true);
  });
});
