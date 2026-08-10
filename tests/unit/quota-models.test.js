// tests/unit/quota-models.test.js
import { describe, it, expect, vi } from "vitest";

// Mock heavy imports before importing models route
vi.mock("@/lib/db/repos/quotaKeysRepo.js", () => ({
  getQuotaKeyByFullKey: vi.fn(),
}));

vi.mock("@/lib/localDb", () => ({
  getProviderConnections: vi.fn().mockResolvedValue([]),
  getCombos: vi.fn().mockResolvedValue([]),
  getCustomModels: vi.fn().mockResolvedValue([]),
  getModelAliases: vi.fn().mockResolvedValue({}),
  getSettings: vi.fn().mockResolvedValue({ requireApiKey: false }),
}));

vi.mock("@/lib/disabledModelsDb", () => ({
  getDisabledModels: vi.fn().mockResolvedValue({}),
}));

vi.mock("open-sse/services/kiroModels.js", () => ({ resolveKiroModels: vi.fn() }));
vi.mock("open-sse/services/kimchiModels.js", () => ({ resolveKimchiModels: vi.fn() }));
vi.mock("open-sse/services/qoderModels.js", () => ({ resolveQoderModels: vi.fn() }));
vi.mock("open-sse/services/copilotModels.js", () => ({ resolveCopilotModels: vi.fn() }));
vi.mock("open-sse/services/clinepassModels.js", () => ({ resolveClinepassModels: vi.fn() }));
vi.mock("open-sse/services/grokCliModels.js", () => ({ resolveGrokCliModels: vi.fn() }));
vi.mock("open-sse/services/cursorModels.js", () => ({ resolveCursorModels: vi.fn() }));
vi.mock("open-sse/shared/zedAuth.js", () => ({ resolveZedModels: vi.fn() }));
vi.mock("@/sse/services/tokenRefresh", () => ({ updateProviderCredentials: vi.fn() }));
vi.mock("@/lib/network/connectionProxy", () => ({ resolveConnectionProxyConfig: vi.fn() }));

describe("filterModelsForQuotaKey", () => {
  it("maps allowed entries to alias id, drops the rest", async () => {
    const { filterModelsForQuotaKey } = await import("@/app/api/v1/models/route.js");
    const all = [
      { id: "xai/grok-4.5", object: "model", owned_by: "xai" },
      { id: "openai/gpt-4o", object: "model", owned_by: "openai" },
    ];
    const allowed = [{ model: "gcli/grok-4.5", alias: "xai/grok-4.5" }];
    const out = filterModelsForQuotaKey(all, allowed);
    expect(out.length).toBe(1);
    expect(out[0].id).toBe("xai/grok-4.5");
  });

  it("no allowed models → return all", async () => {
    const { filterModelsForQuotaKey } = await import("@/app/api/v1/models/route.js");
    const all = [{ id: "a" }];
    expect(filterModelsForQuotaKey(all, [])).toEqual(all);
  });

  it("null/undefined allowed → return all", async () => {
    const { filterModelsForQuotaKey } = await import("@/app/api/v1/models/route.js");
    const all = [{ id: "a" }];
    expect(filterModelsForQuotaKey(all, null)).toEqual(all);
    expect(filterModelsForQuotaKey(all, undefined)).toEqual(all);
  });
});
