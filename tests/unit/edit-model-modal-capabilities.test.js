import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

describe("model capability editing sources", () => {
  it("offers video input and audio output capability toggles", () => {
    const source = readFileSync(
      join(root, "src/app/(dashboard)/dashboard/models/EditModelModal.js"),
      "utf8"
    );

    expect(source).toContain('["videoInput", "Video input"]');
    expect(source).toContain('["audioOutput", "Audio output"]');
  });

  it("preserves audio and video modalities when selecting hook caps", () => {
    const source = readFileSync(join(root, "src/shared/hooks/useModelCaps.js"), "utf8");

    expect(source).toContain("audioInput: c.audioInput");
    expect(source).toContain("videoInput: c.videoInput");
    expect(source).toContain("audioOutput: c.audioOutput");
  });
});
