import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createCollapsedGroupSet,
  getInitialCollapsedGroupSet,
} from "../../src/app/(dashboard)/dashboard/models/collapseState.js";
import {
  createComboGroup,
  getComboModelPresentation,
} from "../../src/app/(dashboard)/dashboard/models/comboModels.js";

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

  it("projects only LLM combos into a normal Model Combos group", () => {
    const group = createComboGroup([
      { name: "default-combo", models: ["openai/gpt-4o"] },
      { name: "llm-combo", kind: "llm", models: ["openai/gpt-4o"] },
      { name: "image-combo", kind: "image", models: ["openai/gpt-image-1"] },
    ]);

    expect(group).toMatchObject({
      key: "combo",
      providerId: "combo",
      providerAlias: "combo",
      name: "Model Combos",
    });
    expect(group.models).toEqual([
      expect.objectContaining({ key: "combo|default-combo", id: "default-combo", name: "default-combo", isCombo: true, isCustom: false }),
      expect.objectContaining({ key: "combo|llm-combo", id: "llm-combo", name: "llm-combo", isCombo: true, isCustom: false }),
    ]);
  });

  it("uses conservative combo caps and combo metadata keys", () => {
    const row = {
      key: "combo|mixed",
      providerId: "combo",
      providerAlias: "combo",
      id: "mixed",
      name: "mixed",
      isCombo: true,
      isCustom: false,
      models: ["openai/gpt-4o", "anthropic/claude-3-haiku-20240307"],
    };
    const capsOverrides = {
      "openai|gpt-4o": { contextWindow: 128000, vision: true, tools: true },
      "anthropic|claude-3-haiku-20240307": { contextWindow: 200000, vision: false, tools: true },
      "combo|mixed": { contextWindow: 64000, tools: false },
    };
    const presentation = getComboModelPresentation(row, capsOverrides, {
      combo: { mixed: { input: 1, output: 2 } },
    });

    expect(presentation.aliasKey).toBe("combo/mixed");
    expect(presentation.staticCaps.contextWindow).toBe(128000);
    expect(presentation.staticCaps.vision).toBe(false);
    expect(presentation.staticCaps.tools).toBe(true);
    expect(presentation.caps.contextWindow).toBe(64000);
    expect(presentation.caps.tools).toBe(false);
    expect(presentation.override).toEqual({ contextWindow: 64000, tools: false });
    expect(presentation.pricing).toEqual({ input: 1, output: 2 });
  });

  it("does not wire disable or delete actions for combo rows", () => {
    const source = readFileSync(pagePath, "utf8");

    expect(source).toContain("disabled={row.isCombo ? false : isDisabled(row)}");
    expect(source).toContain("onToggleDisabled={row.isCombo ? null");
    expect(source).toContain("onDelete={!row.isCombo && row.isCustom");
    expect(source).toContain("{onToggleDisabled && (");
  });

  it("only declares aria-controls while the provider region is mounted", () => {
    const source = readFileSync(pagePath, "utf8");
    const providerCardSource = source.slice(
      source.indexOf("visibleGroups.map((group) =>"),
      source.indexOf("{editing && (")
    );

    expect(providerCardSource).toContain("aria-expanded={!isCollapsed}");
    expect(providerCardSource).toContain(
      "aria-controls={isCollapsed ? undefined : `models-${group.key}`}"
    );
    expect(providerCardSource).toMatch(
      /\{!isCollapsed && \(\s*<div id=\{`models-\$\{group\.key\}`\}/
    );
  });
});
