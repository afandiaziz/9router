import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getInvalidConnections: vi.fn(),
  getProviderNodes: vi.fn(),
}));

vi.mock("@/models", () => ({
  getInvalidConnections: mocks.getInvalidConnections,
  getProviderNodes: mocks.getProviderNodes,
}));

const SENSITIVE_KEYS = ["apiKey", "accessToken", "refreshToken", "idToken", "clientSecret", "password"];

function collectStrings(value, acc = []) {
  if (value == null) return acc;
  if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, acc));
    return acc;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([k, v]) => {
      acc.push(k);
      collectStrings(v, acc);
    });
    return acc;
  }
  return acc;
}

describe("GET /api/providers/invalid", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("preserves provider id and exposes only approved node metadata fields", async () => {
    mocks.getInvalidConnections.mockResolvedValue({
      providers: [
        {
          provider: "oc-custom-1",
          total: 1,
          buckets: {
            "auth-invalid": [
              {
                id: "conn-1",
                provider: "oc-custom-1",
                authType: "apikey",
                name: "conn one",
                testStatus: "error",
                lastError: "boom",
                apiKey: "sk-should-not-leak",
                accessToken: "should-not-leak",
              },
            ],
          },
        },
      ],
    });
    mocks.getProviderNodes.mockResolvedValue([
      {
        id: "oc-custom-1",
        name: "Custom One",
        prefix: "oc1",
        type: "openai-compatible",
        apiType: "openai",
        baseUrl: "https://api.example.com",
        apiKey: "node-secret-should-not-leak",
        extraSecret: "should-not-leak",
      },
    ]);

    const { GET } = await import("../../src/app/api/providers/invalid/route.js");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.providers).toHaveLength(1);
    const group = body.providers[0];
    expect(group.provider).toBe("oc-custom-1");
    expect(group.providerDetails).toEqual({
      id: "oc-custom-1",
      name: "Custom One",
      prefix: "oc1",
      type: "openai-compatible",
      apiType: "openai",
      baseUrl: "https://api.example.com",
    });

    const conn = group.buckets["auth-invalid"][0];
    expect(conn.id).toBe("conn-1");
    expect(conn.provider).toBe("oc-custom-1");

    const allKeys = collectStrings(body);
    for (const sensitive of SENSITIVE_KEYS) {
      expect(allKeys).not.toContain(sensitive);
    }
    expect(allKeys).not.toContain("extraSecret");
  });

  it("sets providerDetails to null when no matching node exists", async () => {
    mocks.getInvalidConnections.mockResolvedValue({
      providers: [
        {
          provider: "oc-custom-1",
          total: 1,
          buckets: {
            "auth-invalid": [
              { id: "conn-1", provider: "oc-custom-1", testStatus: "error" },
            ],
          },
        },
      ],
    });
    mocks.getProviderNodes.mockResolvedValue([
      {
        id: "other-node",
        name: "Other",
        prefix: "oth",
        type: "openai-compatible",
        apiType: "openai",
        baseUrl: "https://api.other.com",
      },
    ]);

    const { GET } = await import("../../src/app/api/providers/invalid/route.js");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.providers).toHaveLength(1);
    expect(body.providers[0].provider).toBe("oc-custom-1");
    expect(body.providers[0].providerDetails).toBeNull();
  });

  it("returns 200 with providerDetails null when getProviderNodes rejects", async () => {
    mocks.getInvalidConnections.mockResolvedValue({
      providers: [
        {
          provider: "oc-custom-1",
          total: 1,
          buckets: {
            "auth-invalid": [
              { id: "conn-1", provider: "oc-custom-1", testStatus: "error" },
            ],
          },
        },
      ],
    });
    mocks.getProviderNodes.mockRejectedValue(new Error("nodes db exploded"));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { GET } = await import("../../src/app/api/providers/invalid/route.js");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.providers).toHaveLength(1);
    expect(body.providers[0].provider).toBe("oc-custom-1");
    expect(body.providers[0].providerDetails).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
