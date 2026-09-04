import { describe, it, expect } from "vitest";
import { buildUsageReport } from "@/lib/db/repos/quotaUsageReport.js";

describe("buildUsageReport perModel cached tokens and sorting", () => {
  const apiKeyRow = {
    key: "sk-danton-testkey",
    name: "Danton Team",
    limitPeriod: "monthly",
  };

  it("aggregates cached tokens per model and sorts descending by totalWithCached", async () => {
    const fakeDb = {
      all: () => [
        {
          model: "model-a",
          promptTokens: 100,
          completionTokens: 50,
          cost: 0.001,
          tokens: JSON.stringify({ cache_read_input_tokens: 500 }),
        },
        {
          model: "model-b",
          promptTokens: 200,
          completionTokens: 100,
          cost: 0.002,
          tokens: JSON.stringify({ cache_read_input_tokens: 50 }),
        },
        {
          model: "model-c",
          promptTokens: 50,
          completionTokens: 20,
          cost: 0.0005,
          tokens: JSON.stringify({}),
        },
      ],
    };

    const progress = {
      isActive: true,
      limit: 100000,
      tokensUsed: 0,
      percent: 0,
      resetAt: null,
      allowedModels: [],
    };

    const report = await buildUsageReport(apiKeyRow, progress, fakeDb);

    // model-a: tokens=150, cached=500 -> totalWithCached=650
    // model-b: tokens=300, cached=50  -> totalWithCached=350
    // model-c: tokens=70,  cached=0   -> totalWithCached=70
    expect(report.perModel).toEqual([
      {
        model: "model-a",
        tokens: 150,
        cachedTokens: 500,
        totalWithCached: 650,
      },
      {
        model: "model-b",
        tokens: 300,
        cachedTokens: 50,
        totalWithCached: 350,
      },
      {
        model: "model-c",
        tokens: 70,
        cachedTokens: 0,
        totalWithCached: 70,
      },
    ]);
  });
});
