import { NextResponse } from "next/server";
import { getInvalidConnections } from "@/models";

export const dynamic = "force-dynamic";

function sanitize(conn) {
  const c = { ...conn };
  delete c.apiKey;
  delete c.accessToken;
  delete c.refreshToken;
  delete c.idToken;
  return c;
}

// GET /api/providers/invalid - List provider connections with errors, grouped
// by provider and bucketed by error tag. Secrets stripped server-side.
export async function GET() {
  try {
    const data = await getInvalidConnections();
    data.providers.forEach((p) => {
      Object.keys(p.buckets).forEach((tag) => {
        p.buckets[tag] = p.buckets[tag].map(sanitize);
      });
    });
    return NextResponse.json(data);
  } catch (error) {
    console.log("Error fetching invalid connections:", error);
    return NextResponse.json({ error: "Failed to fetch invalid connections" }, { status: 500 });
  }
}
