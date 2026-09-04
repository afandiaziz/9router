# Check-Usage 2-Column Layout & Model Usage Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the `/check-usage` page into a responsive 2-column layout housed within a single outer card (`b-card shadow-brutal p-6`), sort "Usage by Model" descending by `(tokens + cachedTokens)` with detailed breakdown and 5-model max-height scroll, position action buttons at the full-width top, and place stat cards beneath the progress bar on mobile while keeping them at the top of the right column on desktop.

**Architecture:** Update `quotaUsageReport.js` to aggregate `cachedTokens` and calculate `totalWithCached` per model and sort descending. Restructure `CheckUsagePage` in `src/app/check-usage/page.js` to place action buttons above the main card, wrap content in a 2-column desktop grid (`lg:grid-cols-2`), render Stat Cards adaptively (`block lg:hidden` below progress bar on mobile, `hidden lg:block` at top of right column on desktop), and add a 5-model scroll container with brutalist scrollbars in `brutal.css`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS / brutal.css, SQLite, Vitest.

## Global Constraints

- Exactly one main outer card wrapper (`b-card shadow-brutal p-6`).
- Desktop layout is 2 columns (`grid-cols-1 lg:grid-cols-2 gap-6 items-start`).
- Left column (desktop):
  1. Quota name & status badge
  2. Base URL card
  3. Token usage progress bar
  4. Allowed Models section (directly below Token Usage)
- Right column (desktop):
  1. Stat Cards (Total Requests, Total Tokens, Cached Tokens, Est. Cost in `grid-cols-2 gap-3`)
  2. Section "Usage by Model"
- Mobile layout (`grid-cols-1`):
  1. Quota name & status badge
  2. Base URL
  3. Token Usage progress bar
  4. Stat Cards (rendered directly beneath progress bar)
  5. Allowed Models
  6. Usage by Model
- Action buttons (`Refresh` & `Check Another Key`): full width (`flex gap-3 mb-4 w-full`) positioned above the main outer card.
- "Usage by Model":
  - Sorted descending by `(tokens + cachedTokens)`.
  - Format: left model name, right total tokens in bold, sub-line `Tokens: X · Cached: Y`.
  - Max height ~310px (fits 5 models); vertically scrollable (`overflow-y-auto`) with custom brutalist scrollbar when > 5 models.

---

## File Structure & Responsibilities

- **Modify:** `src/lib/db/repos/quotaUsageReport.js`
  - In `buildUsageReport`, aggregate `cachedTokens` per model in `perModelMap`.
  - Calculate `totalWithCached = tokens + cachedTokens`.
  - Sort `perModel` array descending by `totalWithCached`.
- **Test:** `tests/unit/check-usage-model-cached-tokens.test.js`
  - Unit test verifying per-model `cachedTokens`, `totalWithCached`, and descending sort.
- **Modify:** `src/app/check-usage/brutal.css`
  - Add `.b-model-usage-list` with `max-height: 310px; overflow-y: auto;` and custom brutalist scrollbars.
  - Add `.b-stat-grid-compact` helper if needed for the 2x2 stat card grid.
- **Modify:** `src/app/check-usage/page.js`
  - Increase container from `max-w-3xl` to `max-w-5xl`.
  - Move Action buttons to top above main card.
  - Implement 2-column responsive layout with adaptive Stat Cards rendering.
  - Update "Usage by Model" items to display total in bold and secondary `Tokens: X · Cached: Y` line.
- **Test:** `tests/unit/check-usage-layout-dom.test.js`
  - DOM/source integrity test verifying responsive classes and sorting/breakdown logic.

---

### Task 1: Backend Per-Model Cached Tokens Aggregation & Descending Sort

**Files:**
- Modify: `src/lib/db/repos/quotaUsageReport.js:30-85`
- Test: `tests/unit/check-usage-model-cached-tokens.test.js`

**Interfaces:**
- Consumes: `rows` from `usageHistory` (`promptTokens`, `completionTokens`, `tokens`).
- Produces: `perModel: [{ model: string, tokens: number, cachedTokens: number, totalWithCached: number }]` sorted descending by `totalWithCached`.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/check-usage-model-cached-tokens.test.js`:

```javascript
import { describe, it, expect } from "vitest";
import { buildUsageReport } from "@/lib/db/repos/quotaUsageReport.js";

describe("buildUsageReport perModel cached tokens and sorting", () => {
  const apiKeyRow = {
    key: "sk-danton-testkey",
    name: "Danton Team",
    limitPeriod: "monthly",
  };

  it("aggregates cached tokens per model and sorts descending by totalWithCached", async () => {
    const fakeDb = {
      all: () => [
        {
          model: "model-a",
          promptTokens: 100,
          completionTokens: 50,
          cost: 0.001,
          tokens: JSON.stringify({ cache_read_input_tokens: 500 }),
        },
        {
          model: "model-b",
          promptTokens: 200,
          completionTokens: 100,
          cost: 0.002,
          tokens: JSON.stringify({ cache_read_input_tokens: 50 }),
        },
        {
          model: "model-c",
          promptTokens: 50,
          completionTokens: 20,
          cost: 0.0005,
          tokens: JSON.stringify({}),
        },
      ],
    };

    const progress = {
      isActive: true,
      limit: 100000,
      tokensUsed: 0,
      percent: 0,
      resetAt: null,
      allowedModels: [],
    };

    const report = await buildUsageReport(apiKeyRow, progress, fakeDb);

    // model-a: tokens=150, cached=500 -> totalWithCached=650
    // model-b: tokens=300, cached=50  -> totalWithCached=350
    // model-c: tokens=70,  cached=0   -> totalWithCached=70
    expect(report.perModel).toEqual([
      {
        model: "model-a",
        tokens: 150,
        cachedTokens: 500,
        totalWithCached: 650,
      },
      {
        model: "model-b",
        tokens: 300,
        cachedTokens: 50,
        totalWithCached: 350,
      },
      {
        model: "model-c",
        tokens: 70,
        cachedTokens: 0,
        totalWithCached: 70,
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tests && npx vitest run unit/check-usage-model-cached-tokens.test.js`
Expected: FAIL (`cachedTokens` and `totalWithCached` missing, sort order incorrect).

- [ ] **Step 3: Implement minimal code in `src/lib/db/repos/quotaUsageReport.js`**

Update `src/lib/db/repos/quotaUsageReport.js`:

In the `rows` iteration:
```javascript
  for (const r of rows) {
    prompt += Number(r.promptTokens) || 0;
    completion += Number(r.completionTokens) || 0;
    cost += Number(r.cost) || 0;

    const tokens = parseJson(r.tokens, {});
    const cached = parseCachedTokens(tokens);
    const modelCached = (Number(cached.cachedRead) || 0) + (Number(cached.cachedWrite) || 0);
    cachedRead += cached.cachedRead;
    cachedWrite += cached.cachedWrite;

    const model = r.model || "unknown";
    if (!perModelMap[model]) {
      perModelMap[model] = { model, tokens: 0, cachedTokens: 0 };
    }
    perModelMap[model].tokens += (Number(r.promptTokens) || 0) + (Number(r.completionTokens) || 0);
    perModelMap[model].cachedTokens += modelCached;
  }
```

In the `perModel` array construction:
```javascript
  const perModel = Object.values(perModelMap)
    .map((m) => {
      const entry =
        allowedModels.find((e) => e.model === m.model) ||
        allowedModels.find((e) => suffixMatch(e.model, m.model));
      const tokens = m.tokens;
      const cachedTokens = m.cachedTokens;
      const totalWithCached = tokens + cachedTokens;
      return {
        model: entry?.alias || m.model,
        tokens,
        cachedTokens,
        totalWithCached,
      };
    })
    .sort((a, b) => b.totalWithCached - a.totalWithCached);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tests && npx vitest run unit/check-usage-model-cached-tokens.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/repos/quotaUsageReport.js tests/unit/check-usage-model-cached-tokens.test.js
git commit -m "feat(check-usage): aggregate cached tokens per model and sort descending by total usage"
```

---

### Task 2: Brutalist Scrollbar and Model Usage List Styles

**Files:**
- Modify: `src/app/check-usage/brutal.css`

**Interfaces:**
- Consumes: CSS tokens `--border`, `--muted`, `--foreground`.
- Produces: Classes `.b-model-usage-list`, `.b-model-usage-item`.

- [ ] **Step 1: Add CSS rules to `src/app/check-usage/brutal.css`**

Add styling to `src/app/check-usage/brutal.css`:

```css
/* ---- Usage by Model Scrollable List ---- */
.brutal-scope .b-model-usage-list {
  max-height: 310px;
  overflow-y: auto;
  padding-right: 0.25rem;
  scrollbar-width: thin;
  scrollbar-color: #000 hsl(var(--muted));
}

.brutal-scope .b-model-usage-list::-webkit-scrollbar {
  width: 6px;
}
.brutal-scope .b-model-usage-list::-webkit-scrollbar-track {
  background: hsl(var(--muted));
  border: 1px solid #000;
  border-radius: var(--radius);
}
.brutal-scope .b-model-usage-list::-webkit-scrollbar-thumb {
  background: #000;
  border-radius: var(--radius);
}

.brutal-scope .b-model-usage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 2px solid hsl(var(--border));
  background-color: hsl(var(--card));
  border-radius: var(--radius);
  box-shadow: 2px 2px 0 0 rgb(0, 0, 0);
  padding: 0.55rem 0.75rem;
  transition: transform 0.1s ease;
}
.brutal-scope .b-model-usage-item:hover {
  transform: translateY(-0.05rem);
}
```

- [ ] **Step 2: Verify CSS builds without errors**

Run: `npm run build` from repo root.
Expected: Build passes with no CSS compiler errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/check-usage/brutal.css
git commit -m "style(check-usage): add scrollable model usage list and brutalist scrollbar styles"
```

---

### Task 3: 2-Column Responsive Layout Implementation in `CheckUsagePage`

**Files:**
- Modify: `src/app/check-usage/page.js`

**Interfaces:**
- Consumes: `result` from API with updated `perModel: [{ model, tokens, cachedTokens, totalWithCached }]`.
- Produces: 2-column desktop grid within 1 outer card, action buttons at the top, adaptive mobile stat cards placement, and scrollable usage by model.

- [ ] **Step 1: Restructure container and action buttons in `src/app/check-usage/page.js`**

1. Expand container class from `max-w-3xl` to `max-w-5xl`:
   ```jsx
   <div className="w-full max-w-5xl py-10">
   ```
2. Move action buttons to top of the results block (above outer card):
   ```jsx
   {/* Actions - Full width at the top */}
   <div className="flex gap-3 mb-4 w-full">
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
   ```

- [ ] **Step 2: Extract and construct Stat Cards element**

Extract Stat Cards markup into a reusable helper/variable:

```jsx
const statCards = (
  <div>
    <h3 className="text-sm font-bold mb-2">Detail Usage Quota Tokens</h3>
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
);
```

- [ ] **Step 3: Update "Usage by Model" component markup with Opsi A format**

```jsx
const usageByModel = result.perModel?.length > 0 && (
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
);
```

- [ ] **Step 4: Assemble single outer card with 2 responsive columns**

```jsx
<div className="b-card shadow-brutal p-6">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
    {/* Column 1 (Left) */}
    <div className="space-y-5">
      {/* Header: Quota Name and Status */}
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

      {/* Stat Cards - Mobile only (under Token Usage on mobile) */}
      <div className="block lg:hidden">
        {statCards}
      </div>

      {/* Allowed Models (placed under Token Usage on desktop) */}
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
      <div className="hidden lg:block">
        {statCards}
      </div>

      {/* Usage by Model */}
      {usageByModel}
    </div>
  </div>
</div>
```

- [ ] **Step 5: Run tests and verify build**

Run: `cd tests && npx vitest run unit/check-usage-model-cached-tokens.test.js unit/check-usage-dom.test.js`
Run: `npm run build` from repo root.
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/check-usage/page.js
git commit -m "feat(check-usage): implement 2-column responsive layout and enhanced model usage view"
```

---

### Task 4: End-to-End DOM & Regression Verification

**Files:**
- Modify: `tests/unit/check-usage-dom.test.js`

**Interfaces:**
- Consumes: Updated `page.js` and `brutal.css`.
- Produces: Verified unit test asserting 2-column classes, top action buttons, and scrollable container.

- [ ] **Step 1: Update `tests/unit/check-usage-dom.test.js` with layout checks**

Add assertions:
```javascript
  it("implements responsive 2-column grid and top action buttons", () => {
    const pageSrc = readFileSync(new URL("../../src/app/check-usage/page.js", import.meta.url), "utf8");

    expect(pageSrc).toContain("grid-cols-1 lg:grid-cols-2");
    expect(pageSrc).toContain("b-model-usage-list");
    expect(pageSrc).toContain("block lg:hidden");
    expect(pageSrc).toContain("hidden lg:block");
  });

  it("contains 5-model max-height scrollable styles in brutal.css", () => {
    const cssSrc = readFileSync(new URL("../../src/app/check-usage/brutal.css", import.meta.url), "utf8");

    expect(cssSrc).toContain(".b-model-usage-list");
    expect(cssSrc).toContain("max-height: 310px");
    expect(cssSrc).toContain("overflow-y: auto");
  });
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd tests && npx vitest run unit/check-usage-dom.test.js`
Expected: PASS.

- [ ] **Step 3: Run no-regression verification gate**

Run: `node tests/__baseline__/verify-no-regression.mjs`
Expected: 0 new regressions.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/check-usage-dom.test.js
git commit -m "test(check-usage): add layout and scroll container integrity tests"
```
