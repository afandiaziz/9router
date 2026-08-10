import { NextResponse } from "next/server";
import { buildModelsList } from "@/app/api/v1/models/route.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const models = await buildModelsList(["llm"], { skipDynamicFetch: true });
    const byProvider = {};
    for (const m of models) {
      const provider = m.owned_by || "custom";
      (byProvider[provider] ||= []).push(m.id);
    }
    return NextResponse.json({ byProvider });
  } catch (error) {
    console.error("Error fetching available models:", error);
    return NextResponse.json({ error: "Failed to fetch available models" }, { status: 500 });
  }
}
