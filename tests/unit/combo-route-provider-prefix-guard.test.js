import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getModelAliases: vi.fn(),
  getComboByName: vi.fn(),
  getProviderNodes: vi.fn(),
}));

vi.mock("@/lib/localDb", () => mocks);

const { resolveComboRoute, getModelInfo } = await import("@/sse/services/model.js");

// Regression: /api/models/test (and every chat request) must not hijack a
// plain `provider/model` string into a combo just because the part after the
// last "/" collides with a combo name. Upstream guards this with
// `if (modelStr.includes("/")) return null` in getComboModels; the fork's
// resolveComboRoute (8eb5023d) dropped it, so e.g. pinging
// "clinepass/deepseek-v4-flash" rotated the "deepseek-v4-flash" combo and
// tested a different provider entirely (false ok:true).
describe("resolveComboRoute provider-prefix guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getModelAliases.mockResolvedValue({});
    mocks.getProviderNodes.mockResolvedValue([
      { id: "node-wz", prefix: "wz", type: "openai-compatible" },
      { id: "node-untaapi", prefix: "untaapi", type: "openai-compatible" },
    ]);
    mocks.getComboByName.mockImplementation(async (name) =>
      ["deepseek-v4-flash", "kimi-k3", "lordx.1", "glm-5.3"].includes(name)
        ? { name, models: ["qd/kmodel_latest"] }
        : null
    );
  });

  it("does not treat the tail of a registry-provider model as a combo name", async () => {
    // "clinepass" is a built-in registry id; "deepseek-v4-flash" is a combo name.
    await expect(resolveComboRoute("clinepass/deepseek-v4-flash")).resolves.toBeNull();
  });

  it("does not treat the tail of a custom-node model as a combo name", async () => {
    // "wz" is a user-defined provider-node prefix; "kimi-k3" is a combo name.
    await expect(resolveComboRoute("wz/kimi-k3")).resolves.toBeNull();
    await expect(getModelInfo("wz/kimi-k3")).resolves.toMatchObject({
      provider: "node-wz",
      model: "kimi-k3",
    });
  });

  it("still resolves bare combo names (no slash)", async () => {
    await expect(resolveComboRoute("kimi-k3")).resolves.toEqual({
      name: "kimi-k3",
      models: ["qd/kmodel_latest"],
    });
  });

  it("still resolves provider-prefixed combos when the prefix is not a real provider (#3125 intent)", async () => {
    // "openrouter" IS a registry id, so it must NOT resolve to the combo...
    await expect(resolveComboRoute("openrouter/lordx.1")).resolves.toBeNull();
    // ...but an unknown prefix keeps the combo-basename behavior.
    await expect(resolveComboRoute("somegateway/glm-5.3")).resolves.toEqual({
      name: "glm-5.3",
      models: ["qd/kmodel_latest"],
    });
  });

  it("keeps explicit combo/ alias targets working", async () => {
    mocks.getModelAliases.mockResolvedValue({ friendly: "combo/kimi-k3" });
    await expect(resolveComboRoute("friendly")).resolves.toEqual({
      name: "kimi-k3",
      models: ["qd/kmodel_latest"],
    });
  });
});
