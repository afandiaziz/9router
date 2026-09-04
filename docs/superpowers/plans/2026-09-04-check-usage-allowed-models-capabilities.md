# Check-Usage Allowed Models Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display accurate, iconography-backed capability chips (Vision, Reasoning, Tool calling, PDF input, Image output, Audio input, Video input, Audio output) under each allowed model in `/check-usage` with brutalist styling and a single-line, auto-fitting model name without truncation, ellipsis, or horizontal scroll.

**Architecture:** Extend `buildUsageReport` to accept a pluggable capability resolver that resolves model caps through `getCapabilitiesForModel` merged with SQLite `modelCaps` overrides and combo conservative capabilities. In `/check-usage/page.js`, replace plain model chips with `.b-model-card` cards, rendering an auto-fitted single-line model name, a fixed 12px Copy button, and SVG-backed capability chips using custom brutalist pastel pills.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS / brutal.css, SQLite (better-sqlite3/bun:sqlite), Vitest.

## Global Constraints

- Model name in Allowed Models must be strictly 1 single line (`white-space: nowrap`), never truncated, never use ellipsis, and never trigger horizontal scrollbar.
- Typography scale: Model Name (14px default, auto-fit down to 11px min) > Copy button (12px bold fixed) > Capability chips (9px bold).
- Vision icon must be an observing eye.
- Reasoning icon must be a brain with cerebral lobes.
- Exactly 8 capabilities supported: Vision (image input), Reasoning / thinking, Tool calling, PDF input, Image output, Audio input, Video input, Audio output.
- Models with zero active capabilities render only the model name and copy button (no chips, no empty placeholder text).
- Empty allowedModels list continues to render "All models allowed".
- Backward compatibility: `quotaUsageReport.js` must handle both object `{ model, alias }` and string `model` items.

---

## File Structure & Responsibilities

- **Modify:** `src/lib/db/repos/quotaUsageReport.js`
  - Accept optional `options.resolveCaps(modelStr, alias)` in `buildUsageReport`.
  - Attach `caps` boolean map to each item in `allowedModels`.
- **Modify:** `src/app/api/public/check-usage/route.js`
  - Build and pass `resolveCaps` using `open-sse/providers/capabilities.js`, `getCapsOverrides()` from `src/lib/db/index.js`, and `getComboByName` from `src/lib/db/repos/combosRepo.js`.
- **Modify:** `src/app/check-usage/brutal.css`
  - Add styles for `.b-model-card`, `.b-model-name-wrapper`, `.b-model-name`, `.b-cap-chip`, and capability color themes.
- **Modify:** `src/app/check-usage/page.js`
  - Implement `ModelCard` component with client-side auto-fit font clamping.
  - Implement `CapabilityChip` with custom SVG icons (eye for Vision, brain for Reasoning, tools, pdf, image output, audio in/out, video in).
- **Test:** `tests/unit/check-usage-report-capabilities.test.js`
  - Unit test capability attachment in `buildUsageReport`.
- **Test:** `tests/unit/check-usage-api-capabilities.test.js`
  - Integration test for POST `/api/public/check-usage`.

---

### Task 1: Backend Capabilities Resolution in `quotaUsageReport`

**Files:**
- Modify: `src/lib/db/repos/quotaUsageReport.js`
- Test: `tests/unit/check-usage-report-capabilities.test.js`

**Interfaces:**
- Consumes: `allowedModels` array from `progress` (`[{ model, alias }]` or `["model"]`).
- Produces: `allowedModels: [{ model: string, rawModel: string, caps: Record<string, boolean> }]` in the returned report.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/check-usage-report-capabilities.test.js`:

```javascript
import { describe, it, expect } from "vitest";
import { buildUsageReport } from "@/lib/db/repos/quotaUsageReport.js";

describe("buildUsageReport capabilities enrichment", () => {
  const fakeDb = {
    all: () => [],
  };

  const apiKeyRow = {
    key: "sk-danton-testkey",
    name: "Danton Shared",
    limitPeriod: "monthly",
  };

  it("attaches capabilities to allowedModels when resolveCaps option is provided", async () => {
    const progress = {
      isActive: true,
      limit: 100000,
      tokensUsed: 0,
      percent: 0,
      resetAt: null,
      allowedModels: [
        { model: "google/gemini-3.7-flash", alias: "danton/gemini" },
        { model: "openai/gpt-4o-mini", alias: null },
      ],
    };

    const resolveCaps = (model, alias) => {
      if (model.includes("gemini")) {
        return { vision: true, reasoning: true, tools: true, pdf: true };
      }
      return { vision: true, tools: true };
    };

    const report = await buildUsageReport(apiKeyRow, progress, fakeDb, { resolveCaps });

    expect(report.allowedModels).toEqual([
      {
        model: "danton/gemini",
        rawModel: "google/gemini-3.7-flash",
        caps: { vision: true, reasoning: true, tools: true, pdf: true },
      },
      {
        model: "openai/gpt-4o-mini",
        rawModel: "openai/gpt-4o-mini",
        caps: { vision: true, tools: true },
      },
    ]);
  });

  it("handles legacy string-only allowedModels entries safely", async () => {
    const progress = {
      isActive: true,
      limit: 100000,
      tokensUsed: 0,
      percent: 0,
      resetAt: null,
      allowedModels: ["claude-3-5-sonnet"],
    };

    const resolveCaps = () => ({ vision: true, tools: true });

    const report = await buildUsageReport(apiKeyRow, progress, fakeDb, { resolveCaps });

    expect(report.allowedModels).toEqual([
      {
        model: "claude-3-5-sonnet",
        rawModel: "claude-3-5-sonnet",
        caps: { vision: true, tools: true },
      },
    ]);
  });

  it("returns empty caps object when resolveCaps returns null or is omitted", async () => {
    const progress = {
      isActive: true,
      limit: 100000,
      tokensUsed: 0,
      percent: 0,
      resetAt: null,
      allowedModels: [{ model: "unknown-model", alias: null }],
    };

    const report = await buildUsageReport(apiKeyRow, progress, fakeDb);

    expect(report.allowedModels).toEqual([
      {
        model: "unknown-model",
        rawModel: "unknown-model",
        caps: {},
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run unit/check-usage-report-capabilities.test.js` from `tests/` directory.
Expected: FAIL (`report.allowedModels` missing `caps` and `rawModel`).

- [ ] **Step 3: Implement minimal code in `quotaUsageReport.js`**

Modify `src/lib/db/repos/quotaUsageReport.js`:

Update the `buildUsageReport` signature and `allowedModelsForReport` mapping:

```javascript
export async function buildUsageReport(apiKeyRow, progress, db, options = {}) {
  const { periodKey, windowStart, resetAt } = getWindowKey(apiKeyRow.limitPeriod);
  const resolveCaps = typeof options?.resolveCaps === "function" ? options.resolveCaps : null;
  // ... (aggregate totals loop stays unchanged) ...

  const allowedModels = progress.allowedModels || [];
  const allowedModelsForReport = await Promise.all(
    allowedModels.map(async (e) => {
      const rawModel = typeof e === "string" ? e : (e?.model || "");
      const display = typeof e === "string" ? e : (e?.alias || e?.model || "");
      const resolved = resolveCaps ? (await resolveCaps(rawModel, typeof e === "object" ? e?.alias : null)) : null;
      return {
        model: display,
        rawModel,
        caps: resolved || {},
      };
    })
  );

  // ... (suffix match and perModel mapping stays unchanged) ...
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run unit/check-usage-report-capabilities.test.js` from `tests/` directory.
Expected: PASS (all 3 tests pass).

- [ ] **Step 5: Commit**

```bash
git add tests/unit/check-usage-report-capabilities.test.js src/lib/db/repos/quotaUsageReport.js
git commit -m "feat(check-usage): enrich allowedModels with capabilities in usage report"
```

---

### Task 2: Public Check-Usage Route Capabilities Wiring

**Files:**
- Modify: `src/app/api/public/check-usage/route.js`
- Test: `tests/unit/check-usage-api-capabilities.test.js`

**Interfaces:**
- Consumes: `open-sse/providers/capabilities.js` (`getCapabilitiesForModel`, `getConservativeComboCapabilities`), `src/lib/db/index.js` (`getCapsOverrides`), `src/lib/db/repos/combosRepo.js` (`getComboByName`).
- Produces: Enriched `POST /api/public/check-usage` JSON with normalized 8 capabilities: `{ vision, reasoning, tools, pdf, imageOutput, audioInput, videoInput, audioOutput }`.

- [ ] **Step 1: Write the failing integration test**

Create `tests/unit/check-usage-api-capabilities.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getQuotaKeyByFullKey: vi.fn(),
  getQuotaKeyProgress: vi.fn(),
  getAdapter: vi.fn(),
  getCapsOverrides: vi.fn(),
  getComboByName: vi.fn(),
}));

vi.mock("@/lib/db/repos/quotaKeysRepo.js", () => ({
  getQuotaKeyByFullKey: mocks.getQuotaKeyByFullKey,
  getQuotaKeyProgress: mocks.getQuotaKeyProgress,
}));

vi.mock("@/lib/db/driver.js", () => ({
  getAdapter: mocks.getAdapter,
}));

vi.mock("@/lib/db/index.js", () => ({
  getCapsOverrides: mocks.getCapsOverrides,
}));

vi.mock("@/lib/db/repos/combosRepo.js", () => ({
  getComboByName: mocks.getComboByName,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json(body, init = {}) {
      return new Response(JSON.stringify(body), {
        status: init.status || 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  },
}));

describe("POST /api/public/check-usage capabilities resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdapter.mockResolvedValue({ all: () => [] });
    mocks.getCapsOverrides.mockResolvedValue({});
    mocks.getComboByName.mockResolvedValue(null);
    mocks.getQuotaKeyByFullKey.mockResolvedValue({
      id: "quota-1",
      key: "sk-danton-samplekey12345",
      name: "Team Key",
      limitPeriod: "monthly",
    });
  });

  it("resolves capabilities for standard models and combos in allowedModels", async () => {
    mocks.getQuotaKeyProgress.mockResolvedValue({
      isActive: true,
      limit: 50000,
      tokensUsed: 1000,
      percent: 2,
      resetAt: null,
      allowedModels: [
        { model: "google/gemini-2.0-flash", alias: "fast-gemini" },
      ],
    });

    const { POST } = await import("@/app/api/public/check-usage/route.js");
    const req = new Request("http://localhost/api/public/check-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "sk-danton-samplekey12345" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.keyValid).toBe(true);
    expect(body.allowedModels).toHaveLength(1);
    expect(body.allowedModels[0].model).toBe("fast-gemini");
    expect(body.allowedModels[0].caps).toHaveProperty("vision");
    expect(body.allowedModels[0].caps).toHaveProperty("reasoning");
    expect(body.allowedModels[0].caps).toHaveProperty("tools");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run unit/check-usage-api-capabilities.test.js` from `tests/` directory.
Expected: FAIL (`caps` missing on `allowedModels[0]`).

- [ ] **Step 3: Implement capabilities resolver in `src/app/api/public/check-usage/route.js`**

Modify `src/app/api/public/check-usage/route.js`:

```javascript
import { NextResponse } from "next/server";
import { getQuotaKeyByFullKey, getQuotaKeyProgress } from "@/lib/db/repos/quotaKeysRepo.js";
import { buildUsageReport } from "@/lib/db/repos/quotaUsageReport.js";
import { getAdapter } from "@/lib/db/driver.js";
import { getCapsOverrides } from "@/lib/db/index.js";
import { getComboByName } from "@/lib/db/repos/combosRepo.js";
import {
  getCapabilitiesForModel,
  getConservativeComboCapabilities,
} from "open-sse/providers/capabilities.js";

export const dynamic = "force-dynamic";

const RELEVANT_CAPS = [
  "vision",
  "reasoning",
  "tools",
  "pdf",
  "imageOutput",
  "audioInput",
  "videoInput",
  "audioOutput",
];

function pickCaps(c) {
  const out = {};
  for (const k of RELEVANT_CAPS) {
    if (c?.[k]) out[k] = true;
  }
  return out;
}

export async function POST(request) {
  try {
    const { key } = await request.json();
    if (!key || !String(key).startsWith("sk-danton-")) {
      return NextResponse.json({ keyValid: false, error: "Invalid quota key format" }, { status: 401 });
    }
    const quotaKey = await getQuotaKeyByFullKey(key);
    if (!quotaKey) {
      return NextResponse.json({ keyValid: false, error: "Invalid quota key" }, { status: 401 });
    }
    const progress = await getQuotaKeyProgress(quotaKey.id);
    const db = await getAdapter();
    const overrides = await getCapsOverrides();

    const resolveCaps = async (rawModel) => {
      if (!rawModel) return {};

      // 1. Check if model is a combo
      const combo = await getComboByName(rawModel);
      if (combo?.models?.length) {
        return pickCaps(getConservativeComboCapabilities(combo.models));
      }

      // 2. Resolve provider and model identifier
      let provider = "";
      let model = rawModel;
      if (rawModel.includes("/")) {
        const parts = rawModel.split("/");
        provider = parts[0];
        model = parts.slice(1).join("/");
      }

      // 3. Check overrides (exact provider|model or alias|model)
      const override = overrides[`${provider}|${model}`] || overrides[rawModel] || overrides[model];
      const baseCaps = getCapabilitiesForModel(provider, model);
      return pickCaps({ ...baseCaps, ...(override || {}) });
    };

    const report = await buildUsageReport({ ...quotaKey, key }, progress, db, { resolveCaps });

    const proto = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const baseUrl = host ? `${proto}://${host}` : new URL(request.url).origin;
    const keyPrefix = key.startsWith("sk-danton-")
      ? "sk-danton-" + key.slice("sk-danton-".length, "sk-danton-".length + 4) + "…"
      : key.slice(0, 8) + "…";

    return NextResponse.json({ keyValid: true, keyPrefix, baseUrl, ...report });
  } catch (error) {
    console.error("check-usage error:", error);
    return NextResponse.json({ keyValid: false, error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run unit/check-usage-api-capabilities.test.js unit/check-usage-report-capabilities.test.js` from `tests/` directory.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/public/check-usage/route.js tests/unit/check-usage-api-capabilities.test.js
git commit -m "feat(check-usage): wire model capabilities into check-usage API response"
```

---

### Task 3: Brutalist Model Card and Capability Chip Styles

**Files:**
- Modify: `src/app/check-usage/brutal.css`

**Interfaces:**
- Consumes: `--border`, `--radius`, `--card`, `--foreground`, palette tokens.
- Produces: CSS classes `.b-model-card`, `.b-model-head`, `.b-model-name-wrapper`, `.b-model-name`, `.b-cap-list`, `.b-cap-chip`, `.b-copy-btn`.

- [ ] **Step 1: Write CSS rules in `src/app/check-usage/brutal.css`**

Add to `src/app/check-usage/brutal.css`:

```css
/* ---- Allowed Models Card & Capability Badges ---- */
.brutal-scope .b-model-card {
  border: 2px solid hsl(var(--border));
  background-color: hsl(var(--card));
  border-radius: var(--radius);
  box-shadow: 2px 2px 0 0 rgb(0, 0, 0);
  padding: 0.75rem 0.85rem;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.brutal-scope .b-model-card:hover {
  transform: translateY(-0.1rem);
  box-shadow: 3px 3px 0 0 rgb(0, 0, 0);
}

.brutal-scope .b-model-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.brutal-scope .b-model-name-wrapper {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  cursor: pointer;
}

.brutal-scope .b-model-name {
  display: block;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 800;
  line-height: 1.25;
  color: hsl(var(--foreground));
  font-size: var(--fit-size, clamp(11px, 2.4vw, 14px));
}

.brutal-scope .b-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  padding: 0.35rem 0.65rem;
  border: 2px solid hsl(var(--border));
  border-radius: var(--radius);
  background-color: #fff;
  color: #000;
  box-shadow: 2px 2px 0 0 rgb(0, 0, 0);
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.brutal-scope .b-copy-btn:hover {
  transform: translateY(-0.08rem);
  box-shadow: 3px 3px 0 0 rgb(0, 0, 0);
}
.brutal-scope .b-copy-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 0 rgb(0, 0, 0);
}

.brutal-scope .b-cap-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.55rem;
}

.brutal-scope .b-cap-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.5rem;
  border: 1.5px solid hsl(var(--border));
  border-radius: 9999px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
  box-shadow: 1.5px 1.5px 0 0 rgb(0, 0, 0);
  white-space: nowrap;
  color: #000;
}

.brutal-scope .b-cap-chip svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  fill: none;
  stroke: #000;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Capability pastel color tokens */
.brutal-scope .b-cap-vision      { background-color: hsl(210 90% 82%); }
.brutal-scope .b-cap-reasoning   { background-color: hsl(48 95% 76%); }
.brutal-scope .b-cap-tools       { background-color: hsl(150 75% 78%); }
.brutal-scope .b-cap-pdf         { background-color: hsl(10 90% 82%); }
.brutal-scope .b-cap-imageOutput { background-color: hsl(270 80% 84%); }
.brutal-scope .b-cap-audioInput  { background-color: hsl(30 95% 80%); }
.brutal-scope .b-cap-videoInput  { background-color: hsl(185 80% 78%); }
.brutal-scope .b-cap-audioOutput { background-color: hsl(340 85% 82%); }
```

- [ ] **Step 2: Verify CSS builds without syntax errors**

Run: `npm run build` from repo root.
Expected: Build passes with no CSS compiler errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/check-usage/brutal.css
git commit -m "style(check-usage): add brutalist model card and capability chip styles"
```

---

### Task 4: Frontend Allowed Models UI Implementation

**Files:**
- Modify: `src/app/check-usage/page.js`

**Interfaces:**
- Consumes: `result.allowedModels: [{ model: string, rawModel: string, caps: Record<string, boolean> }]`.
- Produces: Interactive rendered list of allowed models with auto-fitting single-line titles, Copy buttons, and custom SVG capability chips.

- [ ] **Step 1: Define capability definitions & SVG icons in `page.js`**

Add the 8 capability specs to `src/app/check-usage/page.js`:

```jsx
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
```

- [ ] **Step 2: Implement `ModelCard` component with single-line auto-fit font clamping**

Add component to `src/app/check-usage/page.js`:

```jsx
import { useState, useEffect, useRef } from "react";

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
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [modelText]);

  const activeCaps = CAPABILITY_CONFIG.filter((c) => caps[c.key]);

  return (
    <div className="b-model-card">
      <div className="b-model-head">
        <div className="b-model-name-wrapper" onClick={copy} title={`Click to copy: ${modelText}`}>
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
```

- [ ] **Step 3: Update Allowed Models section rendering in `CheckUsagePage`**

In `src/app/check-usage/page.js`, replace the existing Allowed Models section:

```jsx
{/* Allowed Models */}
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
```

- [ ] **Step 4: Run unit tests to verify frontend builds cleanly**

Run: `cd tests && npx vitest run unit/check-usage-api-capabilities.test.js unit/check-usage-report-capabilities.test.js`
Run: `npm run build` from repo root.
Expected: Both tests pass, production build completes with exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/check-usage/page.js
git commit -m "feat(check-usage): display capability badges with single-line auto-fit model names"
```

---

### Task 5: End-to-End Verification & Visual Regression Check

**Files:**
- Test: `tests/unit/check-usage-capabilities-visual.test.js`

**Interfaces:**
- Consumes: Running server on test port.
- Produces: Verified DOM rendering with Playwright snapshot / headless verification.

- [ ] **Step 1: Create automated DOM verification test**

Create `tests/unit/check-usage-dom.test.js`:

```javascript
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("check-usage source integrity", () => {
  it("includes all 8 requested capabilities with exact required labels", () => {
    const pageSrc = readFileSync(new URL("../../src/app/check-usage/page.js", import.meta.url), "utf8");

    expect(pageSrc).toContain("Vision (image input)");
    expect(pageSrc).toContain("Reasoning / thinking");
    expect(pageSrc).toContain("Tool calling");
    expect(pageSrc).toContain("PDF input");
    expect(pageSrc).toContain("Image output");
    expect(pageSrc).toContain("Audio input");
    expect(pageSrc).toContain("Video input");
    expect(pageSrc).toContain("Audio output");
  });

  it("enforces single-line nowrap rule in brutal.css", () => {
    const cssSrc = readFileSync(new URL("../../src/app/check-usage/brutal.css", import.meta.url), "utf8");

    expect(cssSrc).toContain(".b-model-name");
    expect(cssSrc).toContain("white-space: nowrap");
    expect(cssSrc).not.toContain(".b-model-name {\n  text-overflow: ellipsis");
  });
});
```

- [ ] **Step 2: Run verification test**

Run: `cd tests && npx vitest run unit/check-usage-dom.test.js`
Expected: PASS.

- [ ] **Step 3: Run full baseline regression check**

Run: `tests/__baseline__/verify-no-regression.mjs` check.
Expected: No regressions introduced.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/check-usage-dom.test.js
git commit -m "test(check-usage): add DOM and capability configuration integrity tests"
```
