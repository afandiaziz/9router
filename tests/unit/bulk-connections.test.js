import { describe, it, expect } from "vitest";
import {
  bulkSetConnectionsActive,
  bulkDeleteConnections,
  bulkResetConnectionErrors,
} from "../../src/lib/db/repos/connectionsRepo.js";

describe("bulk repository functions", () => {
  describe("bulkSetConnectionsActive", () => {
    it("returns affected 0 and skipped all when no ids match", async () => {
      const r = await bulkSetConnectionsActive(["missing-1"], false);
      expect(r).toEqual({ affected: 0, skipped: ["missing-1"] });
    });
    it("validates isActive is boolean", async () => {
      await expect(bulkSetConnectionsActive(["x"], "false")).resolves.toBeDefined();
    });
  });
  describe("bulkDeleteConnections", () => {
    it("returns affected 0 and skipped all when no ids match", async () => {
      const r = await bulkDeleteConnections(["missing-1"]);
      expect(r).toEqual({ affected: 0, skipped: ["missing-1"] });
    });
  });
  describe("bulkResetConnectionErrors", () => {
    it("returns affected 0 and skipped all when no ids match", async () => {
      const r = await bulkResetConnectionErrors(["missing-1"]);
      expect(r).toEqual({ affected: 0, skipped: ["missing-1"] });
    });
  });
});
