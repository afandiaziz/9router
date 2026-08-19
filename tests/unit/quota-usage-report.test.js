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
    const report = await buildUsageReport({ key: "sk-danton-1", name: "f", limitPeriod: "monthly", limit: 200 }, progress, fakeDb);
    expect(report.totalTokens.prompt).toBe(60);
    expect(report.totalTokens.completion).toBe(45);
    expect(report.totalTokens.cachedRead).toBe(3);
    expect(report.totalTokens.cost).toBeCloseTo(0.25);
    expect(report.perModel[0].model).toBe("xai/grok-4.5");
    expect(report.perModel[0].tokens).toBe(105);
  });

  it("resolves alias when usageHistory logs the provider-prefix-stripped model", async () => {
    // Real-world shape: allowedModels store the provider-prefixed id (gcli/…),
    // but usageHistory logs the model with the prefix stripped. The per-model
    // alias must still resolve via the slash-boundary suffix match.
    const fakeDb = {
      all: () => [
        { model: "grok-composer-2.5", promptTokens: 100, completionTokens: 50, cost: 0.1, tokens: "{}" },
      ],
    };
    const progress = {
      tokensUsed: 150, limit: 1000, percent: 15, resetsAt: null, isActive: true,
      allowedModels: [{ model: "gcli/grok-composer-2.5", alias: "danton/composer-2.5" }],
    };
    const report = await buildUsageReport({ key: "sk-danton-2", name: "g", limitPeriod: "monthly", limit: 1000 }, progress, fakeDb);
    expect(report.perModel[0].model).toBe("danton/composer-2.5");
    expect(report.perModel[0].tokens).toBe(150);
  });

  it("does not cross-match different bare names sharing a prefix", async () => {
    // grok-4.5 (logged) must NOT match gcli/grok-4.5-high's alias — bare-name
    // comparison is exact per segment, not substring.
    const fakeDb = {
      all: () => [
        { model: "grok-4.5", promptTokens: 10, completionTokens: 0, cost: 0, tokens: "{}" },
      ],
    };
    const progress = {
      tokensUsed: 10, limit: 1000, percent: 1, resetsAt: null, isActive: true,
      allowedModels: [
        { model: "gcli/grok-4.5-high", alias: "danton/grok-4.5-high" },
        { model: "gcli/grok-4.5", alias: "danton/grok-4.5" },
      ],
    };
    const report = await buildUsageReport({ key: "sk-danton-3", name: "h", limitPeriod: "monthly", limit: 1000 }, progress, fakeDb);
    expect(report.perModel[0].model).toBe("danton/grok-4.5");
  });
});
