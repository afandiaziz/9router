import { NextResponse } from "next/server";
import { getQuotaKeys, createQuotaKey, getQuotaKeyProgress } from "@/lib/localDb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const keys = await getQuotaKeys();
    const withProgress = [];
    for (const k of keys) {
      const p = await getQuotaKeyProgress(k.id);
      const { key, ...rest } = k;
      withProgress.push({ ...rest, keyPrefix: key.slice(0, 8) + "…", progress: p });
    }
    return NextResponse.json({ keys: withProgress });
  } catch (error) {
    console.error("Error fetching quota keys:", error);
    return NextResponse.json({ error: "Failed to fetch quota keys" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, limit, limitPeriod, allowedModels, notes } = body;
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const key = await createQuotaKey({
      name,
      limit: limit == null || limit === "" ? null : Number(limit),
      limitPeriod: limitPeriod || "monthly",
      allowedModels: Array.isArray(allowedModels) ? allowedModels : [],
      notes,
    });
    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    console.error("Error creating quota key:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
