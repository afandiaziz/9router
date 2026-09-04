# All Time Usage Tokens Card & Public API Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unlock public read access and CORS for `https://dashboard.afandiaziz.dev/api/omniroute/usage-stats` in `afandiaziz.my.id`, push to `main` for redeploy, and build a dual-card layout on `/check-usage` in `9router` with an "All Time Usage Tokens" card showing 10 brutalist stat cards matching the existing design.

**Architecture:** In `afandiaziz.my.id`, update `apps/dashboard/lib/supabase/middleware.ts` to allow `/api/omniroute/usage-stats` and `OPTIONS` without login, update `apps/dashboard/app/api/omniroute/usage-stats/route.ts` with CORS headers and public read-only fallback, commit and push to `origin main`. In `9router`, update `src/app/check-usage/page.js` to expand container to `max-w-7xl`, split `div.space-y-4.animate-reveal-up` into a 2-column grid (`grid grid-cols-1 xl:grid-cols-2 gap-6 items-start`) with quota sharing on the left and the new All Time Usage card on the right fetching from the API.

**Tech Stack:** Next.js (App Router), TypeScript/JavaScript, Tailwind CSS, brutal.css, SQLite, Vitest, Docker.

## Global Constraints

- Sisi kiri: container `div.space-y-4` memuat tombol actions (`div flex gap-3 w-full`) dan kartu kuota saat ini (`div b-card shadow-brutal p-6`).
- Sisi kanan: kartu baru dengan css pembungkus yang sama (`div b-card shadow-brutal p-6`).
- Header kartu kanan: div header `"All Time Usage Tokens"` dan subtext `"Aggregated across OmniRoute & 9router"`.
- Menampilkan semua 10 statistik dari `response.data.totals`: `tokens`, `input`, `output`, `cached`, `cacheRead`, `cacheCreation`, `reasoning`, `requests`, `successes`, `cost`.
- Setiap kartu statistik menggunakan style yang sama persis: `b-card shadow-brutal hover-lift p-3`.
- CORS di `afandiaziz.my.id` harus mengizinkan `https://9router.afandiaziz.my.id` dan `http://localhost:*` serta `http://127.0.0.1:*`.
- Semua perubahan di `afandiaziz.my.id` di-commit dan di-push ke branch `main`.

---

## File Structure & Responsibilities

### Repository `afandiaziz.my.id` (`C:/Users/afand/AppData/Local/Temp/afandiaziz-model-resolver` - branch `main`):
- **Modify:** `apps/dashboard/lib/supabase/middleware.ts`
  - Allow `/api/omniroute/usage-stats` without Supabase auth redirect.
  - Bypass `OPTIONS` requests from redirect.
- **Modify:** `apps/dashboard/app/api/omniroute/usage-stats/route.ts`
  - Export `OPTIONS` handler with CORS headers.
  - Allow public read-only in `GET` with CORS headers attached.
- **Modify:** `apps/dashboard/app/api/omniroute/usage-stats/route.test.ts`
  - Update tests to assert CORS headers and public access without user session.

### Repository `9router` (`D:/_/_9router-fork` - branch `master`):
- **Modify:** `src/app/check-usage/page.js`
  - Expand container to `max-w-7xl`.
  - Wrap results in `grid grid-cols-1 xl:grid-cols-2 gap-6 items-start`.
  - Left column: Actions + Quota Sharing Card.
  - Right column: New "All Time Usage Tokens" Card with 10 Stat Cards and brutalist icons.
  - Add client-side fetch, loading skeletons, and error handling for the all-time stats API.
- **Test:** `tests/unit/check-usage-all-time-dom.test.js`
  - Test verifying presence of dual-column layout, all 10 metric labels, and All Time Usage header.

---

### Task 1: Unlock Public Access and CORS for OmniRoute Usage Stats in `afandiaziz.my.id`

**Files:**
- Modify: `C:/Users/afand/AppData/Local/Temp/afandiaziz-model-resolver/apps/dashboard/lib/supabase/middleware.ts`
- Modify: `C:/Users/afand/AppData/Local/Temp/afandiaziz-model-resolver/apps/dashboard/app/api/omniroute/usage-stats/route.ts`
- Modify: `C:/Users/afand/AppData/Local/Temp/afandiaziz-model-resolver/apps/dashboard/app/api/omniroute/usage-stats/route.test.ts`

- [ ] **Step 1: Write failing/updated test in `apps/dashboard`**

In `apps/dashboard/app/api/omniroute/usage-stats/route.test.ts`:
Add tests for unauthenticated GET returning 200 with CORS headers, and OPTIONS returning 204.

```typescript
  it('allows unauthenticated GET requests with CORS headers', async () => {
    auth.user = null; // No user session
    const req = new Request('http://localhost:3000/api/omniroute/usage-stats', {
      headers: { Origin: 'https://9router.afandiaziz.my.id' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://9router.afandiaziz.my.id');
    const json = await res.json();
    expect(json).toHaveProperty('totals');
  });

  it('handles CORS OPTIONS preflight with status 204', async () => {
    const { OPTIONS } = await import('./route');
    const req = new Request('http://localhost:3000/api/omniroute/usage-stats', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:20128' },
    });
    const res = await OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:20128');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });
```

- [ ] **Step 2: Update `apps/dashboard/lib/supabase/middleware.ts`**

Update `updateSession`:
```typescript
function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/api/omniroute/usage-stats')) return true;
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
```
And handle preflight:
```typescript
  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }
```

- [ ] **Step 3: Update `apps/dashboard/app/api/omniroute/usage-stats/route.ts`**

Implement CORS helper, `OPTIONS` handler, and public read in `GET`:

```typescript
function getCorsHeaders(request: Request) {
  const origin = request.headers.get('origin') || '*';
  const isAllowed =
    origin === '*' ||
    origin === 'https://9router.afandiaziz.my.id' ||
    origin.endsWith('.afandiaziz.dev') ||
    origin.endsWith('.afandiaziz.my.id') ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://9router.afandiaziz.my.id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if ((from && !isIsoDate(from)) || (to && !isIsoDate(to))) {
    return NextResponse.json({ error: 'from/to must be YYYY-MM-DD' }, { status: 400, headers: corsHeaders });
  }

  try {
    const data = collectUsageStats(from, to);
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Query failed';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status, headers: corsHeaders });
  }
}
```

- [ ] **Step 4: Run tests and verify**

Run: `cd apps/dashboard && npx vitest run app/api/omniroute/usage-stats/route.test.ts`
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit and push to `main` in `afandiaziz.my.id`**

```bash
git add apps/dashboard/lib/supabase/middleware.ts apps/dashboard/app/api/omniroute/usage-stats/route.ts apps/dashboard/app/api/omniroute/usage-stats/route.test.ts
git commit -m "feat(omniroute): enable public read and CORS for usage-stats API"
git push origin main
```

---

### Task 2: Implement "All Time Usage Tokens" Card & Dual-Column Layout in `9router`

**Files:**
- Modify: `src/app/check-usage/page.js`
- Test: `tests/unit/check-usage-all-time-dom.test.js`

- [ ] **Step 1: Write DOM test in `tests/unit/check-usage-all-time-dom.test.js`**

```javascript
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("check-usage dual card layout & all-time stats", () => {
  it("contains All Time Usage Tokens card header and dual card layout", () => {
    const pageSrc = readFileSync(new URL("../../src/app/check-usage/page.js", import.meta.url), "utf8");

    expect(pageSrc).toContain("All Time Usage Tokens");
    expect(pageSrc).toContain("grid-cols-1 xl:grid-cols-2");
    expect(pageSrc).toContain("https://dashboard.afandiaziz.dev/api/omniroute/usage-stats");
  });

  it("references all 10 totals metrics in all-time section", () => {
    const pageSrc = readFileSync(new URL("../../src/app/check-usage/page.js", import.meta.url), "utf8");

    expect(pageSrc).toContain("cacheCreation");
    expect(pageSrc).toContain("cacheRead");
    expect(pageSrc).toContain("cached");
    expect(pageSrc).toContain("cost");
    expect(pageSrc).toContain("input");
    expect(pageSrc).toContain("output");
    expect(pageSrc).toContain("reasoning");
    expect(pageSrc).toContain("requests");
    expect(pageSrc).toContain("successes");
    expect(pageSrc).toContain("tokens");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tests && npx vitest run unit/check-usage-all-time-dom.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement All Time Card and Dual Layout in `src/app/check-usage/page.js`**

1. Define additional icons in `StatIcons`:
   - `input` (Arrow Down)
   - `output` (Arrow Up)
   - `success` (Check circle)
   - `cacheCreation` (Sparkles / Plus)
   - `reasoning` (Brain icon)
2. Add state for `allTimeStats`, `allTimeLoading`, `allTimeError`.
3. Fetch `https://dashboard.afandiaziz.dev/api/omniroute/usage-stats` on mount or result arrival.
4. Structure the `xl:grid-cols-2` layout inside `div.space-y-4.animate-reveal-up`:
   - Left side: Action buttons (`w-full flex gap-3`) + Quota card (`b-card shadow-brutal p-6`).
   - Right side: All Time Usage Tokens card (`b-card shadow-brutal p-6`).
5. Render all 10 metric cards with `StatCard`.

- [ ] **Step 4: Run test and build to verify it passes**

Run: `cd tests && npx vitest run unit/check-usage-all-time-dom.test.js`
Run: `npm run build` from `9router` root.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/check-usage/page.js tests/unit/check-usage-all-time-dom.test.js
git commit -m "feat(check-usage): add all-time usage tokens card and 2-column container layout"
```

---

### Task 3: Verification, Release & Redeploy

- [ ] **Step 1: Test live API with curl**

```bash
curl -s -i "https://dashboard.afandiaziz.dev/api/omniroute/usage-stats" -H "Origin: https://9router.afandiaziz.my.id"
```
Verify status is HTTP 200 with `Access-Control-Allow-Origin: https://9router.afandiaziz.my.id`.

- [ ] **Step 2: Run full regression tests in `9router`**

Run: `node tests/__baseline__/verify-no-regression.mjs`
Expected: 0 new regressions.

- [ ] **Step 3: Push `master` and create release tag `v0.5.65-fork40`**

```bash
git push origin master
git tag -a v0.5.65-fork40 -m "v0.5.65-fork40: dual-card check-usage with all-time usage tokens"
git push origin v0.5.65-fork40
```
Expected: GitHub Actions builds and deploys the new Docker image.
