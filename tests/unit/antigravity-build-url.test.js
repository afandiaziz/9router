import { describe, expect, it } from "vitest";
import { AntigravityExecutor } from "../../open-sse/executors/antigravity.js";

// Regression: the fork's MITM rewrite (2e854bd4) replaced the executor with a
// thin class that had no buildUrl override, so requests went to the bare host
// https://daily-cloudcode-pa.googleapis.com (no path) and Google answered with
// an HTML 404 page — every /api/models/test on antigravity failed with
// "HTTP 503: [404]: <!DOCTYPE html>". Upstream builds
// `${baseUrl}/v1internal:${action}`; keep that contract.
describe("AntigravityExecutor buildUrl", () => {
  const executor = new AntigravityExecutor();

  it("targets the v1internal streaming endpoint for stream requests", () => {
    const url = executor.buildUrl("gemini-3.6-flash-high", true, 0);
    expect(url).toContain("/v1internal:streamGenerateContent");
    expect(url).toContain("alt=sse");
    expect(url.startsWith("https://")).toBe(true);
  });

  it("targets the v1internal non-streaming endpoint otherwise", () => {
    const url = executor.buildUrl("gemini-3.6-flash-high", false, 0);
    expect(url).toContain("/v1internal:generateContent");
  });

  it("never returns a bare host without a path", () => {
    const url = executor.buildUrl("gemini-3.6-flash-high", true, 0);
    expect(new URL(url).pathname).not.toBe("/");
  });

  it("forces non-streaming generateContent for image models", () => {
    const url = executor.buildUrl("gemini-3.1-flash-image", true, 0);
    expect(url).toContain("/v1internal:generateContent");
    expect(url).not.toContain("streamGenerateContent");
  });
});
