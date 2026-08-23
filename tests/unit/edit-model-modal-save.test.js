import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteModelMutation,
  saveModelAlias,
} from "../../src/app/(dashboard)/dashboard/models/modelMutations.js";

describe("EditModelModal mutations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes the old alias after successfully replacing it", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });

    await saveModelAlias({
      fetchImpl: fetchMock,
      aliasKey: "combo/resilient",
      previousAlias: "old-name",
      nextAlias: "new-name",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/models/alias", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ model: "combo/resilient", alias: "new-name" }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/models/alias?alias=old-name",
      { method: "DELETE" }
    );
  });

  it("does not delete the old alias when creating the replacement fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Alias conflict" }),
    });

    await expect(saveModelAlias({
      fetchImpl: fetchMock,
      aliasKey: "combo/resilient",
      previousAlias: "old-name",
      nextAlias: "new-name",
    })).rejects.toThrow("Alias conflict");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces failed alias, caps, and pricing deletes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Delete rejected" }),
    });

    for (const url of [
      "/api/models/alias?alias=old-name",
      "/api/models/caps?provider=combo&model=resilient",
      "/api/pricing?provider=combo&model=resilient",
    ]) {
      await expect(deleteModelMutation(fetchMock, url, "fallback failure"))
        .rejects.toThrow("Delete rejected");
    }
  });
});
