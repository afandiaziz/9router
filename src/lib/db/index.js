// Unified DB interface. Repositories handle individual domain logic.
// This file coordinates exports, migrations, backup, and full import/export.

export { getDb, closeDb, getDriverName, isInMemory } from "./driver.js";
export { runMigrations } from "./migrate.js";
export { backupDatabase, rotateBackups, getBackupList } from "./backup.js";

// Settings
export { getSettings, updateSettings } from "./repos/settingsRepo.js";

// Provider Connections
export {
  getProviderConnections, getProviderConnectionById,
  saveProviderConnection, updateProviderConnection, deleteProviderConnection,
  patchProviderData, getActiveConnectionsByProvider,
} from "./repos/connectionsRepo.js";

// Provider Nodes
export {
  getProviderNodes, getProviderNodeById,
  saveProviderNode, deleteProviderNode,
} from "./repos/nodesRepo.js";

// Proxy Pools
export {
  getProxyPools, getProxyPoolById,
  saveProxyPool, updateProxyPool, deleteProxyPool,
} from "./repos/proxyPoolsRepo.js";

// API Keys
export {
  getApiKeys, getApiKeyById, getApiKeyByValue,
  saveApiKey, deleteApiKey,
} from "./repos/apiKeysRepo.js";

// Combos
export {
  getCombos, getComboById, getComboByName,
  saveCombo, deleteCombo,
} from "./repos/combosRepo.js";

// Aliases (model + custom + mitm)
export {
  getModelAliases, setModelAlias, deleteModelAlias, deleteModelAliasesByProvider,
  getCustomModels, addCustomModel, deleteCustomModel, addCustomModelsBulk,
  getMitmAlias, setMitmAliasAll,
} from "./repos/aliasRepo.js";

// Model capability overrides
export {
  getCapsOverrides, getCapsOverride, setCapsOverride, deleteCapsOverride, setCapsOverridesBulk,
} from "./repos/capsRepo.js";

// Pricing
export {
  getPricing, getPricingForModel, updatePricing, resetPricing, resetAllPricing,
} from "./repos/pricingRepo.js";

// Disabled Models
export {
  getDisabledModels, disableModel, enableModel, isModelDisabled,
} from "./repos/disabledModelsRepo.js";

// Quota Keys
export {
  getQuotaKeys, getQuotaKeyById, getQuotaKeyByValue, getQuotaKeyByFullKey,
  saveQuotaKey, updateQuotaKey, deleteQuotaKey,
} from "./repos/quotaKeysRepo.js";

// Quota Usage (Window counters)
export {
  getQuotaUsage, recordQuotaTokens, getAvailableTokens, isQuotaExhausted,
} from "./repos/quotaWindow.js";

// Usage History (SQLite storage)
export {
  getUsageHistory, getDailyUsage, getUsageSummary, getUsageTopStats,
  insertUsageRecord, updateUsageRecord, parseModelBreakdown,
  ensureUsageHistorySeeded,
} from "./repos/usageRepo.js";

// Quota Usage Report (per-key token tracking)
export {
  getQuotaUsageReport, getQuotaUsageSummary,
  recordQuotaKeyUsage, getActiveQuotaWindowUsage,
} from "./repos/quotaUsageReport.js";

// Request Details (Debugging / Inspection)
export {
  getRequestDetails, getRequestDetailById,
  saveRequestDetail, cleanupOldRequestDetails,
} from "./repos/requestDetailsRepo.js";

import { getDb } from "./driver.js";
import { parseJson, stringifyJson } from "./helpers/jsonCol.js";

/**
 * Export the entire database state as a JSON-serializable object.
 * Used by /api/settings/export and cloud sync.
 */
export async function exportDb() {
  const db = await getDb();
  const metaLifetime = db.get(`SELECT value FROM _meta WHERE key = 'totalRequestsLifetime'`);
  const totalRequestsLifetime = metaLifetime ? Number(metaLifetime.value) : null;
  const out = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: parseJson((db.get(`SELECT data FROM settings WHERE id = 1`) || {}).data, {}),
    connections: db.all(`SELECT * FROM providerConnections`).map((r) => ({ ...r, data: parseJson(r.data, {}) })),
    nodes: db.all(`SELECT * FROM providerNodes`).map((r) => ({ ...r, data: parseJson(r.data, {}) })),
    proxyPools: db.all(`SELECT * FROM proxyPools`).map((r) => ({ ...r, data: parseJson(r.data, {}) })),
    apiKeys: db.all(`SELECT * FROM apiKeys`),
    combos: db.all(`SELECT * FROM combos`).map((r) => ({ ...r, models: parseJson(r.models, []) })),
    modelAliases: {},
    customModels: [],
    mitmAlias: {},
    pricing: {},
    modelCaps: {},
    usageHistory: db.all(`SELECT * FROM usageHistory ORDER BY id ASC`).map((r) => ({
      ...r,
      tokens: parseJson(r.tokens, {}),
      meta: parseJson(r.meta, {}),
    })),
    usageDaily: db.all(`SELECT * FROM usageDaily ORDER BY dateKey ASC`).map((r) => ({
      dateKey: r.dateKey,
      data: parseJson(r.data, {}),
    })),
    usageMeta: {
      totalRequestsLifetime: Number.isFinite(totalRequestsLifetime) ? totalRequestsLifetime : 0,
    },
  };

  for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'modelAliases'`)) out.modelAliases[r.key] = parseJson(r.value);
  for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'customModels'`)) out.customModels.push(parseJson(r.value));
  for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'mitmAlias'`)) out.mitmAlias[r.key] = parseJson(r.value);
  for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'pricing'`)) out.pricing[r.key] = parseJson(r.value);
  for (const r of db.all(`SELECT key, value FROM kv WHERE scope = 'modelCaps'`)) out.modelCaps[r.key] = parseJson(r.value);

  return out;
}

/**
 * Import a full database snapshot, replacing existing content.
 * Wraps everything in a single transaction.
 */
export async function importDb(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
  const db = await getDb();
  const hasUsageHistory = Array.isArray(payload.usageHistory);
  const hasUsageDaily = Array.isArray(payload.usageDaily);

  await db.transaction(() => {
    // Clear existing
    db.run(`DELETE FROM settings`);
    db.run(`DELETE FROM providerConnections`);
    db.run(`DELETE FROM providerNodes`);
    db.run(`DELETE FROM proxyPools`);
    db.run(`DELETE FROM apiKeys`);
    db.run(`DELETE FROM combos`);
    db.run(`DELETE FROM kv WHERE scope IN ('modelAliases', 'customModels', 'mitmAlias', 'pricing', 'modelCaps')`);
    if (hasUsageHistory) db.run(`DELETE FROM usageHistory`);
    if (hasUsageDaily) db.run(`DELETE FROM usageDaily`);

    // Settings
    if (payload.settings) {
      db.run(`INSERT OR REPLACE INTO settings(id, data) VALUES(1, ?)`, [stringifyJson(payload.settings)]);
    }

    // Connections
    for (const c of payload.connections || []) {
      db.run(
        `INSERT OR REPLACE INTO providerConnections(id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.provider, c.authType || "apiKey", c.name || null, c.email || null, c.priority || null, c.isActive !== false ? 1 : 0, stringifyJson(c.data || {}), c.createdAt || new Date().toISOString(), c.updatedAt || new Date().toISOString()]
      );
    }

    // Nodes
    for (const n of payload.nodes || []) {
      db.run(
        `INSERT OR REPLACE INTO providerNodes(id, type, name, data, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`,
        [n.id, n.type || null, n.name || null, stringifyJson(n.data || {}), n.createdAt || new Date().toISOString(), n.updatedAt || new Date().toISOString()]
      );
    }

    // Proxy Pools
    for (const p of payload.proxyPools || []) {
      db.run(
        `INSERT OR REPLACE INTO proxyPools(id, isActive, testStatus, data, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`,
        [p.id, p.isActive !== false ? 1 : 0, p.testStatus || null, stringifyJson(p.data || {}), p.createdAt || new Date().toISOString(), p.updatedAt || new Date().toISOString()]
      );
    }

    // API Keys
    for (const k of payload.apiKeys || []) {
      db.run(
        `INSERT OR REPLACE INTO apiKeys(id, key, name, machineId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, ?)`,
        [k.id, k.key, k.name || null, k.machineId || null, k.isActive !== false ? 1 : 0, k.createdAt || new Date().toISOString()]
      );
    }

    // Combos
    for (const c of payload.combos || []) {
      db.run(
        `INSERT OR REPLACE INTO combos(id, name, kind, models, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`,
        [c.id, c.name, c.kind || null, stringifyJson(c.models || []), c.createdAt || new Date().toISOString(), c.updatedAt || new Date().toISOString()]
      );
    }

    // KV stores
    for (const [alias, target] of Object.entries(payload.modelAliases || {})) {
      db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('modelAliases', ?, ?)`, [alias, stringifyJson(target)]);
    }
    for (const m of payload.customModels || []) {
      const key = `${m.providerAlias}|${m.id}`;
      db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('customModels', ?, ?)`, [key, stringifyJson(m)]);
    }
    for (const [alias, full] of Object.entries(payload.mitmAlias || {})) {
      db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('mitmAlias', ?, ?)`, [alias, stringifyJson(full)]);
    }
    for (const [provider, models] of Object.entries(payload.pricing || {})) {
      db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('pricing', ?, ?)`, [provider, stringifyJson(models || {})]);
    }
    for (const [key, caps] of Object.entries(payload.modelCaps || {})) {
      db.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('modelCaps', ?, ?)`, [key, stringifyJson(caps || {})]);
    }

    if (hasUsageHistory) {
      for (const entry of payload.usageHistory) {
        const tokens = entry.tokens && typeof entry.tokens === "object" ? entry.tokens : {};
        const promptTokens = entry.promptTokens ?? tokens.prompt_tokens ?? tokens.input_tokens ?? 0;
        const completionTokens = entry.completionTokens ?? tokens.completion_tokens ?? tokens.output_tokens ?? 0;
        db.run(
          `INSERT OR REPLACE INTO usageHistory(id, timestamp, provider, model, connectionId, apiKey, endpoint, promptTokens, completionTokens, cost, status, tokens, meta) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            entry.id ?? null, entry.timestamp, entry.provider || null, entry.model || null,
            entry.connectionId || null, entry.apiKey || null, entry.endpoint || null,
            promptTokens, completionTokens, entry.cost || 0, entry.status || "ok",
            stringifyJson(tokens), stringifyJson(entry.meta || {}),
          ]
        );
      }

      const requestedLifetime = Number(payload.usageMeta?.totalRequestsLifetime);
      const totalRequestsLifetime = Number.isFinite(requestedLifetime)
        ? Math.max(0, Math.trunc(requestedLifetime))
        : payload.usageHistory.length;
      db.run(
        `INSERT INTO _meta(key, value) VALUES('totalRequestsLifetime', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [String(totalRequestsLifetime)]
      );
    }

    if (hasUsageDaily) {
      for (const day of payload.usageDaily) {
        db.run(
          `INSERT OR REPLACE INTO usageDaily(dateKey, data) VALUES(?, ?)`,
          [day.dateKey, stringifyJson(day.data || {})]
        );
      }
    }
  });
}