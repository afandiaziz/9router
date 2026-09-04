import { describe, it, expect } from "vitest";
import { buildUsageReport } from "@/lib/db/repos/quotaUsageReport.js";

describe("buildUsageReport capabilities enrichment", () => {
  const fakeDb = {
    all: () => [],
  };

  const apiKeyRow = {
    key: "sk-danton-testkey",
    name: "Danton Shared",
    limitPeriod: "monthly",
  };

  it("attaches capabilities to allowedModels when resolveCaps option is provided", async () => {
    const progress = {
      isActive: true,
      limit: 100000,
      tokensUsed: 0,
      percent: 0,
      resetAt: null,
      allowedModels: [
        { model: "google/gemini-3.7-flash", alias: "danton/gemini" },
        { model: "openai/gpt-4o-mini", alias: null },
      ],
    };

    const resolveCaps = (model, alias) => {
      if (model.includes("gemini")) {
        return { vision: true, reasoning: true, tools: true, pdf: true };
      }
      return { vision: true, tools: true };
    };

    const report = await buildUsageReport(apiKeyRow, progress, fakeDb, { resolveCaps });

    expect(report.allowedModels).toEqual([
      {
        model: "danton/gemini",
        rawModel: "google/gemini-3.7-flash",
        caps: { vision: true, reasoning: true, tools: true, pdf: true },
      },
      {
        model: "openai/gpt-4o-mini",
        rawModel: "openai/gpt-4o-mini",
        caps: { vision: true, tools: true },
      },
    ]);
  });

  it("handles legacy string-only allowedModels entries safely", async () => {
    const progress = {
      isActive: true,
      limit: 100000,
      tokensUsed: 0,
      percent: 0,
      resetAt: null,
      allowedModels: ["claude-3-5-sonnet"],
    };

    const resolveCaps = () => ({ vision: true, tools: true });

    const report = await buildUsageReport(apiKeyRow, progress, fakeDb, { resolveCaps });

    expect(report.allowedModels).toEqual([
      {
        model: "claude-3-5-sonnet",
        rawModel: "claude-3-5-sonnet",
        caps: { vision: true, tools: true },
      },
    ]);
  });

  it("returns empty caps object when resolveCaps returns null or is omitted", async () => {
    const progress = {
      isActive: true,
      limit: 100000,
      tokensUsed: 0,
      percent: 0,
      resetAt: null,
      allowedModels: [{ model: "unknown-model", alias: null }],
    };

    const report = await buildUsageReport(apiKeyRow, progress, fakeDb);

    expect(report.allowedModels).toEqual([
      {
        model: "unknown-model",
        rawModel: "unknown-model",
        caps: {},
      },
    ]);
  });
});
