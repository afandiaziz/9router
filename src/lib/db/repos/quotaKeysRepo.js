// src/lib/db/repos/quotaKeysRepo.js
import { randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { getWindowKey } from "./quotaWindow.js";

export function generateQuotaKey() {
  return "qsk-" + randomBytes(12).toString("hex"); // 24 hex
}

function rowToQuotaKey(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    isActive: row.isActive === 1 || row.isActive === true,
    limit: row.limit == null ? null : Number(row.limit),
    limitPeriod: row.limitPeriod || "monthly",
    allowedModels: parseJson(row.allowedModels, []),
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const VALID_PERIODS = ["daily", "weekly", "monthly", "lifetime"];

export async function createQuotaKey({ name, limit, limitPeriod = "monthly", allowedModels = [], notes }) {
  if (!VALID_PERIODS.includes(limitPeriod)) throw new Error("Invalid limitPeriod");
  const db = await getAdapter();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO quotaKeys(id, key, name, isActive, "limit", limitPeriod, allowedModels, notes, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, generateQuotaKey(), name, 1, limit == null ? null : limit, limitPeriod,
     stringifyJson(allowedModels), notes || null, now, now]
  );
  return { ...rowToQuotaKey(db.get(`SELECT * FROM quotaKeys WHERE id = ?`, [id])), key: db.get(`SELECT key FROM quotaKeys WHERE id = ?`, [id]).key };
}

export async function getQuotaKeys() {
  const db = await getAdapter();
  return db.all(`SELECT * FROM quotaKeys ORDER BY createdAt DESC`).map(rowToQuotaKey);
}

export async function getQuotaKeyById(id) {
  const db = await getAdapter();
  return rowToQuotaKey(db.get(`SELECT * FROM quotaKeys WHERE id = ?`, [id]));
}

export async function getQuotaKeyByFullKey(key) {
  const db = await getAdapter();
  return rowToQuotaKey(db.get(`SELECT * FROM quotaKeys WHERE key = ?`, [key]));
}

export async function updateQuotaKey(id, data) {
  const db = await getAdapter();
  const existing = db.get(`SELECT * FROM quotaKeys WHERE id = ?`, [id]);
  if (!existing) return null;
  const merged = { ...rowToQuotaKey(existing), ...data };
  if (!VALID_PERIODS.includes(merged.limitPeriod)) throw new Error("Invalid limitPeriod");
  db.run(
    `UPDATE quotaKeys SET name = ?, isActive = ?, "limit" = ?, limitPeriod = ?, allowedModels = ?, notes = ?, updatedAt = ? WHERE id = ?`,
    [merged.name, merged.isActive ? 1 : 0, merged.limit, merged.limitPeriod,
     stringifyJson(merged.allowedModels || []), merged.notes, new Date().toISOString(), id]
  );
  return rowToQuotaKey(db.get(`SELECT * FROM quotaKeys WHERE id = ?`, [id]));
}

export async function toggleQuotaKey(id, isActive) {
  const db = await getAdapter();
  db.run(`UPDATE quotaKeys SET isActive = ?, updatedAt = ? WHERE id = ?`, [isActive ? 1 : 0, new Date().toISOString(), id]);
}

export async function deleteQuotaKey(id) {
  const db = await getAdapter();
  db.transaction(() => {
    db.run(`DELETE FROM quotaUsage WHERE keyId = ?`, [id]);
    db.run(`DELETE FROM quotaKeys WHERE id = ?`, [id]);
  });
}

export async function getQuotaUsageForWindow(keyId, period, periodKey) {
  const db = await getAdapter();
  const row = db.get(`SELECT tokensUsed, windowStart, resetAt FROM quotaUsage WHERE keyId = ? AND period = ? AND periodKey = ?`, [keyId, period, periodKey]);
  return row ? { tokensUsed: Number(row.tokensUsed) || 0, windowStart: row.windowStart, resetAt: row.resetAt } : { tokensUsed: 0, windowStart: null, resetAt: null };
}

export async function incrementQuotaUsage(keyId, period, periodKey, windowStart, resetAt, tokens) {
  const db = await getAdapter();
  db.run(
    `INSERT INTO quotaUsage(keyId, period, periodKey, tokensUsed, windowStart, resetAt)
     VALUES(?, ?, ?, ?, ?, ?)
     ON CONFLICT(keyId, period, periodKey) DO UPDATE SET tokensUsed = tokensUsed + excluded.tokensUsed, resetAt = excluded.resetAt`,
    [keyId, period, periodKey, Number(tokens) || 0, windowStart, resetAt]
  );
}

export async function getQuotaKeyProgress(keyId) {
  const db = await getAdapter();
  const keyRow = db.get(`SELECT * FROM quotaKeys WHERE id = ?`, [keyId]);
  if (!keyRow) return null;
  const key = rowToQuotaKey(keyRow);
  const { periodKey, windowStart, resetAt } = getWindowKey(key.limitPeriod);
  const usage = await getQuotaUsageForWindow(keyId, key.limitPeriod, periodKey);
  const tokensUsed = usage.tokensUsed;
  const percent = key.limit == null ? null : Math.min(100, Math.round((tokensUsed / key.limit) * 100));
  return { ...key, tokensUsed, percent, resetAt: resetAt || null, windowStart: usage.windowStart || windowStart };
}
