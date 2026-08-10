// tests/unit/quota-window.test.js
import { describe, it, expect } from "vitest";
import { getWindowKey } from "@/lib/db/repos/quotaWindow.js";

describe("getWindowKey", () => {
  it("daily", () => {
    const w = getWindowKey("daily", new Date("2026-08-10T12:30:00.000Z"));
    expect(w.periodKey).toBe("2026-08-10");
    expect(w.resetAt > w.windowStart).toBe(true);
  });
  it("weekly starts Monday 00:00Z", () => {
    // 2026-08-10 is a Monday (UTC)
    const w = getWindowKey("weekly", new Date("2026-08-10T12:00:00.000Z"));
    expect(w.periodKey).toBe("2026-W33");
    expect(w.windowStart).toBe("2026-08-10T00:00:00.000Z");
  });
  it("monthly", () => {
    const w = getWindowKey("monthly", new Date("2026-08-10T00:00:00.000Z"));
    expect(w.periodKey).toBe("2026-08");
    expect(w.windowStart).toBe("2026-08-01T00:00:00.000Z");
    expect(w.resetAt).toBe("2026-09-01T00:00:00.000Z");
  });
  it("lifetime has no reset", () => {
    const w = getWindowKey("lifetime");
    expect(w.periodKey).toBe("lifetime");
    expect(w.resetAt).toBeNull();
  });
});
