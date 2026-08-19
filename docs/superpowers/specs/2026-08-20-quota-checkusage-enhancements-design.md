# Design — Quota Sharing "Copy key" + /check-usage enhancements

**Date:** 2026-08-20
**Author:** Afandi Aziz (with Claude Code)
**Status:** Approved — ready for implementation plan

## Goal

A batch of UI/behavior improvements across two areas:
1. Dashboard **Quota Sharing** cards — show the full key (dashboard is admin-only) and add a Copy-key button.
2. Public **/check-usage** page — content/color polish, bigger allowed-model chips with a copy animation, a real fill-grow + shimmer progress bar, and cookie-backed auto-fill + auto-load.

Guest exposure is unchanged: `/api/public/check-usage` still returns only the masked `keyPrefix`. Only the auth-protected dashboard reveals full keys.

## Decisions (from brainstorming)

| Topic | Decision |
|-------|----------|
| Copy-key source | Dashboard shows FULL key (not masked). Expose full `key` in `GET /api/quota-keys` (auth-protected). Guest `/check-usage` stays masked — never reveals full key. |
| Cookie behavior | **Auto-fill + auto-load**: on successful check, store key in cookie (expiry = `resetsAt`, fallback 30 days). On revisit, prefill input AND auto-fetch. On auto-fetch failure, clear cookie + fall back to form with error. "Check Another Key" clears the cookie. |
| Progress bar animation | **Fill-grow + shimmer**: fill grows 0% → target with easing on mount/refresh; a moving diagonal shimmer sweeps inside the fill. Both disabled under `prefers-reduced-motion`. |
| Stat card colors | Raise tint opacity from ~0.2–0.25 → **~0.55**, keep dark text. |
| Allowed-model chips | Font size `0.75rem` → **`0.9rem`**; add a click "pop" copy animation. |

## Context discovered (grounding)

- `GET /api/quota-keys` (`src/app/api/quota-keys/route.js`) deliberately strips the full key: `const { key, ...rest } = k` and returns only a masked `keyPrefix`. The full `sk-danton-…` is stored plaintext in `quotaKeys.key`.
- The dashboard card (`QuotaSharingClient.js`) currently renders `k.keyPrefix` (masked) and has actions: Disable/Enable, Edit, Regen, Delete. The existing "Key Created" modal already has a working `copyKey()` using `navigator.clipboard`.
- `/check-usage` (`src/app/check-usage/page.js`) already computes `barColor` and already renders `m.alias || m.model` in Usage by Model.
- **Alias in `perModel` is ALREADY resolved server-side** (`quotaUsageReport.js` lines 51–58: `alias: entry?.alias || m.model`). So the "show alias if present" request needs NO code change — the page's existing `m.alias || m.model` with the `m.alias !== m.model` guard is correct. This spec only VERIFIES it renders; it is not a code task.
- The progress-bar "animation not working" is because the fill uses `.animate-pulse-soft` (an opacity pulse), not a width-fill/shimmer animation.
- `.b-chip` is a shared class used by allowed-model chips AND `CopyButton`/base-URL copy. Bumping its font size enlarges those too (acceptable — small labels).

## Files touched

| File | Change |
|------|--------|
| `src/app/api/quota-keys/route.js` | `GET` returns full `key` alongside `keyPrefix` (dashboard-only). |
| `src/app/(dashboard)/dashboard/quota-sharing/QuotaSharingClient.js` | Card shows full key (mono, truncate, select-all); add Copy-key button with copied state. |
| `src/app/check-usage/page.js` | Header name/keyPrefix emphasis swap; readable colors for tokensUsed/limit/resetsAt; stat-card tint ~0.55; fill-grow+shimmer progress bar (width via state/effect); cookie auto-fill+auto-load; chip copy-pop class. |
| `src/app/check-usage/brutal.css` | `.b-chip` font-size → 0.9rem; `@keyframes` for shimmer + chip copy-pop; `.b-progress-fill` transition + `.b-progress-shimmer`; reduced-motion guards. |

## Detailed changes

### A. Dashboard Quota Sharing

**A1. `GET /api/quota-keys`** — include full key:
- Replace the destructure that drops `key` with a shape that keeps both:
  `{ ...rest, key, keyPrefix: <masked>, progress: p }`.
- POST/PATCH/PUT/regenerate endpoints unchanged.

**A2. Card (`QuotaSharingClient.js`)**:
- Replace the masked `<div className="font-mono text-xs text-text-muted">{k.keyPrefix}</div>` with the full key: mono, `text-xs`, `break-all`/`truncate`, `select-all`, plus a small inline Copy control.
- Add a **Copy** button in the actions row (leftmost, before Disable): `variant="ghost" size="sm"`, label toggles "Copy" → "✓ Copied" for ~1.5s. Copies `k.key`.
- Per-card copied state keyed by `k.id` (a `copiedId` state on the client component, since cards are rendered in a `.map`).

### B. /check-usage content + colors (`page.js`)

**B1. Usage by Model** — NO code change; verify existing `m.alias || m.model` renders the alias. Documented as verification only.

**B2. Header emphasis swap** — currently `keyPrefix` is primary-pink and `name` is muted. Swap:
- `name` → primary: `font-bold`, `color: hsl(var(--primary))`.
- `keyPrefix` → secondary: `font-mono`, `color: hsl(var(--muted-foreground))`, smaller.

**B3. Readable meta colors** — change `tokensUsed / limit` line and `resetsAt` line from `hsl(var(--muted-foreground))` to `hsl(var(--foreground))` (resetsAt may stay slightly smaller but full-foreground color).

**B4. Stat card tint ~0.55** — change the four inline backgrounds:
- Total Requests: `hsl(var(--brutal-yellow) / 0.55)`
- Total Tokens: `hsl(var(--brutal-blue) / 0.55)`
- Cached Tokens: `hsl(var(--brutal-green) / 0.55)`
- Est. Cost: `hsl(var(--brutal-purple) / 0.55)`
- Keep the inner label `<p>`s dark (they currently use `--muted-foreground`; on a more saturated tint that is still readable — keep as-is for the sub-labels, main numbers already `--foreground`).

### C. Allowed-model chips (`brutal.css` + `page.js`)

**C1. Bigger chips** — `.b-chip { font-size: 0.75rem → 0.9rem; padding: 0.3rem 0.6rem; }`.

**C2. Copy-pop animation** — add a `@keyframes brutal-copy-pop` (quick scale 1 → 1.12 → 1 rubber-ish) and a class `.b-chip-pop` applied for the duration of the "copied" state. The `Chip` component adds `b-chip-pop` while `copied` is true (drop it after the 1.5s timeout via the existing `copied` state). Guard under reduced-motion.

### D. Progress bar + cookie (`page.js` + `brutal.css`)

**D1. Fill-grow + shimmer**:
- CSS: `.b-progress-track` (the outer bar) unchanged structurally. `.b-progress-fill` gets `transition: width 0.8s cubic-bezier(0.16,1,0.3,1);` and `position: relative; overflow: hidden;`. A `.b-progress-fill::after` overlay animates a diagonal light sweep: `@keyframes brutal-shimmer { 0% { transform: translateX(-120%) skewX(-20deg);} 100% { transform: translateX(220%) skewX(-20deg);} }` looped ~2.8s.
- JS: the fill width must animate from 0 → target. Use a `barWidth` state initialized to `0`; after `result` is set, set `barWidth` to `result.percent` on the next frame (`requestAnimationFrame` or a `useEffect([result])` with a micro-delay) so the CSS transition runs. Remove `animate-pulse-soft` from the fill.
- Reduced-motion: skip the grow (set width immediately) and hide the shimmer.

**D2. Cookie auto-fill + auto-load**:
- Cookie name `qsk`. On successful `fetchUsage` (non-refresh AND refresh both fine, but write on the first successful check), set:
  `document.cookie = "qsk=" + encodeURIComponent(key) + "; expires=" + expiryUTC + "; path=/check-usage; SameSite=Strict"` where `expiryUTC` = `new Date(result.resetsAt).toUTCString()` if `resetsAt` present, else `now + 30 days`.
- On mount (`useEffect([])`): read `qsk` cookie; if present, `setKey(cookieVal)` and call `fetchUsage(cookieVal)` (auto-load). If that fetch returns an error (invalid/disabled/deleted key), clear the cookie (`qsk=; expires=Thu, 01 Jan 1970 …; path=/check-usage`) — the form is already shown because `result` stays null on error.
- "Check Another Key" button also clears the cookie (in addition to resetting `result`/`key`).
- SSR guard: cookie reads/writes only in effects/handlers (client-side), never during render.

## Error handling & edge cases

- Auto-load with a stale key → error path clears cookie, shows the form; no infinite loop (auto-load runs once on mount).
- `resetsAt` null (lifetime/unlimited) → cookie expiry falls back to 30 days.
- Copy on cards / chips: wrapped in try/catch (clipboard may reject); copied state still toggles only on success.
- Reduced-motion: shimmer + grow + copy-pop all disabled; bar shows final width instantly.
- The API change must not break existing quota-keys tests — if a test asserts the response omits `key`, update it intentionally (the decision is to expose it on the dashboard endpoint).

## Testing / verification

No unit tests for the two presentational pages. Verify:
1. `npx eslint src/app/check-usage/page.js src/app/(dashboard)/dashboard/quota-sharing/QuotaSharingClient.js src/app/api/quota-keys/route.js` — no errors.
2. Check existing quota-keys tests: `cd tests && npx vitest run unit/quota-keys-repo.test.js unit/quota-models.test.js` (and any test hitting `/api/quota-keys`) — keep green or update intentionally for the key-exposure change.
3. Dev server: `/check-usage` renders HTTP 200, progress bar grows + shimmers, chips larger + pop on copy, cookie set (check devtools) and auto-loads on reload; dashboard Quota Sharing shows full key + Copy works.

## Out of scope

- No change to `/api/public/check-usage` (guest stays masked).
- No new npm dependencies (icons inline SVG; cookies via `document.cookie`).
- No change to quota enforcement, DB schema, or the routing engine.
- No dark-mode variant of /check-usage (still always light brutalist).
