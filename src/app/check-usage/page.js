"use client";

import { useState } from "react";

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition"
      title={`Copy ${label || text}`}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Chip({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <span
      onClick={copy}
      title={`Click to copy: ${text}`}
      className="px-2 py-1 bg-gray-800 rounded text-xs font-mono cursor-pointer hover:bg-gray-700 border border-transparent hover:border-blue-500 transition select-all inline-flex items-center gap-1"
    >
      {text}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke={copied ? "#4ade80" : "currentColor"}
        strokeWidth="2"
        className="opacity-60 shrink-0"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </span>
  );
}

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

  const baseUrl = result?.baseUrl || "";

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
                placeholder="sk-danton-xxxxxxxxxxxxxxxx"
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

              {/* Base URL */}
              {baseUrl && (
                <div className="bg-gray-800 p-3 rounded flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-1">Base URL</p>
                    <p className="text-sm font-mono truncate">{baseUrl}/v1</p>
                  </div>
                  <CopyButton text={`${baseUrl}/v1`} label="Base URL" />
                </div>
              )}

              {/* Token usage */}
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
                          <span className="font-mono text-sm">{m.alias || m.model}</span>
                          {m.alias && (m.alias !== m.model) && <span className="text-xs text-gray-500 ml-2">({m.model})</span>}
                        </div>
                        <span className="text-sm text-gray-400">{m.tokens.toLocaleString()} tokens</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.allowedModels?.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Allowed Models</h3>
                  <p className="text-xs text-gray-500 mb-2">Click a model to copy its name.</p>
                  <div className="flex flex-wrap gap-2">
                    {result.allowedModels.map((m, i) => (
                      <Chip key={i} text={m.alias || m.model} />
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Allowed Models</h3>
                  <p className="text-sm text-gray-500">All models allowed</p>
                </div>
              )}

              {/* How to use */}
              {baseUrl && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">How to Use</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">OpenAI-compatible chat (curl)</p>
                      <pre className="bg-gray-950 p-3 rounded text-xs overflow-x-auto">
{`curl ${baseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${result.keyPrefix}" \\
  -d '{
    "model": "${result.allowedModels?.[0]?.alias || "grok/grok-4.5"}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">JavaScript (fetch)</p>
                      <pre className="bg-gray-950 p-3 rounded text-xs overflow-x-auto">
{`const res = await fetch("${baseUrl}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${result.keyPrefix}"
  },
  body: JSON.stringify({
    model: "${result.allowedModels?.[0]?.alias || "grok/grok-4.5"}",
    messages: [{ role: "user", content: "Hello!" }]
  })
});
const data = await res.json();`}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">List available models</p>
                      <pre className="bg-gray-950 p-3 rounded text-xs overflow-x-auto">
{`curl ${baseUrl}/v1/models \\
  -H "Authorization: Bearer ${result.keyPrefix}"`}
                      </pre>
                    </div>
                    <p className="text-xs text-gray-500">
                      Use <span className="font-mono">{result.keyPrefix}</span> as your API key. Access models you
                      are allowed to use under their alias names shown above.
                    </p>
                  </div>
                </div>
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
