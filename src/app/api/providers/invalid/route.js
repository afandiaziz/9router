import { NextResponse } from "next/server";
import { getInvalidConnections, getProviderNodes } from "@/models";

export const dynamic = "force-dynamic";

const SAFE_FIELDS = [
  "id", "provider", "authType", "name", "email", "displayName",
  "priority", "isActive",
  "testStatus", "lastError", "lastErrorAt", "errorCode", "lastErrorType",
  "lastTested", "createdAt", "updatedAt",
];

const NODE_FIELDS = ["id", "name", "prefix", "type", "apiType", "baseUrl"];

function sanitize(conn) {
  const safe = {};
  for (const f of SAFE_FIELDS) {
    if (conn[f] !== undefined) safe[f] = conn[f];
  }
  return safe;
}

function pickNodeDetails(node) {
  if (!node) return null;
  const out = {};
  for (const f of NODE_FIELDS) {
    if (node[f] !== undefined) out[f] = node[f];
  }
  return out;
}

// GET /api/providers/invalid - List provider connections with errors, grouped
// by provider and bucketed by error tag. Secrets stripped server-side.
// Each provider group is enriched with safe node metadata via providerDetails.
export async function GET() {
  try {
    const data = await getInvalidConnections();
    let nodeById = new Map();
    try {
      const nodesResult = await getProviderNodes();
      // Normalize: the repo returns an array; tolerate a { nodes } shape too.
      const nodes = Array.isArray(nodesResult)
        ? nodesResult
        : (nodesResult?.nodes ?? []);
      nodeById = new Map(nodes.map((node) => [node.id, node]));
    } catch (error) {
      console.warn("Failed to fetch provider nodes for invalid connections:", error);
    }
    data.providers.forEach((p) => {
      p.providerDetails = pickNodeDetails(nodeById.get(p.provider));
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
