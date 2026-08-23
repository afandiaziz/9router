import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const componentPath = join(
  repoRoot,
  "src/app/(dashboard)/dashboard/combos/ComboManagement.js"
);
const pagePath = join(repoRoot, "src/app/(dashboard)/dashboard/combos/page.js");

describe("shared dashboard combo management", () => {
  it("keeps combo APIs and controls in the reusable component", () => {
    const source = readFileSync(componentPath, "utf8");

    expect(source).toContain("export default function ComboManagement");
    expect(source).toContain('fetch("/api/combos")');
    expect(source).toContain('fetch("/api/providers")');
    expect(source).toContain('fetch("/api/settings")');
    expect(source).toContain("ComboFormModal");
    expect(source).toContain("CapacityAdapterSection");
    expect(source).toContain('value: "fusion"');
  });

  it("keeps the combos route as a thin wrapper", () => {
    const source = readFileSync(pagePath, "utf8");

    expect(source).toContain('import ComboManagement from "./ComboManagement"');
    expect(source).toContain("<ComboManagement />");
    expect(source).not.toContain('fetch("/api/combos")');
    expect(source).not.toContain("function ComboCard");
  });
});
