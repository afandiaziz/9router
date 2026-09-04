"use client";

import { useState, useEffect, useRef } from "react";
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
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  ),
  tokens: (
    <svg {...iconProps}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  cached: (
    <svg {...iconProps}>
      <path d="M12 2c-4.42 0-8 1.34-8 3v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5c0-1.66-3.58-3-8-3z" />
      <path d="M4 5c0 1.66 3.58 3 8 3s8-1.34 8-3" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </svg>
  ),
  input: (
    <svg {...iconProps}>
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="3" x2="12" y2="15" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  ),
  output: (
    <svg {...iconProps}>
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  ),
  successes: (
    <svg {...iconProps}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  cacheCreation: (
    <svg {...iconProps}>
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  reasoning: (
    <svg {...iconProps}>
      <path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v.3A3.5 3.5 0 0 0 4.5 15H6a3.5 3.5 0 0 0 3.5 3.5V4.5Z" />
      <path d="M14.5 4.5A3.5 3.5 0 0 1 18 8v.3a3.5 3.5 0 0 1 1.5 6.7H18a3.5 3.5 0 0 1-3.5 3.5V4.5Z" />
      <path d="M9.5 9H7.5M14.5 9h2M9.5 14H7M14.5 14h2.5" />
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

const CAPABILITY_CONFIG = [
  {
    key: "vision",
    label: "Vision (image input)",
    className: "b-cap-vision",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    key: "reasoning",
    label: "Reasoning / thinking",
    className: "b-cap-reasoning",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v.3A3.5 3.5 0 0 0 4.5 15H6a3.5 3.5 0 0 0 3.5 3.5V4.5Z" />
        <path d="M14.5 4.5A3.5 3.5 0 0 1 18 8v.3a3.5 3.5 0 0 1 1.5 6.7H18a3.5 3.5 0 0 1-3.5 3.5V4.5Z" />
        <path d="M9.5 9H7.5M14.5 9h2M9.5 14H7M14.5 14h2.5" />
      </svg>
    ),
  },
  {
    key: "tools",
    label: "Tool calling",
    className: "b-cap-tools",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 9.6 6 7.3 3.7a4 4 0 0 0 5 5L4 17l3 3 8.3-8.3a4 4 0 0 0 5-5L18 9l-2.4-2.4 2.3-2.3a4 4 0 0 0-3.2 2Z" />
      </svg>
    ),
  },
  {
    key: "pdf",
    label: "PDF input",
    className: "b-cap-pdf",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M6 2h8l4 4v16H6z" />
        <path d="M14 2v5h5M8.5 15h7M8.5 18h5" />
      </svg>
    ),
  },
  {
    key: "imageOutput",
    label: "Image output",
    className: "b-cap-imageOutput",
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    ),
  },
  {
    key: "audioInput",
    label: "Audio input",
    className: "b-cap-audioInput",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
      </svg>
    ),
  },
  {
    key: "videoInput",
    label: "Video input",
    className: "b-cap-videoInput",
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="5" width="14" height="14" rx="2" />
        <path d="m17 10 4-2v8l-4-2z" />
      </svg>
    ),
  },
  {
    key: "audioOutput",
    label: "Audio output",
    className: "b-cap-audioOutput",
    icon: (
      <svg viewBox="0 0 24 24">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    ),
  },
];

function ModelCard({ modelItem }) {
  const modelText = typeof modelItem === "string" ? modelItem : (modelItem?.model || "");
  const caps = typeof modelItem === "object" ? (modelItem?.caps || {}) : {};
  const [copied, setCopied] = useState(false);
  const nameRef = useRef(null);
  const [fitSize, setFitSize] = useState(14);

  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(modelText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    const measure = () => {
      let current = 14;
      el.style.setProperty("--fit-size", `${current}px`);
      while (el.scrollWidth > parent.clientWidth && current > 11) {
        current -= 0.5;
        el.style.setProperty("--fit-size", `${current}px`);
      }
      setFitSize(current);
    };

    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(parent);
      return () => ro.disconnect();
    }
  }, [modelText]);

  const activeCaps = CAPABILITY_CONFIG.filter((c) => caps[c.key]);

  return (
    <div className="b-model-card">
      <div className="b-model-head">
        <div
          className="b-model-name-wrapper"
          onClick={copy}
          title={`Click to copy: ${modelText}`}
        >
          <span
            ref={nameRef}
            className={`b-model-name ${copied ? "b-chip-pop" : ""}`}
            style={{ "--fit-size": `${fitSize}px` }}
          >
            {modelText}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="b-copy-btn"
          title={`Copy ${modelText}`}
        >
          {copied ? "✓ Copied" : "Copy"}
          <CopyIcon copied={copied} />
        </button>
      </div>

      {activeCaps.length > 0 && (
        <div className="b-cap-list">
          {activeCaps.map((c) => (
            <span key={c.key} className={`b-cap-chip ${c.className}`}>
              {c.icon}
              {c.label}
            </span>
          ))}
        </div>
      )}
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

  // All Time Usage Stats state from https://dashboard.afandiaziz.dev/api/omniroute/usage-stats
  const [allTimeData, setAllTimeData] = useState(null);
  const [allTimeLoading, setAllTimeLoading] = useState(true);
  const [allTimeError, setAllTimeError] = useState("");

  const fetchAllTimeStats = async () => {
    setAllTimeLoading(true);
    setAllTimeError("");
    try {
      const res = await fetch("https://dashboard.afandiaziz.dev/api/omniroute/usage-stats", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAllTimeData(json);
    } catch (err) {
      setAllTimeError(err?.message || "Failed to load all-time stats");
    } finally {
      setAllTimeLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTimeStats();
  }, []);

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
      <div className="w-full max-w-7xl py-10">
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
          <form onSubmit={handleSubmit} className="b-card shadow-brutal p-6 space-y-4 max-w-xl mx-auto">
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
          <div className="space-y-4 animate-reveal-up">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {/* Sisi Kiri: Quota Sharing (Actions + Card Quota Sharing) */}
              <div className="space-y-4">
                {/* Actions - Full width at the top of left side */}
                <div className="flex gap-3 w-full">
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

                {/* Quota Sharing Outer Card */}
                <div className="b-card shadow-brutal p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Column 1 (Left) */}
                    <div className="space-y-5">
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

                      {/* Stat Cards - Mobile only (shown directly under Token Usage on mobile) */}
                      <div className="block lg:hidden space-y-2">
                        <h3 className="text-sm font-bold">Detail Usage Quota Tokens</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                          <StatCard
                            icon={StatIcons.cost}
                            label="Est. Cost"
                            value={`$${(result.totalTokens?.cost ?? 0).toFixed(4)}`}
                            sub="Estimated token cost"
                            bg="hsl(var(--brutal-purple) / 0.55)"
                            plate="hsl(var(--brutal-purple))"
                          />
                        </div>
                      </div>

                      {/* Allowed Models (directly under Token Usage on desktop) */}
                      {result.allowedModels?.length > 0 ? (
                        <div>
                          <h3 className="text-sm font-bold mb-2">Allowed Models</h3>
                          <p className="text-xs mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                            Click a model name or Copy button to copy.
                          </p>
                          <div className="space-y-2.5">
                            {result.allowedModels.map((m, i) => (
                              <ModelCard key={i} modelItem={m} />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-sm font-bold mb-1">Allowed Models</h3>
                          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                            All models allowed
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Column 2 (Right) */}
                    <div className="space-y-5">
                      {/* Stat Cards - Desktop only (top of right column) */}
                      <div className="hidden lg:block space-y-2">
                        <h3 className="text-sm font-bold">Detail Usage Quota Tokens</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                          <StatCard
                            icon={StatIcons.cost}
                            label="Est. Cost"
                            value={`$${(result.totalTokens?.cost ?? 0).toFixed(4)}`}
                            sub="Estimated token cost"
                            bg="hsl(var(--brutal-purple) / 0.55)"
                            plate="hsl(var(--brutal-purple))"
                          />
                        </div>
                      </div>

                      {/* Usage by Model - sorted descending by (tokens + cached), scrollable max 5 */}
                      {result.perModel?.length > 0 && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold">Usage by Model</h3>
                            <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                              Sorted by total tokens + cached
                            </span>
                          </div>
                          <div className="b-model-usage-list space-y-2">
                            {result.perModel.map((m, i) => (
                              <div key={i} className="b-model-usage-item">
                                <div className="min-w-0 pr-2">
                                  <span className="font-mono text-sm font-bold block truncate" title={m.model}>
                                    {m.model}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono text-sm font-bold block">
                                    {(m.totalWithCached ?? m.tokens).toLocaleString()} total
                                  </span>
                                  <span className="font-mono text-xs block" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Tokens: {m.tokens?.toLocaleString() || 0} · Cached: {m.cachedTokens?.toLocaleString() || 0}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sisi Kanan: Kartu Baru All Time Usage Tokens */}
              <div className="b-card shadow-brutal p-6 space-y-5">
                {/* Header */}
                <div className="flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold text-lg" style={{ color: "hsl(var(--primary))" }}>
                      All Time Usage Tokens
                    </h2>
                    <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                      Aggregated across OmniRoute & 9router
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchAllTimeStats}
                      disabled={allTimeLoading}
                      className="b-chip hover-tilt-shake"
                      title="Refresh All Time Stats"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className={allTimeLoading ? "animate-spin-slow" : ""}
                      >
                        <path d="M23 4v6h-6" />
                        <path d="M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                    </button>
                    <span className="b-badge b-badge-ok">All Time</span>
                  </div>
                </div>

                {allTimeLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse-soft">
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <div key={idx} className="b-card shadow-brutal-sm p-3 h-20 bg-muted/40" />
                    ))}
                  </div>
                ) : allTimeError ? (
                  <div className="space-y-3">
                    <p className="b-alert">{allTimeError}</p>
                    <button type="button" onClick={fetchAllTimeStats} className="b-btn-ghost w-full">
                      Retry Loading All Time Stats
                    </button>
                  </div>
                ) : (
                  (() => {
                    const totals = allTimeData?.totals || allTimeData?.data?.totals || {};
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <StatCard
                          icon={StatIcons.tokens}
                          label="Total Tokens"
                          value={Number(totals.tokens || 0).toLocaleString()}
                          sub="Lifetime processed tokens"
                          bg="hsl(var(--brutal-yellow) / 0.55)"
                          plate="hsl(var(--brutal-yellow))"
                        />
                        <StatCard
                          icon={StatIcons.input}
                          label="Input Tokens"
                          value={Number(totals.input || 0).toLocaleString()}
                          sub="Prompt input tokens"
                          bg="hsl(var(--brutal-blue) / 0.55)"
                          plate="hsl(var(--brutal-blue))"
                        />
                        <StatCard
                          icon={StatIcons.output}
                          label="Output Tokens"
                          value={Number(totals.output || 0).toLocaleString()}
                          sub="Completion output tokens"
                          bg="hsl(var(--brutal-orange) / 0.55)"
                          plate="hsl(var(--brutal-orange))"
                        />
                        <StatCard
                          icon={StatIcons.cached}
                          label="Total Cached"
                          value={Number(totals.cached || 0).toLocaleString()}
                          sub="Total cached prompt tokens"
                          bg="hsl(var(--brutal-green) / 0.55)"
                          plate="hsl(var(--brutal-green))"
                        />
                        <StatCard
                          icon={StatIcons.cached}
                          label="Cache Read"
                          value={Number(totals.cacheRead || 0).toLocaleString()}
                          sub="Cached prompt hits"
                          bg="hsl(var(--brutal-green) / 0.45)"
                          plate="hsl(var(--brutal-green))"
                        />
                        <StatCard
                          icon={StatIcons.cacheCreation}
                          label="Cache Creation"
                          value={Number(totals.cacheCreation || 0).toLocaleString()}
                          sub="Cached write/creation"
                          bg="hsl(var(--brutal-pink) / 0.55)"
                          plate="hsl(var(--brutal-pink))"
                        />
                        <StatCard
                          icon={StatIcons.reasoning}
                          label="Reasoning Tokens"
                          value={Number(totals.reasoning || 0).toLocaleString()}
                          sub="Chain-of-thought tokens"
                          bg="hsl(var(--brutal-yellow) / 0.45)"
                          plate="hsl(var(--brutal-yellow))"
                        />
                        <StatCard
                          icon={StatIcons.requests}
                          label="Total Requests"
                          value={Number(totals.requests || 0).toLocaleString()}
                          sub="Lifetime API calls"
                          bg="hsl(var(--brutal-blue) / 0.45)"
                          plate="hsl(var(--brutal-blue))"
                        />
                        <StatCard
                          icon={StatIcons.successes}
                          label="Successes"
                          value={Number(totals.successes || 0).toLocaleString()}
                          sub="Successful requests"
                          bg="hsl(var(--brutal-green) / 0.55)"
                          plate="hsl(var(--brutal-green))"
                        />
                        <StatCard
                          icon={StatIcons.cost}
                          label="Est. Total Cost"
                          value={`$${Number(totals.cost || 0).toFixed(4)}`}
                          sub="Combined estimated cost"
                          bg="hsl(var(--brutal-purple) / 0.55)"
                          plate="hsl(var(--brutal-purple))"
                        />
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
