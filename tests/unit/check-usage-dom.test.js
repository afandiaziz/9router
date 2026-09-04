import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("check-usage source integrity", () => {
  it("includes all 8 requested capabilities with exact required labels", () => {
    const pageSrc = readFileSync(new URL("../../src/app/check-usage/page.js", import.meta.url), "utf8");

    expect(pageSrc).toContain("Vision (image input)");
    expect(pageSrc).toContain("Reasoning / thinking");
    expect(pageSrc).toContain("Tool calling");
    expect(pageSrc).toContain("PDF input");
    expect(pageSrc).toContain("Image output");
    expect(pageSrc).toContain("Audio input");
    expect(pageSrc).toContain("Video input");
    expect(pageSrc).toContain("Audio output");
  });

  it("enforces single-line nowrap rule in brutal.css", () => {
    const cssSrc = readFileSync(new URL("../../src/app/check-usage/brutal.css", import.meta.url), "utf8");

    expect(cssSrc).toContain(".b-model-name");
    expect(cssSrc).toContain("white-space: nowrap;");
  });

  it("implements responsive 2-column grid, adaptive stat cards, and top action buttons", () => {
    const pageSrc = readFileSync(new URL("../../src/app/check-usage/page.js", import.meta.url), "utf8");

    expect(pageSrc).toContain("grid-cols-1 lg:grid-cols-2");
    expect(pageSrc).toContain("b-model-usage-list");
    expect(pageSrc).toContain("block lg:hidden");
    expect(pageSrc).toContain("hidden lg:block");
    expect(pageSrc).toContain("Tokens:");
    expect(pageSrc).toContain("Cached:");
  });

  it("contains 5-model max-height scrollable styles in brutal.css", () => {
    const cssSrc = readFileSync(new URL("../../src/app/check-usage/brutal.css", import.meta.url), "utf8");

    expect(cssSrc).toContain(".b-model-usage-list");
    expect(cssSrc).toContain("max-height: 310px;");
    expect(cssSrc).toContain("overflow-y: auto;");
  });
});
