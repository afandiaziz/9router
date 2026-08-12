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
  it("matches by real model id, rewrites response id to the alias, preserving metadata", async () => {
    const { filterModelsForQuotaKey } = await import("@/app/api/v1/models/route.js");
    // The full catalog carries real provider/model IDs (gcli/grok-4.5), NOT aliases.
    const all = [
      { id: "gcli/grok-4.5", object: "model", owned_by: "gcli", capabilities: { vision: true } },
      { id: "openai/gpt-4o", object: "model", owned_by: "openai" },
    ];
    const allowed = [{ model: "gcli/grok-4.5", alias: "danton/grok-4.5" }];
    const out = filterModelsForQuotaKey(all, allowed);
    expect(out.length).toBe(1);
    expect(out[0].id).toBe("danton/grok-4.5"); // exposed under the alias
    expect(out[0].owned_by).toBe("gcli"); // catalog metadata preserved
    expect(out[0].capabilities).toEqual({ vision: true });
  });

  it("emits allowed models even when absent from the static catalog (allowlist is authoritative)", async () => {
    const { filterModelsForQuotaKey } = await import("@/app/api/v1/models/route.js");
    // grok-4.5-high is routable (provider registry) but NOT in PROVIDER_MODELS.
    const all = [{ id: "gcli/grok-4.5", object: "model", owned_by: "gcli" }];
    const allowed = [
      { model: "gcli/grok-4.5", alias: "danton/grok-4.5" },
      { model: "gcli/grok-4.5-high", alias: "danton/grok-4.5-high" },
    ];
    const out = filterModelsForQuotaKey(all, allowed);
    expect(out.length).toBe(2);
    expect(out.map((m) => m.id)).toEqual(["danton/grok-4.5", "danton/grok-4.5-high"]);
    // catalog-backed entry keeps owned_by; catalog-absent entry gets a placeholder
    expect(out[0].owned_by).toBe("gcli");
    expect(out[1].owned_by).toBe("quota-key");
  });

  it("falls back to the real model id when no alias is set", async () => {
    const { filterModelsForQuotaKey } = await import("@/app/api/v1/models/route.js");
    const all = [{ id: "gcli/grok-4.5", object: "model", owned_by: "gcli" }];
    const allowed = [{ model: "gcli/grok-4.5" }];
    const out = filterModelsForQuotaKey(all, allowed);
    expect(out.length).toBe(1);
    expect(out[0].id).toBe("gcli/grok-4.5");
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
