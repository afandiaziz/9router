import { describe, expect, it } from "vitest";

const legacyDbExports = [
  "getSettings", "updateSettings", "isCloudEnabled", "getCloudUrl",
  "getProviderConnections", "getProviderConnectionById",
  "createProviderConnection", "updateProviderConnection",
  "deleteProviderConnection", "deleteProviderConnectionsByProvider",
  "reorderProviderConnections", "cleanupProviderConnections",
  "getInvalidConnections", "bulkSetConnectionsActive", "bulkDeleteConnections",
  "bulkResetConnectionErrors", "getProviderNodes", "getProviderNodeById",
  "createProviderNode", "updateProviderNode", "deleteProviderNode",
  "getProxyPools", "getProxyPoolById", "createProxyPool", "updateProxyPool",
  "deleteProxyPool", "getApiKeys", "getApiKeyById", "createApiKey",
  "updateApiKey", "deleteApiKey", "validateApiKey", "getCombos",
  "getComboById", "getComboByName", "createCombo", "updateCombo",
  "deleteCombo", "getModelAliases", "setModelAlias", "deleteModelAlias",
  "deleteModelAliasesByProvider", "getCustomModels", "addCustomModel", "addCustomModelsBulk",
  "deleteCustomModel", "getMitmAlias", "setMitmAliasAll", "getPricing",
  "getPricingForModel", "updatePricing", "resetPricing", "resetAllPricing",
  "getDailyConnectionUsage", "generateQuotaKey", "createQuotaKey",
  "getQuotaKeys", "getQuotaKeyById", "getQuotaKeyByFullKey",
  "updateQuotaKey", "toggleQuotaKey", "deleteQuotaKey",
  "getQuotaUsageForWindow", "incrementQuotaUsage", "getQuotaKeyProgress",
  "statsEmitter", "trackPendingRequest", "getActiveRequests",
  "saveRequestUsage", "getUsageHistory", "getUsageStats", "getChartData",
  "appendRequestLog", "getRecentLogs", "saveRequestDetail",
  "getRequestDetails", "getRequestDetailById", "getDistinctProviders",
];

const modelCapsExports = [
  "getCapsOverrides", "getCapsOverride", "setCapsOverride",
  "deleteCapsOverride", "setCapsOverridesBulk",
];

const localDbExports = [
  "getSettings", "updateSettings", "isCloudEnabled", "getCloudUrl",
  "getProviderConnections", "getProviderConnectionById",
  "createProviderConnection", "updateProviderConnection",
  "deleteProviderConnection", "deleteProviderConnectionsByProvider",
  "reorderProviderConnections", "cleanupProviderConnections",
  "getInvalidConnections", "bulkSetConnectionsActive", "bulkDeleteConnections",
  "bulkResetConnectionErrors", "getProviderNodes", "getProviderNodeById",
  "createProviderNode", "updateProviderNode", "deleteProviderNode",
  "getProxyPools", "getProxyPoolById", "createProxyPool", "updateProxyPool",
  "deleteProxyPool", "getApiKeys", "getApiKeyById", "createApiKey",
  "updateApiKey", "deleteApiKey", "validateApiKey", "getCombos",
  "getComboById", "getComboByName", "createCombo", "updateCombo",
  "deleteCombo", "getModelAliases", "setModelAlias", "deleteModelAlias",
  "deleteModelAliasesByProvider", "getCustomModels", "addCustomModel",
  "addCustomModelsBulk", "deleteCustomModel", "getMitmAlias",
  "setMitmAliasAll", "getPricing", "getPricingForModel", "updatePricing",
  "resetPricing", "resetAllPricing", "getDailyConnectionUsage", "exportDb",
  "importDb", "generateQuotaKey", "createQuotaKey", "getQuotaKeys",
  "getQuotaKeyById", "getQuotaKeyByFullKey", "updateQuotaKey",
  "toggleQuotaKey", "deleteQuotaKey", "getQuotaUsageForWindow",
  "incrementQuotaUsage", "getQuotaKeyProgress",
];

const usageDbExports = [
  "statsEmitter", "trackPendingRequest", "getActiveRequests",
  "saveRequestUsage", "getUsageHistory", "getUsageStats", "getChartData",
  "appendRequestLog", "getRecentLogs", "saveRequestDetail",
  "getRequestDetails", "getRequestDetailById",
];

const requestDetailsDbExports = [
  "saveRequestDetail", "getRequestDetails", "getRequestDetailById",
  "getDistinctProviders",
];

describe("database public API", () => {
  it("keeps all route-facing exports available", async () => {
    const db = await import("../../src/lib/db/index.js");
    const localDb = await import("../../src/lib/localDb.js");
    const usageDb = await import("../../src/lib/usageDb.js");
    const requestDetailsDb = await import("../../src/lib/requestDetailsDb.js");

    for (const name of [...legacyDbExports, ...modelCapsExports]) {
      expect(db, `missing DB export: ${name}`).toHaveProperty(name);
    }
    for (const name of [...localDbExports, ...modelCapsExports]) {
      expect(localDb, `missing localDb export: ${name}`).toHaveProperty(name);
    }
    for (const name of usageDbExports) {
      expect(usageDb, `missing usageDb export: ${name}`).toHaveProperty(name);
    }
    for (const name of requestDetailsDbExports) {
      expect(requestDetailsDb, `missing requestDetailsDb export: ${name}`).toHaveProperty(name);
    }
  });
});
