// src/lib/quotaEnforcement.js
import { errorResponse } from "open-sse/utils/error.js";
import { getQuotaKeyByFullKey, getQuotaKeyProgress } from "@/lib/db/repos/quotaKeysRepo.js";

/**
 * Enforce quota-sharing key (qsk-*) on incoming chat request.
 * Returns { allowed: true, resolvedModel } on success, or
 * { allowed: false, response: Response } on failure.
 */
export async function enforceQuotaKey(apiKey, body, deps = {}) {
  const getQuota = deps.getQuotaKeyByFullKey || getQuotaKeyByFullKey;
  const quota = await getQuota(apiKey);
  if (!quota || !quota.isActive) {
    return { allowed: false, response: errorResponse(401, "Invalid or inactive quota key") };
  }

  // resolve model
  const allowed = quota.allowedModels; // [{model, alias}]
  let resolved = null;
  if (allowed.length === 0) {
    resolved = body.model;
  } else {
    const hit = allowed.find((e) =>
      (e.alias && e.alias === body.model) || e.model === body.model);
    if (!hit) {
      return { allowed: false, response: errorResponse(403, "Model not allowed for this quota key") };
    }
    resolved = hit.model;
  }

  // quota check
  if (quota.limit != null) {
    const progress = await (deps.getQuotaKeyProgress || getQuotaKeyProgress)(quota.id);
    if (progress && progress.tokensUsed >= quota.limit) {
      const retryAfterSec = progress.resetAt ? Math.max(Math.ceil((new Date(progress.resetAt).getTime() - Date.now()) / 1000), 1) : null;
      return { allowed: false, response: errorResponse(429, `Quota exceeded for this key${progress.resetAt ? `, resets ${progress.resetAt}` : ""}`), resetsAt: progress.resetAt, retryAfterSec };
    }
  }
  return { allowed: true, resolvedModel: resolved };
}
