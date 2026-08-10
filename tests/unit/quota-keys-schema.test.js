// tests/unit/quota-keys-schema.test.js
import { describe, it, expect } from "vitest";
import { TABLES, SCHEMA_VERSION } from "@/lib/db/schema";

describe("quota schema", () => {
  it("bumps SCHEMA_VERSION to 2", () => {
    expect(SCHEMA_VERSION).toBe(2);
  });

  it("defines quotaKeys table", () => {
    const t = TABLES.quotaKeys;
    expect(t).toBeDefined();
    expect(t.columns.id).toBe("TEXT PRIMARY KEY");
    expect(t.columns.key).toContain("UNIQUE");
    expect(t.columns.limit).toBe("INTEGER");
    expect(t.columns.limitPeriod).toBe("TEXT");
    expect(t.columns.allowedModels).toBe("TEXT");
  });

  it("defines quotaUsage with composite PK", () => {
    const t = TABLES.quotaUsage;
    expect(t.primaryKey).toBe("PRIMARY KEY (keyId, period, periodKey)");
    expect(t.columns.tokensUsed).toBe("INTEGER DEFAULT 0");
  });
});
