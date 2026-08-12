import { NextResponse } from "next/server";
import { bulkSetConnectionsActive, bulkDeleteConnections, bulkResetConnectionErrors } from "@/models";

export const dynamic = "force-dynamic";

// POST /api/providers/bulk - Atomic bulk action on connections.
// Body: { action: "disable" | "delete" | "reset", ids: string[] }
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.action || !Array.isArray(body.ids) || body.ids.length === 0 || !body.ids.every((id) => typeof id === "string")) {
      return NextResponse.json({ error: "Invalid request: { action: 'disable'|'delete'|'reset', ids: string[] }" }, { status: 400 });
    }
    const ids = body.ids.filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
    }
    if (body.action !== "disable" && body.action !== "delete" && body.action !== "reset") {
      return NextResponse.json({ error: "action must be 'disable', 'delete', or 'reset'" }, { status: 400 });
    }
    const result =
      body.action === "disable"
        ? await bulkSetConnectionsActive(ids, false)
        : body.action === "delete"
          ? await bulkDeleteConnections(ids)
          : await bulkResetConnectionErrors(ids);
    return NextResponse.json(result);
  } catch (error) {
    console.log("Error in bulk provider action:", error);
    return NextResponse.json({ error: "Failed to process bulk action" }, { status: 500 });
  }
}
