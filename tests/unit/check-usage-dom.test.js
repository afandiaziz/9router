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
});
