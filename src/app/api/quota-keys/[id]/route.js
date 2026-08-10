import { NextResponse } from "next/server";
import { getQuotaKeyById, getQuotaKeyProgress, updateQuotaKey, deleteQuotaKey, toggleQuotaKey } from "@/lib/localDb";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const key = await getQuotaKeyById(id);
    if (!key) {
      return NextResponse.json({ error: "Quota key not found" }, { status: 404 });
    }
    const progress = await getQuotaKeyProgress(id);
    const { key: fullKey, ...rest } = key;
    return NextResponse.json({ ...rest, keyPrefix: fullKey.slice(0, 8) + "…", progress });
  } catch (error) {
    console.error("Error fetching quota key:", error);
    return NextResponse.json({ error: "Failed to fetch quota key" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, limit, limitPeriod, allowedModels, isActive, notes } = body;

    const existing = await getQuotaKeyById(id);
    if (!existing) {
      return NextResponse.json({ error: "Quota key not found" }, { status: 404 });
    }

    const updated = await updateQuotaKey(id, {
      name: name ?? existing.name,
      limit: limit === undefined ? existing.limit : (limit == null || limit === "" ? null : Number(limit)),
      limitPeriod: limitPeriod ?? existing.limitPeriod,
      allowedModels: allowedModels ?? existing.allowedModels,
      isActive: isActive ?? existing.isActive,
      notes: notes ?? existing.notes,
    });

    return NextResponse.json({ key: updated });
  } catch (error) {
    console.error("Error updating quota key:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    const existing = await getQuotaKeyById(id);
    if (!existing) {
      return NextResponse.json({ error: "Quota key not found" }, { status: 404 });
    }

    await toggleQuotaKey(id, isActive);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error toggling quota key:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await deleteQuotaKey(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting quota key:", error);
    return NextResponse.json({ error: "Failed to delete quota key" }, { status: 500 });
  }
}
