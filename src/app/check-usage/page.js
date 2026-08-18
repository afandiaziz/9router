"use client";

import { useState, useEffect } from "react";
import "./brutal.css";

function CopyIcon({ copied }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke={copied ? "#16a34a" : "currentColor"}
      strokeWidth="2"
      className="opacity-70 shrink-0"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
}

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
      className="b-chip hover-tilt-shake"
      title={`Copy ${label || text}`}
    >
      {copied ? "✓ Copied" : "Copy"}
      <CopyIcon copied={copied} />
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
    <span onClick={copy} title={`Click to copy: ${text}`} className="b-chip select-all">
      {text}
      <CopyIcon copied={copied} />
    </span>
  );
}

export default function CheckUsagePage() {
  const [key, setKey] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [howToTab, setHowToTab] = useState("curl");

  // Brutalist click-spark — pink particles on any click within the page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const createSparks = (event) => {
      for (let i = 0; i < 6; i += 1) {
        const angle = (i * 60 + Math.random() * 20 - 10) * (Math.PI / 180);
        const distance = 25 + Math.random() * 20;
        const particle = document.createElement("div");
        particle.className = "brutal-scope-spark";
        particle.style.left = `${event.clientX}px`;
        particle.style.top = `${event.clientY}px`;
        particle.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
        particle.style.setProperty("--ty", `${Math.sin(angle) * distance}px`);
        document.body.appendChild(particle);
        particle.addEventListener("animationend", () => particle.remove(), { once: true });
      }
    };
    document.addEventListener("click", createSparks);
    return () => document.removeEventListener("click", createSparks);
  }, []);

  const fetchUsage = async (apiKey, opts = {}) => {
    const isRefresh = opts.refresh || false;
    if (isRefresh) setRefreshing(true);
    else {
      setLoading(true);
      setResult(null);
    }
    setError("");
    try {
      const res = await fetch("/api/public/check-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: apiKey.trim() }),
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
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetchUsage(key);
  };

  const handleRefresh = () => fetchUsage(key, { refresh: true });

  const baseUrl = result?.baseUrl || "";
  const barColor =
    result?.percent > 90
      ? "hsl(0 84% 55%)"
      : result?.percent > 70
      ? "hsl(var(--brutal-yellow))"
      : "hsl(var(--primary))";

  return (
    <div className="brutal-scope bg-dots flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl py-10">
        {/* Hero */}
        <div className="flex flex-col items-center mb-8">
          <div className="animate-float b-card shadow-brutal mb-4 p-3">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2">
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="M4.93 4.93l2.83 2.83" />
              <path d="M16.24 16.24l2.83 2.83" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-center">Check Quota Usage</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            Enter your quota key to see remaining tokens and usage.
          </p>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="b-card shadow-brutal p-6 space-y-4">
            <div className="relative">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                <circle cx="7.5" cy="15.5" r="5.5" />
                <path d="M21 2l-9.6 9.6" />
                <path d="M15.5 7.5l3 3L22 7l-3-3" />
              </svg>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-danton-xxxxxxxxxxxxxxxx"
                className="b-input"
                style={{ paddingLeft: "2.5rem" }}
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading || !key.trim()} className="b-btn hover-tilt-shake w-full">
              {loading ? "Checking..." : "Check Usage"}
            </button>
            {error && <p className="b-alert">{error}</p>}
          </form>
        ) : (
          <div className="space-y-6 animate-reveal-up">
            <div className="b-card shadow-brutal p-6 space-y-5">
              {/* Header */}
              <div className="flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <span className="font-mono font-bold" style={{ color: "hsl(var(--primary))" }}>
                    {result.keyPrefix}
                  </span>
                  <span className="ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {result.name}
                  </span>
                </div>
                <span className={`b-badge ${result.isActive ? "b-badge-ok" : "b-badge-bad"}`}>
                  {result.isActive ? "Active" : "Disabled"}
                </span>
              </div>

              {/* Base URL */}
              {baseUrl && (
                <div className="b-card shadow-brutal-sm p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Base URL</p>
                    <p className="text-sm font-mono truncate">{baseUrl}/v1</p>
                  </div>
                  <CopyButton text={`${baseUrl}/v1`} label="Base URL" />
                </div>
              )}

              {/* Token usage bar */}
              <div>
                <div className="flex justify-between text-sm mb-1 font-bold">
                  <span>Token Usage ({result.limitPeriod})</span>
                  <span>{result.percent != null ? `${result.percent}%` : "Unlimited"}</span>
                </div>
                <div className="w-full h-4 rounded-md" style={{ border: "2px solid #000", background: "hsl(var(--muted))" }}>
                  <div
                    className="h-full animate-pulse-soft"
                    style={{ width: `${result.percent || 0}%`, background: barColor, borderRight: result.percent ? "2px solid #000" : "none" }}
                  />
                </div>
                <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {result.tokensUsed?.toLocaleString()} / {result.limit?.toLocaleString() || "∞"} tokens
                </p>
                {result.resetsAt && (
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Resets: {new Date(result.resetsAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="b-card shadow-brutal hover-lift p-3" style={{ background: "hsl(var(--brutal-yellow) / 0.25)" }}>
                  <p style={{ color: "hsl(var(--muted-foreground))" }}>Total Requests</p>
                  <p className="text-xl font-bold">{(result.totalRequests ?? 0).toLocaleString()}</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>In current {result.limitPeriod} window</p>
                </div>
                <div className="b-card shadow-brutal hover-lift p-3" style={{ background: "hsl(var(--brutal-blue) / 0.2)" }}>
                  <p style={{ color: "hsl(var(--muted-foreground))" }}>Total Tokens</p>
                  <p className="text-xl font-bold">{((result.totalTokens?.prompt || 0) + (result.totalTokens?.completion || 0)).toLocaleString()}</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>In: {result.totalTokens?.prompt?.toLocaleString()} | Out: {result.totalTokens?.completion?.toLocaleString()}</p>
                </div>
                <div className="b-card shadow-brutal hover-lift p-3" style={{ background: "hsl(var(--brutal-green) / 0.2)" }}>
                  <p style={{ color: "hsl(var(--muted-foreground))" }}>Cached Tokens</p>
                  <p className="text-xl font-bold">{result.totalTokens?.cachedRead?.toLocaleString() || 0}</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Read: {result.totalTokens?.cachedRead?.toLocaleString()} | Write: {result.totalTokens?.cachedWrite?.toLocaleString()}</p>
                </div>
                <div className="b-card shadow-brutal hover-lift p-3 col-span-3" style={{ background: "hsl(var(--brutal-purple) / 0.2)" }}>
                  <p style={{ color: "hsl(var(--muted-foreground))" }}>Est. Cost</p>
                  <p className="text-xl font-bold">${result.totalTokens?.cost?.toFixed(4) || "0.00"}</p>
                </div>
              </div>

              {/* Usage by Model */}
              {result.perModel?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-2">Usage by Model</h3>
                  <div className="space-y-2">
                    {result.perModel.map((m, i) => (
                      <div key={i} className="flex justify-between items-center b-card shadow-brutal-sm p-2">
                        <div>
                          <span className="font-mono text-sm">{m.alias || m.model}</span>
                          {m.alias && m.alias !== m.model && (
                            <span className="text-xs ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>({m.model})</span>
                          )}
                        </div>
                        <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{m.tokens.toLocaleString()} tokens</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allowed Models */}
              {result.allowedModels?.length > 0 ? (
                <div>
                  <h3 className="text-sm font-bold mb-2">Allowed Models</h3>
                  <p className="text-xs mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Click a model to copy its name.</p>
                  <div className="flex flex-wrap gap-2">
                    {result.allowedModels.map((m, i) => (
                      <Chip key={i} text={m.alias || m.model} />
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-bold mb-1">Allowed Models</h3>
                  <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>All models allowed</p>
                </div>
              )}

              {/* How to use — tabbed */}
              {baseUrl && (
                <div>
                  <h3 className="text-sm font-bold mb-2">How to Use</h3>
                  <div className="flex gap-2 mb-3">
                    {[
                      { id: "curl", label: "cURL" },
                      { id: "js", label: "JavaScript" },
                      { id: "models", label: "Models" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setHowToTab(tab.id)}
                        className={`b-tab ${howToTab === tab.id ? "b-tab-active" : ""}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {howToTab === "curl" && (
                    <pre className="b-pre">
{`curl ${baseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${result.keyPrefix}" \\
  -d '{
    "model": "${result.allowedModels?.[0]?.alias || "grok/grok-4.5"}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
                    </pre>
                  )}

                  {howToTab === "js" && (
                    <pre className="b-pre">
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
                  )}

                  {howToTab === "models" && (
                    <pre className="b-pre">
{`curl ${baseUrl}/v1/models \\
  -H "Authorization: Bearer ${result.keyPrefix}"`}
                    </pre>
                  )}

                  <p className="text-xs mt-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Use <span className="font-mono">{result.keyPrefix}</span> as your API key. Access models you are
                    allowed to use under their alias names shown above.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={handleRefresh} disabled={refreshing} className="b-btn flex-1">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={refreshing ? "animate-spin-slow" : ""}
                >
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setKey("");
                }}
                className="b-btn-ghost flex-1"
              >
                Check Another Key
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
