# Design: All Time Usage Tokens Card & Public API Access for /check-usage

**Date:** 2026-09-05  
**Topic:** Check Usage Dual-Card Layout & OmniRoute All-Time Stats Integration  
**Status:** Approved  

---

## 1. Overview & Goals

Extend `/check-usage` in 9router to display a dual-card layout side-by-side on desktop:
1. **Left Side (Quota Sharing):** Contains the full-width action buttons (Refresh & Check Another Key) and the existing quota details card (`b-card shadow-brutal p-6`).
2. **Right Side (All Time Usage Tokens):** A new card matching the exact same brutalist styling (`b-card shadow-brutal p-6`) displaying all-time token metrics fetched directly from `https://dashboard.afandiaziz.dev/api/omniroute/usage-stats`.

### Required Metrics from `response.data.totals`:
1. `tokens` (Total Tokens)
2. `input` (Input Tokens)
3. `output` (Output Tokens)
4. `cached` (Total Cached)
5. `cacheRead` (Cache Read)
6. `cacheCreation` (Cache Creation)
7. `reasoning` (Reasoning Tokens)
8. `requests` (Total Requests)
9. `successes` (Successes)
10. `cost` (Est. Cost)

Each stat card will use the same brutalist card style (`b-card shadow-brutal hover-lift p-3`) with pastel backgrounds and themed SVG icons.

---

## 2. Architecture & Changes

### 2.1 Backend / API Changes in `D:\_\react\next-js\afandiaziz.my.id` (Branch `main`)
Currently, `https://dashboard.afandiaziz.dev/api/omniroute/usage-stats` responds with `307 Temporary Redirect to /login` because Next.js Supabase middleware redirects unauthenticated requests, and the route itself requires an active user session (`!user -> 401`).

**Changes in `afandiaziz.my.id`:**
1. **`apps/dashboard/lib/supabase/middleware.ts`:**
   - Add `/api/omniroute/usage-stats` to `PUBLIC_PATHS` (or bypass `pathname.startsWith('/api/omniroute/usage-stats')`).
   - Immediately pass through any `OPTIONS` request without redirecting to `/login`.
2. **`apps/dashboard/app/api/omniroute/usage-stats/route.ts`:**
   - Implement CORS headers:
     - Allowed origins: `https://9router.afandiaziz.my.id`, `http://localhost:*`, `http://127.0.0.1:*`, `https://*.afandiaziz.dev`, or fallback wildcard when called server-to-server.
   - Implement `OPTIONS(request: Request)` handler returning `204 No Content` with:
     - `Access-Control-Allow-Origin: <origin>`
     - `Access-Control-Allow-Methods: GET, OPTIONS`
     - `Access-Control-Allow-Headers: Content-Type, Authorization`
     - `Access-Control-Max-Age: 86400`
   - In `GET(request: Request)`:
     - Remove the mandatory `if (!user) return 401;` check so this read-only aggregated usage report can be consumed publicly by the 9router dashboard.
     - Attach the CORS `Access-Control-Allow-Origin` header to the returned JSON response.
3. **Deploy:**
   - Verify unit tests: `npm test` / `vitest` in `apps/dashboard`.
   - Commit to `main` and push to `origin main` to trigger GitHub Actions deployment (`deploy.yml`).

---

### 2.2 Frontend Changes in `9router` (`D:\_\_9router-fork`)

1. **Page Container:**
   - Expand `max-w-5xl` to `max-w-7xl` in `src/app/check-usage/page.js` to give both columns generous room on wide screens (`xl:grid-cols-2`).
2. **Outer Layout in `div.space-y-4.animate-reveal-up`:**
   ```jsx
   <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
     {/* Left Column: Quota Sharing Card & Actions */}
     <div className="space-y-4">
       {/* Actions: Refresh & Check Another Key */}
       {/* Quota Card: b-card shadow-brutal p-6 */}
     </div>

     {/* Right Column: All Time Usage Tokens Card */}
     <div className="b-card shadow-brutal p-6 space-y-5">
       {/* Header: All Time Usage Tokens */}
       {/* 10 Stat Cards */}
     </div>
   </div>
   ```
3. **All Time Card Lifecycle:**
   - On component mount, fetch `https://dashboard.afandiaziz.dev/api/omniroute/usage-stats`.
   - Handle loading state with brutalist card skeletons.
   - Handle error state gracefully (`b-alert` with retry button) without blocking or affecting the quota card on the left.
   - Display all 10 stat cards with proper number formatting (`compactNum` or `toLocaleString()`).

---

## 3. Testing & Verification

1. **API Verification:**
   - Use `curl -i` to verify `OPTIONS` and `GET` on `https://dashboard.afandiaziz.dev/api/omniroute/usage-stats` return HTTP 200 with CORS headers.
2. **Unit & DOM Tests in `9router`:**
   - Run `npx vitest run unit/check-usage-dom.test.js`.
   - Verify build completes successfully with `npm run build`.
   - Run regression check `tests/__baseline__/verify-no-regression.mjs`.
