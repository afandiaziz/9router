import { NextResponse } from "next/server";
import { getQuotaKeyByFullKey, getQuotaKeyProgress } from "@/lib/db/repos/quotaKeysRepo.js";
import { buildUsageReport } from "@/lib/db/repos/quotaUsageReport.js";
import { getAdapter } from "@/lib/db/driver.js";
import { getCapsOverrides } from "@/lib/db/index.js";
import { getComboByName } from "@/lib/db/repos/combosRepo.js";
import {
  getCapabilitiesForModel,
  getConservativeComboCapabilities,
} from "open-sse/providers/capabilities.js";

export const dynamic = "force-dynamic";

const RELEVANT_CAPS = [
  "vision",
  "reasoning",
  "tools",
  "pdf",
  "imageOutput",
  "audioInput",
  "videoInput",
  "audioOutput",
];

function pickCaps(c) {
  const out = {};
  for (const k of RELEVANT_CAPS) {
    if (c?.[k]) out[k] = true;
  }
  return out;
}

export async function POST(request) {
  try {
    const { key } = await request.json();
    if (!key || !String(key).startsWith("sk-danton-")) {
      return NextResponse.json({ keyValid: false, error: "Invalid quota key format" }, { status: 401 });
    }
    const quotaKey = await getQuotaKeyByFullKey(key);
    if (!quotaKey) {
      return NextResponse.json({ keyValid: false, error: "Invalid quota key" }, { status: 401 });
    }
    const progress = await getQuotaKeyProgress(quotaKey.id);
    const db = await getAdapter();
    const overrides = (await getCapsOverrides().catch(() => ({}))) || {};

    const resolveCaps = async (rawModel) => {
      if (!rawModel) return {};

      // 1. Check if model is a combo
      const combo = await getComboByName(rawModel).catch(() => null);
      if (combo?.models?.length) {
        return pickCaps(getConservativeComboCapabilities(combo.models));
      }

      // 2. Resolve provider and model identifier
      let provider = "";
      let model = rawModel;
      if (rawModel.includes("/")) {
        const parts = rawModel.split("/");
        provider = parts[0];
        model = parts.slice(1).join("/");
      }

      // 3. Check overrides (exact provider|model or alias|model)
      const override = overrides[`${provider}|${model}`] || overrides[rawModel] || overrides[model];
      const baseCaps = getCapabilitiesForModel(provider, model);
      return pickCaps({ ...baseCaps, ...(override || {}) });
    };

    const report = await buildUsageReport({ ...quotaKey, key }, progress, db, { resolveCaps });

    // Base URL for how-to-use examples — prefer forwarded headers (reverse-proxy aware).
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const baseUrl = host ? `${proto}://${host}` : new URL(request.url).origin;
    // keyPrefix: sk-danton- + 4 chars after prefix + ellipsis
    const keyPrefix = key.startsWith("sk-danton-")
      ? "sk-danton-" + key.slice("sk-danton-".length, "sk-danton-".length + 4) + "…"
      : key.slice(0, 8) + "…";

    return NextResponse.json({ keyValid: true, keyPrefix, baseUrl, ...report });
  } catch (error) {
    console.error("check-usage error:", error);
    return NextResponse.json({ keyValid: false, error: "Server error" }, { status: 500 });
  }
}
