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
    expect(report.perModel[0].alias).toBe("xai/grok-4.5");
    expect(report.perModel[0].tokens).toBe(105);
  });
});
