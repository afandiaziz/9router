import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("check-usage dual card layout & all-time stats", () => {
  it("contains All Time Usage Tokens card header and dual card layout", () => {
    const pageSrc = readFileSync(new URL("../../src/app/check-usage/page.js", import.meta.url), "utf8");

    expect(pageSrc).toContain("All Time Usage Tokens");
    expect(pageSrc).toContain("https://dashboard.afandiaziz.dev/api/omniroute/usage-stats");
  });

  it("references all 10 totals metrics in all-time section", () => {
    const pageSrc = readFileSync(new URL("../../src/app/check-usage/page.js", import.meta.url), "utf8");

    expect(pageSrc).toContain("cacheCreation");
    expect(pageSrc).toContain("cacheRead");
    expect(pageSrc).toContain("cached");
    expect(pageSrc).toContain("cost");
    expect(pageSrc).toContain("input");
    expect(pageSrc).toContain("output");
    expect(pageSrc).toContain("reasoning");
    expect(pageSrc).toContain("requests");
    expect(pageSrc).toContain("successes");
    expect(pageSrc).toContain("tokens");
  });
});
