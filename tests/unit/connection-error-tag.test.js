import { describe, it, expect } from "vitest";
import { getConnectionErrorTag } from "../../src/shared/utils/connectionErrorTag.js";

describe("getConnectionErrorTag", () => {
  it("returns null for falsy connection", () => {
    expect(getConnectionErrorTag(null)).toBe(null);
  });

  it("prioritizes lastErrorType tags", () => {
    expect(getConnectionErrorTag({ lastErrorType: "runtime_error" })).toBe("RUNTIME");
    expect(getConnectionErrorTag({ lastErrorType: "token_expired" })).toBe("AUTH");
    expect(getConnectionErrorTag({ lastErrorType: "upstream_unavailable" })).toBe("5XX");
    expect(getConnectionErrorTag({ lastErrorType: "network_error" })).toBe("NET");
  });

  it("returns numeric errorCode when >= 400", () => {
    expect(getConnectionErrorTag({ errorCode: 429 })).toBe("429");
    expect(getConnectionErrorTag({ errorCode: 500 })).toBe("500");
    expect(getConnectionErrorTag({ errorCode: 200 })).not.toBe("200");
  });

  it("extracts code from lastError message", () => {
    expect(getConnectionErrorTag({ lastError: "HTTP 404 not found" })).toBe("404");
  });

  it("classifies by keyword fallback", () => {
    expect(getConnectionErrorTag({ lastError: "invalid api key" })).toBe("AUTH");
    expect(getConnectionErrorTag({ lastError: "runtime exploded" })).toBe("RUNTIME");
  });

  it("defaults to ERR", () => {
    expect(getConnectionErrorTag({ lastError: "weird thing" })).toBe("ERR");
  });
});
