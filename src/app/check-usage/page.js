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
    <span
      onClick={copy}
      title={`Click to copy: ${text}`}
      className={`b-chip select-all ${copied ? "b-chip-pop" : ""}`}
    >
      {text}
      <CopyIcon copied={copied} />
    </span>
  );
}

/* Compact number for single-line stat sub rows: 1234 -> "1,234", 351200 -> "351.2K" */
function compactNum(n) {
  const v = n || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return v.toLocaleString();
}

/* ---- Stat card icons (stroke matches brutal.css line weight) ---- */
const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "#000",
  strokeWidth: 2.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const StatIcons = {
  requests: (
    <svg {...iconProps}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  tokens: (
    <svg {...iconProps}>
      <path d="M12 2c-4.42 0-8 1.34-8 3v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5c0-1.66-3.58-3-8-3z" />
      <path d="M4 5c0 1.66 3.58 3 8 3s8-1.34 8-3" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </svg>
  ),
  cached: (
    <svg {...iconProps}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  cost: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 8.5c-.6-1-1.7-1.5-3-1.5-1.8 0-3 .9-3 2.25C9 12.5 15 11 15 14.25 15 15.6 13.8 16.5 12 16.5c-1.3 0-2.4-.5-3-1.5" />
      <path d="M12 5.5v2" />
      <path d="M12 16.5v2" />
    </svg>
  ),
};

function StatCard({ icon, label, value, sub, bg, plate }) {
  return (
    <div className="b-card shadow-brutal hover-lift p-3" style={{ background: bg }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="b-icon-plate" style={{ background: plate }} aria-hidden="true">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="b-stat-label">{label}</p>
          <p className="b-stat-value">{value}</p>
        </div>
      </div>
      {sub && <p className="b-stat-sub">{sub}</p>}
    </div>
  );
}

export default function CheckUsagePage() {
  const [key, setKey] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  const COOKIE_NAME = "qsk";
  const readCookie = (name) => {
    if (typeof document === "undefined") return "";
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  };
  const writeKeyCookie = (val, resetsAt) => {
    if (typeof document === "undefined") return;
    const expires = resetsAt ? new Date(resetsAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(val)}; expires=${expires.toUTCString()}; path=/check-usage; SameSite=Strict`;
  };
  const clearKeyCookie = () => {
    if (typeof document === "undefined") return;
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/check-usage; SameSite=Strict`;
  };

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

  // Auto-fill + auto-load a saved quota key from the cookie (once, on mount).
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/immutability */
  useEffect(() => {
    const saved = readCookie(COOKIE_NAME);
    if (saved) {
      setKey(saved);
      fetchUsage(saved, { fromCookie: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/immutability */

  // Animate the progress bar from 0 to the target percent whenever a result arrives.
  useEffect(() => {
    if (!result) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBarWidth(0);
      return;
    }
    const target = result.percent || 0;
    setBarWidth(0);
    const raf = requestAnimationFrame(() => setBarWidth(target));
    return () => cancelAnimationFrame(raf);
  }, [result]);

  const fetchUsage = async (apiKey, opts = {}) => {
    const isRefresh = opts.refresh || false;
    const fromCookie = opts.fromCookie || false;
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
        // A stale key from the cookie should not keep auto-loading a broken state.
        if (fromCookie) clearKeyCookie();
      } else {
        setResult(data);
        writeKeyCookie(apiKey.trim(), data.resetsAt);
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
      <div className="w-full max-w-3xl py-10">
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
                  <span className="font-bold text-lg" style={{ color: "hsl(var(--primary))" }}>
                    {result.name}
                  </span>
                  <span className="ml-2 font-mono text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {result.keyPrefix}
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
                <div className="b-progress-track">
                  <div
                    className="b-progress-fill"
                    style={{ width: `${barWidth}%`, background: barColor, borderRight: barWidth ? "2px solid #000" : "none" }}
                  />
                </div>
                <p className="text-sm mt-1 font-medium" style={{ color: "hsl(var(--foreground))" }}>
                  {result.tokensUsed?.toLocaleString()} / {result.limit?.toLocaleString() || "∞"} tokens
                </p>
                {result.resetsAt && (
                  <p className="text-xs mt-0.5" style={{ color: "hsl(var(--foreground))" }}>
                    Resets: {new Date(result.resetsAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <StatCard
                  icon={StatIcons.requests}
                  label="Total Requests"
                  value={(result.totalRequests ?? 0).toLocaleString()}
                  sub={`In current ${result.limitPeriod} window`}
                  bg="hsl(var(--brutal-yellow) / 0.55)"
                  plate="hsl(var(--brutal-yellow))"
                />
                <StatCard
                  icon={StatIcons.tokens}
                  label="Total Tokens"
                  value={((result.totalTokens?.prompt || 0) + (result.totalTokens?.completion || 0)).toLocaleString()}
                  sub={`In: ${compactNum(result.totalTokens?.prompt)} | Out: ${compactNum(result.totalTokens?.completion)}`}
                  bg="hsl(var(--brutal-blue) / 0.55)"
                  plate="hsl(var(--brutal-blue))"
                />
                <StatCard
                  icon={StatIcons.cached}
                  label="Cached Tokens"
                  value={(result.totalTokens?.cachedRead || 0).toLocaleString()}
                  sub={`Read: ${compactNum(result.totalTokens?.cachedRead)} | Write: ${compactNum(result.totalTokens?.cachedWrite)}`}
                  bg="hsl(var(--brutal-green) / 0.55)"
                  plate="hsl(var(--brutal-green))"
                />
                <div className="col-span-1 sm:col-span-3">
                  <StatCard
                    icon={StatIcons.cost}
                    label="Est. Cost"
                    value={`$${(result.totalTokens?.cost ?? 0).toFixed(4)}`}
                    bg="hsl(var(--brutal-purple) / 0.55)"
                    plate="hsl(var(--brutal-purple))"
                  />
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
                        </div>
                        <span className="font-mono text-sm">{m.tokens.toLocaleString()} tokens</span>
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
                  clearKeyCookie();
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
