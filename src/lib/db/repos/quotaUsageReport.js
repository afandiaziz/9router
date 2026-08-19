// src/lib/db/repos/quotaUsageReport.js
import { parseJson } from "../helpers/jsonCol.js";
import { getWindowKey } from "./quotaWindow.js";

// Normalize cached-token fields across providers.
export function parseCachedTokens(tokens) {
  const t = tokens || {};
  const read = t.cache_read_input_tokens
    ?? t.prompt_tokens_details?.cached_tokens
    ?? t.cached_tokens
    ?? 0;
  const write = t.cache_creation_input_tokens ?? 0;
  return { cachedRead: Number(read) || 0, cachedWrite: Number(write) || 0 };
}

export async function buildUsageReport(apiKeyRow, progress, db) {
  const { periodKey, windowStart, resetAt } = getWindowKey(apiKeyRow.limitPeriod);

  // Query usageHistory for this key within current window.
  // A null resetAt means "no upper bound" (lifetime) — comparing against NULL in SQL
  // yields NULL (never true), which would silently return zero rows.
  const rows = db.all(
    `SELECT model, promptTokens, completionTokens, cost, tokens FROM usageHistory
     WHERE apiKey = ? AND timestamp >= ? AND (? IS NULL OR timestamp < ?)`,
    [apiKeyRow.key, windowStart, resetAt, resetAt]
  );

  // Aggregate totals
  let prompt = 0, completion = 0, cachedRead = 0, cachedWrite = 0, cost = 0;
  const perModelMap = {};

  for (const r of rows) {
    prompt += Number(r.promptTokens) || 0;
    completion += Number(r.completionTokens) || 0;
    cost += Number(r.cost) || 0;

    const tokens = parseJson(r.tokens, {});
    const cached = parseCachedTokens(tokens);
    cachedRead += cached.cachedRead;
    cachedWrite += cached.cachedWrite;

    const model = r.model || "unknown";
    if (!perModelMap[model]) {
      perModelMap[model] = { model, tokens: 0 };
    }
    perModelMap[model].tokens += (Number(r.promptTokens) || 0) + (Number(r.completionTokens) || 0);
  }

  // Resolve aliases for per-model display.
  // usageHistory logs the model as routed (often with the provider prefix
  // stripped, e.g. "grok-composer-2.5"), while allowedModels stores the
  // provider-prefixed id ("gcli/grok-composer-2.5"). Match exactly first, then
  // fall back to a slash-boundary suffix match so the alias still resolves.
  // The "/" boundary keeps this precise: "grok-4.5" won't match "grok-4.5-high",
  // and a bare "4.5" won't match "grok-4.5".
  const allowedModels = progress.allowedModels || [];
  const suffixMatch = (allowedModel, logged) =>
    allowedModel === logged ||
    allowedModel.endsWith(`/${logged}`) ||
    logged.endsWith(`/${allowedModel}`);
  const perModel = Object.values(perModelMap).map((m) => {
    const entry =
      allowedModels.find((e) => e.model === m.model) ||
      allowedModels.find((e) => suffixMatch(e.model, m.model));
    return {
      alias: entry?.alias || m.model,
      model: m.model,
      tokens: m.tokens,
    };
  });

  return {
    name: apiKeyRow.name,
    isActive: progress.isActive,
    limit: progress.limit,
    limitPeriod: apiKeyRow.limitPeriod,
    resetsAt: progress.resetAt,
    tokensUsed: progress.tokensUsed,
    percent: progress.percent,
    totalRequests: rows.length,
    totalTokens: {
      prompt,
      completion,
      cachedRead,
      cachedWrite,
      cost: Math.round(cost * 10000) / 10000,
    },
    allowedModels,
    perModel,
  };
}
