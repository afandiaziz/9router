# Design: Check-Usage 2-Column Responsive Layout & Model Usage Enhancements

**Date:** 2026-09-04  
**Topic:** Check Usage 2-Column Grid & Enhanced Model Usage  
**Status:** Approved  

---

## 1. Overview & Goals

Restructure `/check-usage` from a single long vertical stack into a high-density, 2-column brutalist layout housed inside a single main card. 

### Key Goals:
1. **Single Outer Card with 2-Column Grid:** Keep exactly one outer wrapper card (`b-card shadow-brutal p-6`), and split the contents into 2 responsive columns (`grid grid-cols-1 lg:grid-cols-2 gap-6 items-start`).
2. **Column 1 (Left):**
   - Header (Quota Name & Active/Disabled Status Badge).
   - Base URL card with copy button.
   - Token Usage progress bar, used/limit count, and reset timestamp.
   - Allowed Models section located directly below Token Usage.
3. **Column 2 (Right on Desktop) / Adaptive Placement (on Mobile):**
   - **Desktop (`lg:grid-cols-2`):**
     - Top of right column: Detail Usage Quota Tokens (4 Stat Cards in `grid-cols-2 gap-3`: Total Requests, Total Tokens, Cached Tokens, Est. Cost).
     - Bottom of right column: Section "Usage by Model".
   - **Mobile (`grid-cols-1`):**
     - Detail Usage Quota Tokens (4 Stat Cards) appears directly below the Token Usage progress bar, before Allowed Models.
4. **Action Buttons ("Atas Penuh"):**
   - Refresh & Check Another Key buttons span full width at the top above the main card.
5. **Usage by Model Enhancements:**
   - Sort models descending by `(total tokens + cached tokens)` used.
   - Format: Left shows model name; Right shows total tokens in bold, with a secondary monospaced line detailing `Tokens: X · Cached: Y`.
   - Max height set to hold exactly 5 models (~310px); vertically scrollable (`overflow-y-auto`) with custom brutalist scrollbar if more than 5 models exist.

---

## 2. Architecture & Data Flow

### 2.1 Backend Aggregation (`src/lib/db/repos/quotaUsageReport.js`)
Currently, `quotaUsageReport.js` only aggregates total `cachedRead` and `cachedWrite` for the entire API key, while `perModelMap` only stores `{ model, tokens }`.

**Changes:**
1. In the `rows` loop of `buildUsageReport`:
   ```javascript
   const tokens = parseJson(r.tokens, {});
   const cached = parseCachedTokens(tokens);
   const modelCached = cached.cachedRead + cached.cachedWrite;

   if (!perModelMap[model]) {
     perModelMap[model] = { model, tokens: 0, cachedTokens: 0 };
   }
   perModelMap[model].tokens += (Number(r.promptTokens) || 0) + (Number(r.completionTokens) || 0);
   perModelMap[model].cachedTokens += modelCached;
   ```
2. When constructing `perModel`:
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

---

## 3. Frontend Layout & Styling

### 3.1 Page Container
- Container expands from `max-w-3xl` to `max-w-5xl` for desktop comfort while retaining mobile padding.

### 3.2 Action Buttons Bar
- Positioned above the outer card:
  ```jsx
  <div className="flex gap-3 mb-4 w-full">
    <button onClick={handleRefresh} disabled={refreshing} className="b-btn flex-1">...</button>
    <button onClick={handleReset} className="b-btn-ghost flex-1">Check Another Key</button>
  </div>
  ```

### 3.3 Main Outer Card & Responsive Grid
```jsx
<div className="b-card shadow-brutal p-6">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
    {/* Column 1 (Left) */}
    <div className="space-y-5">
      {/* Header */}
      {/* Base URL */}
      {/* Token Usage Bar */}
      
      {/* Stat Cards - Mobile only (shown under Token Usage on mobile) */}
      <div className="block lg:hidden">
        {statCardsElement}
      </div>

      {/* Allowed Models */}
      {allowedModelsElement}
    </div>

    {/* Column 2 (Right) */}
    <div className="space-y-5">
      {/* Stat Cards - Desktop only (shown at top of right column) */}
      <div className="hidden lg:block">
        {statCardsElement}
      </div>

      {/* Usage by Model */}
      {usageByModelElement}
    </div>
  </div>
</div>
```

### 3.4 Usage by Model Item & Scrollable Container
- Container: `.b-model-usage-list` with `max-height: 310px; overflow-y: auto;`.
- Scrollbar: brutalist themed styling (`scrollbar-width: thin; scrollbar-color: #000 hsl(var(--muted));`).
- Each item card:
  ```jsx
  <div key={i} className="flex justify-between items-center b-card shadow-brutal-sm p-2.5">
    <div className="min-w-0 pr-2">
      <span className="font-mono text-sm font-bold block truncate">{m.model}</span>
    </div>
    <div className="text-right shrink-0">
      <span className="font-mono text-sm font-bold block">
        {m.totalWithCached.toLocaleString()} total
      </span>
      <span className="font-mono text-xs text-muted-foreground block">
        Tokens: {m.tokens.toLocaleString()} · Cached: {m.cachedTokens.toLocaleString()}
      </span>
    </div>
  </div>
  ```

---

## 4. Verification & Testing

1. **Unit Tests:**
   - Verify `buildUsageReport` aggregates `cachedTokens` and `totalWithCached` per model.
   - Verify `perModel` sorting is descending by `totalWithCached`.
2. **DOM / Build Tests:**
   - Verify layout builds cleanly with `npm run build`.
   - Verify responsive classes (`hidden lg:block`, `block lg:hidden`, `grid grid-cols-1 lg:grid-cols-2`).
3. **No-Regression Gate:**
   - Verify `node tests/__baseline__/verify-no-regression.mjs` remains green.
