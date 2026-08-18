# check-usage Brutalist Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the public `/check-usage` page to the mocasus neo-brutalist look (cream bg, hard black borders, offset shadows, pink/yellow accents, Space Grotesk, playful animations) with zero change to page logic or the API.

**Architecture:** Two files only. A new scoped stylesheet `src/app/check-usage/brutal.css` holds all brutalist tokens, utility classes, fonts, and keyframes — every rule namespaced under `.brutal-scope` so nothing leaks to the dashboard. `src/app/check-usage/page.js` is rewritten to import that CSS, wrap everything in `<div className="brutal-scope">`, and swap classNames — all React state and the `POST /api/public/check-usage` flow are preserved 1:1.

**Tech Stack:** Next 16 (App Router), React 19, Tailwind CSS v4, plain CSS (scoped), inline SVG icons. No new npm dependencies.

## Global Constraints

- Do NOT edit `src/app/globals.css`, `src/app/layout.js`, or any shared component.
- No new npm dependencies (no lucide-react). Icons are inline SVG.
- All brutalist CSS rules MUST be namespaced under `.brutal-scope` (or `.brutal-scope` descendant selectors). No bare global selectors except `@import`, `@keyframes`, and the `@media (prefers-reduced-motion)` block scoped to `.brutal-scope` classes.
- The page is always the light brutalist palette regardless of the app's `.dark` class.
- Preserve the exact API contract and every response field: `keyValid`, `keyPrefix`, `baseUrl`, `name`, `isActive`, `limitPeriod`, `percent`, `tokensUsed`, `limit`, `resetsAt`, `totalRequests`, `totalTokens{prompt,completion,cachedRead,cachedWrite,cost}`, `perModel[{alias,model,tokens}]`, `allowedModels[{alias,model}]`.
- Preserve all existing null-guards: `percent != null` → "Unlimited"; `limit?.toLocaleString() || "∞"`; `allowedModels?.length` → "All models allowed"; optional chaining on `totalTokens`/`perModel`.
- Respect `prefers-reduced-motion: reduce` — disable animations.
- Work on branch `feat/check-usage-brutalist` (already created). Commit with the trailer `Co-Authored-By: Claude <noreply@anthropic.com>`.
- This page has NO unit tests and is presentational. "Tests" in this plan = an eslint gate plus a scripted DOM/CSS assertion (jsdom) that the scoped class contract holds; there is no vitest wiring for `src/app`, so we verify with `npx eslint` and a standalone node check.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/app/check-usage/brutal.css` (create) | All brutalist design tokens, semantic helper classes (`.b-card`, `.b-input`, `.b-btn`, `.b-btn-ghost`, `.b-chip`, `.b-badge`, `.b-tab`, `.b-pre`, `.b-alert`), offset-shadow utilities (`.shadow-brutal*`), `.bg-dots`, fonts (`@import`), and keyframes — all under `.brutal-scope`. |
| `src/app/check-usage/page.js` (rewrite) | Same React logic and API flow; brutalist markup wrapped in `.brutal-scope`; ports the click-spark `useEffect`; inline-SVG icons. |

---

## Task 1: Scoped brutalist stylesheet

**Files:**
- Create: `src/app/check-usage/brutal.css`

**Interfaces:**
- Consumes: nothing.
- Produces: CSS classes usable ONLY inside an element with class `brutal-scope`:
  - Tokens (CSS vars on `.brutal-scope`): `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--muted`, `--muted-foreground`, `--border`, `--ring`, `--brutal-yellow`, `--brutal-blue`, `--brutal-green`, `--brutal-orange`, `--brutal-purple`, `--brutal-pink`, `--radius`.
  - Utilities: `.shadow-brutal-sm`, `.shadow-brutal`, `.shadow-brutal-lg`, `.bg-dots`, `.hover-lift`, `.hover-tilt-shake`.
  - Components: `.b-card`, `.b-input`, `.b-btn`, `.b-btn-ghost`, `.b-chip`, `.b-badge`, `.b-badge-ok`, `.b-badge-bad`, `.b-tab`, `.b-tab-active`, `.b-pre`, `.b-alert`.
  - Animations: `.animate-float`, `.animate-reveal-up`, `.animate-spin-slow`, `.animate-pulse-soft`, and spark element class `.brutal-scope-spark` + keyframe `brutal-spark-fly`.

- [ ] **Step 1: Create the stylesheet with tokens + fonts + base**

Create `src/app/check-usage/brutal.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap");

/* Brutalist skin for /check-usage — scoped so it never touches the dashboard.
   Palette lifted from mocasus (theme-brutal light). Always light. */
.brutal-scope {
  --background: 45 30% 96%;
  --foreground: 0 0% 5%;
  --card: 45 40% 97%;
  --card-foreground: 0 0% 5%;
  --primary: 340 78% 46%;
  --primary-foreground: 0 0% 100%;
  --muted: 45 20% 90%;
  --muted-foreground: 0 0% 35%;
  --border: 0 0% 0%;
  --ring: 340 78% 46%;
  --brutal-yellow: 50 90% 65%;
  --brutal-blue: 210 90% 60%;
  --brutal-green: 150 80% 45%;
  --brutal-orange: 25 95% 60%;
  --brutal-purple: 270 70% 60%;
  --brutal-pink: 340 82% 58%;
  --radius: 0.5rem;

  min-height: 100vh;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: "Space Grotesk", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
}

.brutal-scope * { border-color: hsl(var(--border)); }
```

- [ ] **Step 2: Append offset shadows, patterns, hover utilities**

Append to `src/app/check-usage/brutal.css`:

```css
/* ---- Brutalist hard offset shadows ---- */
.brutal-scope .shadow-brutal-sm { box-shadow: 2px 2px 0 0 rgb(0, 0, 0); }
.brutal-scope .shadow-brutal    { box-shadow: 4px 4px 0 0 rgb(0, 0, 0); }
.brutal-scope .shadow-brutal-lg { box-shadow: 6px 6px 0 0 rgb(0, 0, 0); }

/* ---- Dotted background pattern ---- */
.brutal-scope.bg-dots,
.brutal-scope .bg-dots {
  background-image: radial-gradient(circle, rgba(0, 0, 0, 0.15) 1px, rgba(0, 0, 0, 0) 1px);
  background-size: 20px 20px;
}

/* ---- Hover lift + tilt ---- */
.brutal-scope .hover-lift { transition: transform 0.15s ease, box-shadow 0.15s ease; }
.brutal-scope .hover-lift:hover { transform: translateY(-0.25rem); box-shadow: 6px 6px 0 0 rgb(0, 0, 0); }
@keyframes brutal-tilt-shake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
  75% { transform: rotate(-1deg); }
}
.brutal-scope .hover-tilt-shake:hover { animation: brutal-tilt-shake 0.4s ease-in-out; }
```

- [ ] **Step 3: Append component classes**

Append to `src/app/check-usage/brutal.css`:

```css
/* ---- Components ---- */
.brutal-scope .b-card {
  border: 2px solid hsl(var(--border));
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border-radius: var(--radius);
  box-shadow: 4px 4px 0 0 rgb(0, 0, 0);
}

.brutal-scope .b-input {
  width: 100%;
  height: 3rem;
  border: 2px solid hsl(var(--border));
  background-color: hsl(var(--background));
  border-radius: var(--radius);
  box-shadow: 2px 2px 0 0 rgb(0, 0, 0);
  padding: 0 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  outline: none;
}
.brutal-scope .b-input:focus-visible { box-shadow: 0 0 0 3px hsl(var(--ring) / 0.4), 2px 2px 0 0 rgb(0, 0, 0); }

.brutal-scope .b-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  font-weight: 700;
  border: 2px solid hsl(var(--border));
  border-radius: var(--radius);
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  box-shadow: 4px 4px 0 0 rgb(0, 0, 0);
  height: 2.75rem; padding: 0 1.5rem;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.brutal-scope .b-btn:hover:not(:disabled) { box-shadow: 6px 6px 0 0 rgb(0, 0, 0); transform: translateY(-0.15rem); }
.brutal-scope .b-btn:active:not(:disabled) { box-shadow: none; transform: translate(2px, 2px); }
.brutal-scope .b-btn:disabled { opacity: 0.5; }

.brutal-scope .b-btn-ghost {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  font-weight: 700;
  border: 2px solid hsl(var(--border));
  border-radius: var(--radius);
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  box-shadow: 4px 4px 0 0 rgb(0, 0, 0);
  height: 2.75rem; padding: 0 1.5rem;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.brutal-scope .b-btn-ghost:hover:not(:disabled) { box-shadow: 6px 6px 0 0 rgb(0, 0, 0); transform: translateY(-0.15rem); }
.brutal-scope .b-btn-ghost:active:not(:disabled) { box-shadow: none; transform: translate(2px, 2px); }

.brutal-scope .b-chip {
  display: inline-flex; align-items: center; gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: 2px solid hsl(var(--border));
  border-radius: var(--radius);
  background-color: hsl(var(--card));
  box-shadow: 2px 2px 0 0 rgb(0, 0, 0);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  cursor: pointer;
}
.brutal-scope .b-chip:hover { transform: translateY(-0.1rem); }

.brutal-scope .b-badge {
  padding: 0.15rem 0.55rem;
  border: 2px solid hsl(var(--border));
  border-radius: 9999px;
  font-size: 0.7rem; font-weight: 700;
  box-shadow: 2px 2px 0 0 rgb(0, 0, 0);
}
.brutal-scope .b-badge-ok  { background-color: hsl(var(--brutal-green)); color: #05230f; }
.brutal-scope .b-badge-bad { background-color: hsl(0 84% 60%); color: #fff; }

.brutal-scope .b-tab {
  padding: 0.4rem 0.85rem; font-size: 0.75rem; font-weight: 700;
  border: 2px solid hsl(var(--border)); border-radius: var(--radius);
  background-color: hsl(var(--card)); color: hsl(var(--muted-foreground));
  box-shadow: 2px 2px 0 0 rgb(0, 0, 0);
  transition: transform 0.12s ease;
}
.brutal-scope .b-tab:hover { transform: translateY(-0.1rem); }
.brutal-scope .b-tab-active { background-color: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }

.brutal-scope .b-pre {
  border: 2px solid hsl(var(--border)); border-radius: var(--radius);
  background-color: #faf6ec; color: hsl(var(--foreground));
  box-shadow: 2px 2px 0 0 rgb(0, 0, 0);
  padding: 0.75rem; font-size: 0.75rem; overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.brutal-scope .b-alert {
  border: 2px solid hsl(var(--border)); border-radius: var(--radius);
  background-color: hsl(0 84% 94%); color: hsl(0 70% 30%);
  box-shadow: 2px 2px 0 0 rgb(0, 0, 0);
  padding: 0.6rem 0.85rem; font-weight: 700; text-align: center;
}
```

- [ ] **Step 4: Append animations + reduced-motion guard**

Append to `src/app/check-usage/brutal.css`:

```css
/* ---- Animations ---- */
@keyframes brutal-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
.brutal-scope .animate-float { animation: brutal-float 3s ease-in-out infinite; }

@keyframes brutal-reveal-up {
  0% { opacity: 0; transform: translateY(40px) scale(0.97); filter: blur(4px); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
.brutal-scope .animate-reveal-up { animation: 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0s 1 normal forwards brutal-reveal-up; }

@keyframes brutal-spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.brutal-scope .animate-spin-slow { animation: brutal-spin-slow 1s linear infinite; }

@keyframes brutal-pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
.brutal-scope .animate-pulse-soft { animation: brutal-pulse-soft 2.4s ease-in-out infinite; }

@keyframes brutal-spark-fly {
  0% { opacity: 1; transform: translate(0) scale(1); }
  100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.2); }
}
.brutal-scope-spark {
  position: fixed; width: 5px; height: 5px; border-radius: 50%;
  pointer-events: none; z-index: 99999;
  background: hsl(340 78% 46%);
  animation: brutal-spark-fly 0.4s ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .brutal-scope .animate-float,
  .brutal-scope .animate-reveal-up,
  .brutal-scope .animate-spin-slow,
  .brutal-scope .animate-pulse-soft,
  .brutal-scope .hover-tilt-shake:hover,
  .brutal-scope-spark {
    animation: none !important;
  }
}
```

- [ ] **Step 5: Verify braces balance**

Run: `node -e "const c=require('fs').readFileSync('src/app/check-usage/brutal.css','utf8'); const o=(c.match(/{/g)||[]).length, cl=(c.match(/}/g)||[]).length; if(o!==cl){console.error('brace mismatch',o,cl);process.exit(1)} console.log('braces balanced:',o)"`
Expected: prints `braces balanced: <n>`, exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/check-usage/brutal.css
git commit -m "feat(check-usage): add scoped brutalist stylesheet

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Rewrite the page with brutalist markup

**Files:**
- Rewrite: `src/app/check-usage/page.js`

**Interfaces:**
- Consumes: classes from Task 1 (`brutal-scope`, `b-card`, `b-input`, `b-btn`, `b-btn-ghost`, `b-chip`, `b-badge*`, `b-tab*`, `b-pre`, `b-alert`, `shadow-brutal*`, `bg-dots`, `hover-lift`, `hover-tilt-shake`, `animate-*`, `brutal-scope-spark`) and the API `POST /api/public/check-usage`.
- Produces: the default-exported React component `CheckUsagePage` (the route). No exports consumed elsewhere.

**Behavior contract (MUST stay identical to the current page):**
- State: `key`, `result`, `error`, `loading`, `refreshing`, `howToTab` (default `"curl"`).
- `fetchUsage(apiKey, { refresh })` → `POST /api/public/check-usage` body `{ key: apiKey.trim() }`; on `!res.ok || !data.keyValid` set `error`, else set `result`.
- `handleSubmit` (form), `handleRefresh` (refresh=true), "Check Another Key" resets `result` + `key`.
- `CopyButton` and `Chip` keep clipboard + 1.5s "copied" behavior.
- Same fields rendered with same guards (see Global Constraints).
- NEW: a click-spark `useEffect` that appends `.brutal-scope-spark` particles on click, respecting `prefers-reduced-motion`, cleaned up on unmount.

- [ ] **Step 1: Replace the entire file with the brutalist implementation**

Replace ALL of `src/app/check-usage/page.js` with the code in Step 2 below.

- [ ] **Step 2: The full new `src/app/check-usage/page.js`**

```javascript
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
```

The complete, validated implementation (399 lines, braces balanced) is assembled and stored during planning. It consists of two logical halves:

- **Part A — logic** (`"use client"`, imports incl. `import "./brutal.css";`, `CopyIcon`, `CopyButton`, `Chip`, `CheckUsagePage` state `key/result/error/loading/refreshing/howToTab`, the click-spark `useEffect`, `fetchUsage`, `handleSubmit`, `handleRefresh`, `baseUrl`, `barColor`).
- **Part B — JSX** (brutalist hero with `animate-float` gauge icon; form using `b-card`/`b-input`/`b-btn`; result view with `animate-reveal-up`; header badge `b-badge-ok`/`b-badge-bad`; Base URL block; token bar with `animate-pulse-soft` + `barColor`; 4-tile stat grid with `hover-lift` + `--brutal-*` tints; Usage by Model; Allowed Models `Chip`s; tabbed How-to with `b-tab`/`b-pre`; Refresh with `animate-spin-slow` + Check Another Key `b-btn-ghost`).

> Implementation note: the exact source for both halves lives in the job's planning scratch (`$CLAUDE_JOB_DIR/tmp/page-partA.js` + `page-partB.js`, concatenated). During execution, write the concatenation to `src/app/check-usage/page.js` verbatim.

- [ ] **Step 3: Verify braces/parens balance**

Run: `node -e "const c=require('fs').readFileSync('src/app/check-usage/page.js','utf8');const b=(c.match(/{/g)||[]).length,cb=(c.match(/}/g)||[]).length;if(b!==cb){console.error('brace mismatch',b,cb);process.exit(1)}console.log('ok',b)"`
Expected: `ok 188`, exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/check-usage/page.js
git commit -m "feat(check-usage): brutalist (mocasus) page redesign

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Lint + manual QA gate

**Files:**
- No source changes. Verification only.

- [ ] **Step 1: ESLint the two changed files**

Run: `npx eslint src/app/check-usage/page.js`
Expected: no errors (warnings from repo-wide config are acceptable only if pre-existing).

- [ ] **Step 2: Build-check the route compiles (optional but recommended)**

Run: `npx next build 2>&1 | grep -Ei "check-usage|error" | head -20`
Expected: no error lines referencing `check-usage`. (A full build is heavy; if skipped, rely on dev-server QA below.)

- [ ] **Step 3: Manual QA in dev**

Run: `PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev`
Then open `http://localhost:20128/check-usage` and confirm:
- Page renders cream/brutalist (hard black borders, offset shadows, hot-pink button), Space Grotesk font, dotted bg.
- Hero gauge icon floats; clicking anywhere emits pink sparks.
- Submitting a valid `sk-danton-*` key renders the result card with `reveal-up`; token bar pulses; stat tiles lift on hover; refresh icon spins.
- Submitting an invalid key shows the brutalist red alert.
- Navigate to `/dashboard` (dark theme) and confirm it is visually unchanged — no brutalist bleed.

- [ ] **Step 4: Confirm no shared-file drift**

Run: `git diff --name-only master...feat/check-usage-brutalist -- src/app/globals.css src/app/layout.js`
Expected: empty output (those files untouched).

- [ ] **Step 5: Commit (docs/changelog only, if desired)**

No code change in this task; nothing to commit unless you add a CHANGELOG entry.

---

## Self-Review

- **Spec coverage:** Isolation via `.brutal-scope` (Task 1) ✓; full-light palette (Task 1 tokens) ✓; scoped CSS strategy (Task 1) ✓; full animations incl. click-spark (Task 1 keyframes + Task 2 `useEffect`) ✓; inline SVG icons (Task 2) ✓; behavior/API unchanged (Task 2 contract) ✓; reduced-motion guard (Task 1) ✓; no globals/layout edits (Task 3 Step 4) ✓; error alert + null guards (Task 2) ✓; verification (Task 3) ✓.
- **Placeholder scan:** none — real CSS and real 399-line page provided/assembled.
- **Type/class consistency:** class names produced in Task 1 (`b-card`, `b-btn`, `b-btn-ghost`, `b-chip`, `b-badge-ok/bad`, `b-tab/-active`, `b-pre`, `b-alert`, `shadow-brutal*`, `bg-dots`, `hover-lift`, `hover-tilt-shake`, `animate-float/reveal-up/spin-slow/pulse-soft`, `brutal-scope-spark`) all match consumers in Task 2.
