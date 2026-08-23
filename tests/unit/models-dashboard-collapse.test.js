import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createCollapsedGroupSet } from "../../src/app/(dashboard)/dashboard/models/collapseState.js";

const here = dirname(fileURLToPath(import.meta.url));
const pagePath = join(
  here,
  "../../src/app/(dashboard)/dashboard/models/page.js"
);

describe("Models dashboard initial collapse", () => {
  it("creates a collapsed set from every valid provider key", () => {
    const result = createCollapsedGroupSet([
      { key: "openai" },
      { key: "anthropic" },
      { key: "" },
      {},
    ]);

    expect([...result]).toEqual(["openai", "anthropic"]);
  });

  it("returns a fresh empty set for missing groups", () => {
    expect([...createCollapsedGroupSet()]).toEqual([]);
    expect(createCollapsedGroupSet()).not.toBe(createCollapsedGroupSet());
  });

  it("applies initial collapse once after asynchronous groups exist", () => {
    const source = readFileSync(pagePath, "utf8");

    expect(source).toContain("initialCollapseAppliedRef");
    expect(source).toContain("createCollapsedGroupSet(groups)");
    expect(source).toMatch(/if \(initialCollapseAppliedRef\.current \|\| groups\.length === 0\) return;/);
    expect(source).toContain("initialCollapseAppliedRef.current = true");
  });
});
