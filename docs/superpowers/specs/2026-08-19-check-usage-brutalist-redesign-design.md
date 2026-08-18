# Design — `/check-usage` mocasus brutalist redesign

**Date:** 2026-08-19
**Author:** Afandi Aziz (with Claude Code)
**Status:** Approved — ready for implementation plan

## Goal

Reskin the public `/check-usage` page (`src/app/check-usage/page.js`) to match the
neo-brutalist design language of the mocasus reference project
(`D:\_\vibecoding\clone-website\mocasus`, a clone of `mocasus.my.id`). The page
functionality is unchanged; only the visual presentation and animations change.

## Decisions (from brainstorming)

| Question | Decision |
|----------|----------|
| Fidelity to mocasus | **Full brutalist (light)** — faithful clone: cream bg, hard black borders, offset shadows, pink/yellow accents, Space Grotesk font, mocasus animations. Page is always light. |
| CSS strategy | **Scoped CSS** — a new `brutal.css` imported by the page, everything namespaced under `.brutal-scope`. `globals.css` and shared code untouched. |
| Animations | **Full mocasus feel** — reveal-up, hover-lift + tilt-shake, click-sparks, pulse-soft, refresh spin, floating hero icon. |
| Icons | **Inline SVG** — no new dependency (9router has no lucide-react). |

## Context / constraints discovered

- Both projects use **Tailwind CSS v4**, Next 16, React 19 → compatible.
- 9router design tokens are flat hex (`--color-*`) with a `.dark` toggle and Inter font.
  Mocasus uses HSL-triplet vars (`--primary: 340 78% 46%`) surfaced via
  `@theme inline { --color-primary: hsl(var(--primary)); }` and Space Grotesk /
  Plus Jakarta Sans.
- `/check-usage` renders under the **root** `src/app/layout.js` (ThemeProvider present,
  NO dashboard shell) → it is a standalone public page. Safe to style in isolation and
  force a light palette.
- 9router does **not** have `lucide-react`. The existing page already uses inline SVG
  for its copy/refresh icons.

## Architecture & isolation

Two files; no changes to `globals.css`, `layout.js`, or any shared component:

```
src/app/check-usage/
  ├─ page.js       (rewritten — same logic, brutalist markup, wrapped in .brutal-scope)
  └─ brutal.css    (new — scoped tokens, brutalist utilities, animations, font import)
```

- `page.js` imports `./brutal.css` and wraps the whole page in
  `<div className="brutal-scope theme-brutal">`.
- **All brutalist tokens and utilities are namespaced under `.brutal-scope`** — e.g.
  `.brutal-scope { --primary: 340 78% 46%; … }`, `.brutal-scope .shadow-brutal { … }`.
  Nothing leaks to the dashboard.
- The scope forces the **light brutalist palette** regardless of 9router's `.dark` class,
  so the page is always the cream mocasus look.
- Fonts loaded via `@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk…")`
  at the top of `brutal.css` — self-contained, no `layout.js` edit.

### Why scoped `<div>` classes instead of Tailwind utility tokens

Mocasus markup uses semantic Tailwind classes generated from its `@theme inline`
(e.g. `bg-primary`, `border-border`, `text-muted-foreground`). Those classes do not
exist in 9router's Tailwind build. Rather than register them globally (invasive), the
scoped `brutal.css` defines the small set of semantic helper classes the page needs
(`.b-card`, `.b-btn`, `.b-input`, `.b-chip`, `.shadow-brutal*`, color helpers) under
`.brutal-scope`, driven by scoped CSS variables. Plain Tailwind utilities
(spacing, flex/grid, text sizes) still work as normal.

## Data flow & behavior — UNCHANGED

The React logic is preserved 1:1:

- State: `key`, `result`, `error`, `loading`, `refreshing`, `howToTab`.
- `fetchUsage(apiKey, opts)` → `POST /api/public/check-usage` with `{ key }`.
- `handleSubmit`, `handleRefresh`, "Check Another Key" reset.
- `CopyButton` and `Chip` keep behavior (inline SVG, clipboard, 1.5s "copied").
- No API contract change. Only JSX structure/classNames and CSS change.

## Visual layout (brutalist skin)

- **Page shell**: cream bg (`--background: 45 30% 96%`) + `.bg-dots` overlay, centered,
  `min-h-screen`, Space Grotesk.
- **Hero**: bold `<h1>` "Check Quota Usage" with a small floating (`animate-float`)
  inline-SVG gauge/key icon above it.
- **Input form card**: `.b-card` = `rounded-md border-2 border-black bg-card shadow-brutal p-6`.
  Input = `.b-input` (`border-2 border-black shadow-brutal-sm`) with a leading inline-SVG key
  icon. Submit button = `.b-btn` pink (`bg-primary text-white border-2 border-black shadow-brutal`
  → `hover:shadow-brutal-lg hover:-translate-y-1` → `active:translate + shadow-none`) with
  `hover-tilt-shake`.
- **Result view** (`animate-reveal-up` on mount):
  - Header: key prefix (pink mono) + name; Active/Disabled brutalist badge (green/red, black
    border, `shadow-brutal-sm`).
  - Base URL block: bordered card + brutalist CopyButton.
  - Token usage bar: thick track `border-2 border-black`, fill colored by percent
    (pink < 70 / yellow 70–90 / red > 90), `animate-pulse-soft` while active; label +
    `resetsAt` below.
  - Stat grid (Total Requests / Total Tokens / Cached / Est. Cost): each a
    `border-2 border-black shadow-brutal` tile, hover-lift, accent-tinted with the
    `--brutal-*` colors.
  - Usage by Model + Allowed Models chips: `.b-chip` (`border-2 border-black shadow-brutal-sm`,
    click-to-copy retained).
  - How to Use tabs: brutalist toggle buttons (active = pink filled + shadow); `<pre>` code
    blocks with black border.
  - Refresh (spin SVG while refreshing) + Check Another Key: brutalist buttons.
- **Global click-spark**: a `useEffect` ported from mocasus `AppShell` spawns pink spark
  particles on any click within the page; respects `prefers-reduced-motion`; particles
  self-remove on `animationend`; listener cleaned up on unmount.

## Animations (scoped in brutal.css)

`float`, `reveal-up`, `pulse-soft`, `spin-slow`, `tilt-shake` (hover), `click-spark-fly`
+ `.click-spark-particle`, plus `shadow-brutal` hover-lift transitions. All wrapped in a
`@media (prefers-reduced-motion: reduce)` guard that disables them.

## Error handling & edge cases

- Error message → brutalist alert (red-tinted bg, black border, `shadow-brutal-sm`).
- Preserve all existing null-guards: `result.percent != null` → "Unlimited",
  `limit?.toLocaleString() || "∞"`, `allowedModels?.length` → "All models allowed",
  optional chaining on `totalTokens`/`perModel`.
- Click-spark listener removed on unmount; particles auto-cleanup.

## Testing / verification

No unit tests exist for this presentational page. Verify by:

1. `npx eslint src/app/check-usage/page.js` — no lint errors.
2. Run dev (`PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev`),
   open `/check-usage`:
   - form renders in brutalist style;
   - a key check renders the result card (`animate-reveal-up`);
   - animations fire (float hero, hover-lift, click-spark, refresh spin, pulse bar);
   - navigate to `/dashboard` (dark) and confirm it is visually unaffected.

## Out of scope

- No changes to `/api/public/check-usage` or any quota logic.
- No new npm dependencies.
- No changes to the dashboard theme, `globals.css`, or `layout.js`.
- No dark-mode variant of the brutalist page (intentionally always light).
