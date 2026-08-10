"use client";

import { useState } from "react";

export default function CheckUsagePage() {
  const [key, setKey] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/public/check-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.keyValid) {
        setError(data.error || "Invalid quota key");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Failed to fetch usage");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Check Quota Usage</h1>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="qsk-xxxxxxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg font-medium transition"
            >
              {loading ? "Checking..." : "Check Usage"}
            </button>
            {error && <p className="text-red-400 text-center">{error}</p>}
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-mono text-blue-400">{result.keyPrefix}</span>
                  <span className="ml-2 text-gray-400">{result.name}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${result.isActive ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                  {result.isActive ? "Active" : "Disabled"}
                </span>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Token Usage ({result.limitPeriod})</span>
                  <span>{result.percent != null ? `${result.percent}%` : "Unlimited"}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${result.percent > 90 ? "bg-red-500" : result.percent > 70 ? "bg-yellow-500" : "bg-blue-500"}`}
                    style={{ width: `${result.percent || 0}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {result.tokensUsed?.toLocaleString()} / {result.limit?.toLocaleString() || "∞"} tokens
                </p>
                {result.resetsAt && (
                  <p className="text-xs text-gray-500">Resets: {new Date(result.resetsAt).toLocaleString()}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-800 p-3 rounded">
                  <p className="text-gray-400">Total Tokens</p>
                  <p className="text-xl font-bold">{((result.totalTokens?.prompt || 0) + (result.totalTokens?.completion || 0)).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Input: {result.totalTokens?.prompt?.toLocaleString()} | Output: {result.totalTokens?.completion?.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800 p-3 rounded">
                  <p className="text-gray-400">Cached Tokens</p>
                  <p className="text-xl font-bold">{result.totalTokens?.cachedRead?.toLocaleString() || 0}</p>
                  <p className="text-xs text-gray-500">Read: {result.totalTokens?.cachedRead?.toLocaleString()} | Write: {result.totalTokens?.cachedWrite?.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800 p-3 rounded col-span-2">
                  <p className="text-gray-400">Est. Cost</p>
                  <p className="text-xl font-bold">${result.totalTokens?.cost?.toFixed(4) || "0.00"}</p>
                </div>
              </div>

              {result.perModel?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Usage by Model</h3>
                  <div className="space-y-2">
                    {result.perModel.map((m, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-800 p-2 rounded">
                        <div>
                          <span className="font-mono text-sm">{m.alias}</span>
                          {m.alias !== m.model && <span className="text-xs text-gray-500 ml-2">({m.model})</span>}
                        </div>
                        <span className="text-sm text-gray-400">{m.tokens.toLocaleString()} tokens</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.allowedModels?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Allowed Models</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.allowedModels.map((m, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-800 rounded text-xs font-mono">
                        {m.alias || m.model}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.allowedModels?.length === 0 && (
                <p className="text-sm text-gray-500">All models allowed</p>
              )}
            </div>

            <button
              onClick={() => { setResult(null); setKey(""); }}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              Check Another Key
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
