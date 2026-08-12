import { describe, it, expect } from "vitest";
import { isInvalidConnection, getInvalidConnections } from "../../src/lib/db/repos/connectionsRepo.js";

describe("isInvalidConnection", () => {
  it("invalid when lastError is present", () => {
    expect(isInvalidConnection({ lastError: "boom" })).toBe(true);
  });
  it("invalid when testStatus is unhealthy", () => {
    expect(isInvalidConnection({ testStatus: "error" })).toBe(true);
    expect(isInvalidConnection({ testStatus: "expired" })).toBe(true);
    expect(isInvalidConnection({ testStatus: "unavailable" })).toBe(true);
  });
  it("valid when healthy", () => {
    expect(isInvalidConnection({ testStatus: "active", lastError: null })).toBe(false);
    expect(isInvalidConnection({ testStatus: "success" })).toBe(false);
  });
  it("valid (false) for falsy input", () => {
    expect(isInvalidConnection(null)).toBe(false);
    expect(isInvalidConnection(undefined)).toBe(false);
  });
  it("treats null/absent testStatus as NOT invalid (never tested or freshly reset)", () => {
    // This is the contract that lets bulkResetConnectionErrors actually remove
    // a row from the invalid list: reset nulls both lastError and testStatus.
    expect(isInvalidConnection({})).toBe(false);
    expect(isInvalidConnection({ testStatus: null, lastError: null })).toBe(false);
    expect(isInvalidConnection({ testStatus: "", lastError: "" })).toBe(false);
  });
});

describe("getInvalidConnections", () => {
  it("returns a providers array shape even when nothing is invalid", async () => {
    const result = await getInvalidConnections();
    expect(result).toHaveProperty("providers");
    expect(Array.isArray(result.providers)).toBe(true);
    // Every entry must have provider, total, buckets — and total must equal
    // the sum of all bucket array lengths for that provider.
    for (const p of result.providers) {
      expect(p).toHaveProperty("provider");
      expect(p).toHaveProperty("total");
      expect(p).toHaveProperty("buckets");
      const sum = Object.values(p.buckets).reduce((n, arr) => n + arr.length, 0);
      expect(p.total).toBe(sum);
    }
  });
});
