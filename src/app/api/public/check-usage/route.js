import { NextResponse } from "next/server";
import { getQuotaKeyByFullKey, getQuotaKeyProgress } from "@/lib/db/repos/quotaKeysRepo.js";
import { buildUsageReport } from "@/lib/db/repos/quotaUsageReport.js";
import { getAdapter } from "@/lib/db/driver.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { key } = await request.json();
    if (!key || !String(key).startsWith("qsk-")) {
      return NextResponse.json({ keyValid: false, error: "Invalid quota key format" }, { status: 401 });
    }
    const quotaKey = await getQuotaKeyByFullKey(key);
    if (!quotaKey) {
      return NextResponse.json({ keyValid: false, error: "Invalid quota key" }, { status: 401 });
    }
    const progress = await getQuotaKeyProgress(quotaKey.id);
    const db = await getAdapter();
    const report = await buildUsageReport({ ...quotaKey, key }, progress, db);
    return NextResponse.json({ keyValid: true, keyPrefix: key.slice(0, 8) + "…", ...report });
  } catch (error) {
    console.error("check-usage error:", error);
    return NextResponse.json({ keyValid: false, error: "Server error" }, { status: 500 });
  }
}
