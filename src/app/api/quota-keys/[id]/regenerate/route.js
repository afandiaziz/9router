import { NextResponse } from "next/server";
import { getQuotaKeyById, updateQuotaKey, generateQuotaKey } from "@/lib/localDb";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const existing = await getQuotaKeyById(id);
    if (!existing) {
      return NextResponse.json({ error: "Quota key not found" }, { status: 404 });
    }

    const newKey = generateQuotaKey();
    const updated = await updateQuotaKey(id, { key: newKey });
    return NextResponse.json({ key: { ...updated, key: newKey } });
  } catch (error) {
    console.error("Error regenerating quota key:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
