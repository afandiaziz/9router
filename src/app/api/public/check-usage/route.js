import { NextResponse } from "next/server";
import { getQuotaKeyByFullKey, getQuotaKeyProgress } from "@/lib/db/repos/quotaKeysRepo.js";
import { buildUsageReport } from "@/lib/db/repos/quotaUsageReport.js";
import { getAdapter } from "@/lib/db/driver.js";

export const dynamic = "force-dynamic";

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
    const report = await buildUsageReport({ ...quotaKey, key }, progress, db);
    // Base URL for how-to-use examples — derived from request host.
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    return NextResponse.json({ keyValid: true, keyPrefix: key.slice(0, 8) + "…", baseUrl, ...report });
  } catch (error) {
    console.error("check-usage error:", error);
    return NextResponse.json({ keyValid: false, error: "Server error" }, { status: 500 });
  }
}
