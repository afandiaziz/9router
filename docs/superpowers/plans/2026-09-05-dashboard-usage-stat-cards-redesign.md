# Dashboard Usage Stat Cards Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the 8 usage metric cards in `apps/dashboard/app/(dashboard)/web-tools/omniroute/usage/page.tsx` in the `afandiaziz.my.id` repository to adopt the exact brutalist aesthetics, typography, -4deg rotated icon plates, and pastel backgrounds from `/check-usage` in `_9router-fork`.

**Architecture:** In `afandiaziz.my.id/apps/dashboard`, add brutalist card helper styles (`.b-card`, `.b-icon-plate`, `.hover-lift`) to `apps/dashboard/app/globals.css`. Update the `StatCard` component and grid layout in `apps/dashboard/app/(dashboard)/web-tools/omniroute/usage/page.tsx` to render 8 cards in a responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` layout with matching brutalist SVG stroke icons, pastel backgrounds, and tabular numbers. Verify with tests and build, commit, and push to `origin main`.

**Tech Stack:** Next.js (App Router), React 19, Tailwind CSS v4, TypeScript, Vitest, Docker.

## Global Constraints

- Exactly 8 cards redesigned:
  1. Total Requests (`requests`)
  2. Total Tokens (`tokens`)
  3. Input Tokens (`input`)
  4. Output Tokens (`output`)
  5. Cached Tokens (`cached`)
  6. Cache Read (`cacheRead`)
  7. Cache Write (`cacheCreation`)
  8. Est. Cost (`cost`)
- Stat card styling:
  - Outer card: 2px border, rounded-md, `shadow-brutal`, hover lift animation.
  - Icon plate: 40x40px, border-2 border-black, rounded-md, rotated `-4deg`, `shadow-brutal-sm`, solid plate background.
  - Label: uppercase, bold/black font, tracking-wider, text-[11px].
  - Value: text-2xl font-black, tabular-nums.
  - Subtext: text-[11px] font-mono font-semibold, top border separator `border-t-2 border-black/15 pt-1.5 mt-2`.
- Target repository: `D:\_\react\next-js\afandiaziz.my.id` (Worktree: `C:\Users\afand\AppData\Local\Temp\afandiaziz-model-resolver`).
- Target branch: `main`.

---

## File Structure & Responsibilities

- **Modify:** `apps/dashboard/app/globals.css`
  - Add `.hover-lift`, `.b-icon-plate`, and ensure `.b-card` has brutalist styling.
- **Modify:** `apps/dashboard/app/(dashboard)/web-tools/omniroute/usage/page.tsx`
  - Redesign `StatCard` component.
  - Define icon components and color schemes for all 8 metrics.
  - Update the totals grid to render the 8 cards in 4-column responsive grid.
- **Test:** `apps/dashboard/app/(dashboard)/web-tools/omniroute/usage/stat-cards.test.tsx`
  - Test verifying presence of all 8 stat cards and their labels/formatting.

---

### Task 1: Add Brutalist Card Helper Classes to `globals.css`

**Files:**
- Modify: `C:/Users/afand/AppData/Local/Temp/afandiaziz-model-resolver/apps/dashboard/app/globals.css`

**Interfaces:**
- Produces: `.hover-lift`, `.b-icon-plate`, `.b-card`.

- [ ] **Step 1: Add CSS rules to `apps/dashboard/app/globals.css`**

Add to `apps/dashboard/app/globals.css`:
```css
/* ---------- Brutalist helper classes ---------- */
.hover-lift {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hover-lift:hover {
  transform: translateY(-0.25rem);
  box-shadow: 6px 6px 0px 0px rgb(0, 0, 0);
}

.b-card {
  border: 2px solid hsl(var(--border));
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border-radius: var(--radius-md);
  box-shadow: 4px 4px 0 0 rgb(0, 0, 0);
}

.b-icon-plate {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  border: 2px solid #000;
  border-radius: var(--radius-md);
  box-shadow: 2px 2px 0 0 rgb(0, 0, 0);
  transform: rotate(-4deg);
  color: #000;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/app/globals.css
git commit -m "style(dashboard): add brutalist card and icon plate helper classes"
```

---

### Task 2: Redesign StatCard and 8 Metrics in `page.tsx`

**Files:**
- Modify: `C:/Users/afand/AppData/Local/Temp/afandiaziz-model-resolver/apps/dashboard/app/(dashboard)/web-tools/omniroute/usage/page.tsx`

**Interfaces:**
- Consumes: `totals` from `stats` API.
- Produces: 8 brutalist stat cards matching `/check-usage`.

- [ ] **Step 1: Implement `StatCard` and SVG Icons in `page.tsx`**

Replace `StatCard` and `STAT_TONE` with brutalist implementation:

```tsx
const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "#000",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
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
  cacheCreation: (
    <svg {...iconProps}>
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" />
      <circle cx="12" cy="12" r="3" />
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

function StatCard({
  icon,
  label,
  value,
  sub,
  bg,
  plate,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  bg: string;
  plate: string;
  loading?: boolean;
}) {
  return (
    <div
      className="b-card shadow-brutal hover-lift p-3.5 transition-all text-black"
      style={{ backgroundColor: bg }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="b-icon-plate"
          style={{ backgroundColor: plate }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider text-black/70 truncate">
            {label}
          </p>
          <p className="text-2xl font-black tabular-nums tracking-tight text-black truncate">
            {loading ? '…' : value}
          </p>
        </div>
      </div>
      {sub && (
        <p className="mt-2 border-t-2 border-black/15 pt-1.5 font-mono text-[11px] font-semibold text-black/80 truncate">
          {sub}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Render all 8 Stat Cards in Totals section**

```tsx
      {/* Totals - 8 Brutalist Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={StatIcons.requests}
          label="Total Requests"
          value={formatNumber(totals.requests)}
          sub="Lifetime requests"
          bg="hsl(var(--brutal-yellow) / 0.55)"
          plate="hsl(var(--brutal-yellow))"
          loading={loading}
        />
        <StatCard
          icon={StatIcons.tokens}
          label="Total Tokens"
          value={formatNumber(totals.tokens)}
          sub={`${formatNumber(totals.input)} in / ${formatNumber(totals.output)} out`}
          bg="hsl(var(--brutal-blue) / 0.55)"
          plate="hsl(var(--brutal-blue))"
          loading={loading}
        />
        <StatCard
          icon={StatIcons.input}
          label="Input Tokens"
          value={formatNumber(totals.input)}
          sub="Prompt tokens received"
          bg="hsl(var(--brutal-blue) / 0.45)"
          plate="hsl(var(--brutal-blue))"
          loading={loading}
        />
        <StatCard
          icon={StatIcons.output}
          label="Output Tokens"
          value={formatNumber(totals.output)}
          sub="Completion tokens generated"
          bg="hsl(var(--brutal-orange) / 0.55)"
          plate="hsl(var(--brutal-orange))"
          loading={loading}
        />
        <StatCard
          icon={StatIcons.cached}
          label="Cached Tokens"
          value={formatNumber(totals.cached)}
          sub={
            totals.tokens > 0
              ? `${((totals.cached / totals.tokens) * 100).toFixed(1)}% token di-cache`
              : 'Total prompt cached'
          }
          bg="hsl(var(--brutal-green) / 0.55)"
          plate="hsl(var(--brutal-green))"
          loading={loading}
        />
        <StatCard
          icon={StatIcons.cached}
          label="Cache Read"
          value={formatNumber(totals.cacheRead)}
          sub="Cache read hits"
          bg="hsl(var(--brutal-green) / 0.45)"
          plate="hsl(var(--brutal-green))"
          loading={loading}
        />
        <StatCard
          icon={StatIcons.cacheCreation}
          label="Cache Write"
          value={formatNumber(totals.cacheCreation)}
          sub="Cache creation write"
          bg="hsl(var(--brutal-pink) / 0.55)"
          plate="hsl(var(--brutal-pink))"
          loading={loading}
        />
        <StatCard
          icon={StatIcons.cost}
          label="Est. Cost"
          value={currency(totals.cost)}
          sub="Estimated token cost"
          bg="hsl(var(--brutal-purple) / 0.55)"
          plate="hsl(var(--brutal-purple))"
          loading={loading}
        />
      </div>
```

- [ ] **Step 3: Run Vitest in `apps/dashboard`**

Run: `cd apps/dashboard && npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit and push to `main` in `afandiaziz.my.id`**

```bash
git add apps/dashboard/app/(dashboard)/web-tools/omniroute/usage/page.tsx apps/dashboard/app/globals.css
git commit -m "feat(dashboard): redesign usage stat cards with brutalist check-usage aesthetic"
git push origin main
```

---

### Task 3: Monitor Deployments for Both Repos

- [ ] **Step 1: Verify 9router redeploy tag `v0.5.65-fork41` status**
- [ ] **Step 2: Verify `afandiaziz.my.id` `main` branch deployment status**
