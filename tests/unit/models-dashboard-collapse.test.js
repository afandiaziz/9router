import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createCollapsedGroupSet,
  getInitialCollapsedGroupSet,
} from "../../src/app/(dashboard)/dashboard/models/collapseState.js";

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

  it("waits for initial loading, includes async groups, and applies only once", () => {
    const staticGroups = [{ key: "openai" }];
    const loadedGroups = [...staticGroups, { key: "custom-provider" }];

    expect(getInitialCollapsedGroupSet({ groups: staticGroups, loading: true })).toBeNull();

    const initial = getInitialCollapsedGroupSet({ groups: loadedGroups, loading: false });
    expect([...initial]).toEqual(["openai", "custom-provider"]);

    initial.delete("openai");
    expect(
      getInitialCollapsedGroupSet({
        groups: [...loadedGroups, { key: "refreshed-provider" }],
        loading: false,
        initialCollapseApplied: true,
      })
    ).toBeNull();
    expect([...initial]).toEqual(["custom-provider"]);
  });

  it("wires loading-aware one-shot collapse into the models page", () => {
    const source = readFileSync(pagePath, "utf8");

    expect(source).toContain("initialCollapseAppliedRef");
    expect(source).toContain("getInitialCollapsedGroupSet({");
    expect(source).toContain("initialCollapseApplied: initialCollapseAppliedRef.current");
    expect(source).toContain("loading,");
    expect(source).toContain("initialCollapseAppliedRef.current = true");
  });
});
