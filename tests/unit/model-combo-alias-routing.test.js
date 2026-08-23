import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getModelAliases: vi.fn(),
  getComboByName: vi.fn(),
  getProviderNodes: vi.fn(),
}));

vi.mock("@/lib/localDb", () => mocks);

const { getModelInfo, resolveComboRoute } = await import("@/sse/services/model.js");

describe("combo alias routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviderNodes.mockResolvedValue([]);
    mocks.getModelAliases.mockResolvedValue({ friendly: "combo/resilient" });
    mocks.getComboByName.mockImplementation(async (name) =>
      name === "resilient"
        ? { name: "resilient", models: ["openai/gpt-4o"] }
        : null
    );
  });

  it("does not reinterpret a normal provider alias target as a combo basename", async () => {
    mocks.getModelAliases.mockResolvedValue({ friendly: "openai/resilient" });

    await expect(resolveComboRoute("friendly")).resolves.toBeNull();
    await expect(getModelInfo("friendly")).resolves.toEqual({
      provider: "openai",
      model: "resilient",
    });
  });

  it("recognizes explicit combo alias targets and returns the canonical combo name", async () => {
    await expect(resolveComboRoute("friendly")).resolves.toEqual({
      name: "resilient",
      models: ["openai/gpt-4o"],
    });
    await expect(getModelInfo("friendly")).resolves.toEqual({
      provider: null,
      model: "resilient",
      comboName: "resilient",
    });
  });
});
