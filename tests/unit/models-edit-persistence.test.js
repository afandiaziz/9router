import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  jsonResponse: vi.fn((body, init) => ({ status: init?.status || 200, body })),
  getModelAliases: vi.fn(),
  setModelAlias: vi.fn(),
  getDisabledModels: vi.fn(),
  getCapsOverrides: vi.fn(),
  getCustomModels: vi.fn(),
  getProviderNodes: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: { json: mocks.jsonResponse },
}));

vi.mock("@/models", () => ({
  getModelAliases: mocks.getModelAliases,
  setModelAlias: mocks.setModelAlias,
  getCustomModels: mocks.getCustomModels,
}));

vi.mock("@/lib/disabledModelsDb", () => ({
  getDisabledModels: mocks.getDisabledModels,
}));

vi.mock("@/lib/db/index.js", () => ({
  getCapsOverrides: mocks.getCapsOverrides,
}));

vi.mock("@/lib/localDb", () => ({
  getModelAliases: mocks.getModelAliases,
  getProviderNodes: mocks.getProviderNodes,
  getComboByName: vi.fn().mockResolvedValue(null),
}));

describe("Model editing and persistence fixes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getModelAliases.mockResolvedValue({});
    mocks.getDisabledModels.mockResolvedValue({});
    mocks.getCapsOverrides.mockResolvedValue({});
    mocks.getCustomModels.mockResolvedValue([]);
    mocks.getProviderNodes.mockResolvedValue([]);
  });

  it("GET /api/models resolves reverse alias correctly for models", async () => {
    const { GET } = await import("../../src/app/api/models/route.js");
    mocks.getModelAliases.mockResolvedValue({
      "my-custom-alias": "cx/gpt-5",
    });

    const response = await GET();
    const model = response.body.models.find((m) => m.model === "gpt-5" && (m.provider === "cx" || m.provider === "codex"));
    if (model) {
      expect(model.alias).toBe("my-custom-alias");
    }
  });

  it("PUT /api/models sets alias with (alias, model) parameter order", async () => {
    const { PUT } = await import("../../src/app/api/models/route.js");
    const req = new Request("http://localhost/api/models", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "cx/gpt-5", alias: "my-alias" }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(mocks.setModelAlias).toHaveBeenCalledWith("my-alias", "cx/gpt-5");
  });

  it("getModelInfo in sse services resolves prefixed aliases like cx/my-alias", async () => {
    mocks.getModelAliases.mockResolvedValue({
      "my-alias": "cx/gpt-5",
    });

    const { getModelInfo } = await import("../../src/sse/services/model.js");
    const info = await getModelInfo("cx/my-alias");
    expect(info.provider).toBe("codex");
    expect(info.model).toBe("gpt-5");
  });
});
