import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const verifier = fileURLToPath(
  new URL("../__baseline__/verify-no-regression.mjs", import.meta.url)
);
const tempDirs = [];

function runVerifier(testPath, fullName) {
  const dir = mkdtempSync(join(tmpdir(), "9router-baseline-"));
  tempDirs.push(dir);
  const resultsPath = join(dir, "results.json");
  writeFileSync(
    resultsPath,
    JSON.stringify({
      testResults: [
        {
          name: testPath,
          assertionResults: [{ status: "failed", fullName }],
        },
      ],
    })
  );

  return spawnSync(process.execPath, [verifier, resultsPath], {
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("verify-no-regression path normalization", () => {
  const knownFailure =
    "openaiToClaudeResponse omits empty Read pages tool argument before emitting Claude input deltas";

  it.each([
    "/app/tests/unit/openai-to-claude.test.js",
    "D:/work/9router/tests/unit/openai-to-claude.test.js",
    String.raw`D:\work\9router\tests\unit\openai-to-claude.test.js`,
  ])("recognizes known failures from %s", (testPath) => {
    const result = runVerifier(testPath, knownFailure);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No regression");
  });

  it("reports a normalized test path for a real regression", () => {
    const result = runVerifier(
      "D:/work/9router/tests/unit/new-regression.test.js",
      "new behavior breaks"
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "tests/unit/new-regression.test.js :: new behavior breaks"
    );
    expect(result.stderr).not.toContain("undefined ::");
  });
});
