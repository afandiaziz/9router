# Design: Allowed Models Capabilities Display in /check-usage

**Date:** 2026-09-04  
**Topic:** Check Usage Allowed Models Capabilities  
**Status:** Approved  

---

## 1. Problem Statement

On the `/check-usage` page (public brutalist quota monitor for `sk-danton-*` keys), the "Allowed Models" section currently displays allowed models as plain chips containing only the model alias or ID. Users cannot see what capabilities each permitted model supports (e.g. vision, reasoning/thinking, tool calling, multimodal audio/video, image output, PDF input).

## 2. Goals & Non-Goals

### Goals
- Display capability badges/chips under each allowed model in `/check-usage`.
- Support the 8 specified capabilities:
  1. Vision (image input)
  2. Reasoning / thinking
  3. Tool calling
  4. PDF input
  5. Image output
  6. Audio input
  7. Video input
  8. Audio output
- Present each capability with a representative SVG icon and descriptive text label.
- Specifically:
  - Vision icon: eye / observing eye.
  - Reasoning icon: brain / cognitive lobes.
- Match existing brutalist visual identity (Space Grotesk / monospace typography, 2px borders, hard drop shadows, high-contrast pastel plates).
- Ensure the model name is rendered in **one single line** (`white-space: nowrap`) **without truncation, without ellipsis, and without horizontal scrolling**.
- Typography scale:
  - Model name: default 14px / font-weight 800, auto-fitting down to ~11px if required by viewport width.
  - Copy button: 12px / font-weight 800 (fixed size, never shrinks below capability chips).
  - Capability chips: 9px / font-weight 700.
  - Model name and Copy button font sizes are strictly larger than capability chips.
- When a model has no active capabilities, display only the model card with its name and Copy button; do NOT display an empty chip container or any "unavailable" text.
- If `allowedModels` is empty, keep existing "All models allowed" fallback.

### Non-Goals
- Editing model capabilities from `/check-usage` (this is a read-only public status page).
- Touching the admin dashboard models table (`/dashboard/models`) or other pages.
- Database schema changes.

---

## 3. Architecture & Data Flow

### 3.1 Backend: Capability Resolution & Payload
1. **Source of Truth:**
   - Base capabilities: `open-sse/providers/capabilities.js` (`getCapabilitiesForModel(provider, model)`).
   - User/catalog overrides: SQLite `kv` table with `scope = 'modelCaps'` (accessed via `getCapsOverrides()` from `src/lib/db/index.js`).
   - Combos in allowedModels: `getConservativeComboCapabilities` from `open-sse/providers/capabilities.js`.
2. **API Endpoint (`src/app/api/public/check-usage/route.js`):**
   - Injects a capability resolver function into `buildUsageReport(...)`.
   - The resolver takes the raw allowed model item `{ model, alias }`, inspects combo definitions or provider/model prefixes, queries `getCapabilitiesForModel` + `getCapsOverrides()`, and returns a boolean object:
     ```js
     {
       vision: boolean,
       reasoning: boolean,
       tools: boolean,
       pdf: boolean,
       imageOutput: boolean,
       audioInput: boolean,
       videoInput: boolean,
       audioOutput: boolean
     }
     ```
3. **Usage Report Builder (`src/lib/db/repos/quotaUsageReport.js`):**
   - Maps each entry of `allowedModels` to:
     ```js
     {
       model: entry.alias || entry.model,
       rawModel: entry.model,
       caps: resolvedCaps
     }
     ```
   - Maintains backward compatibility if consumer only inspects `.model`.

---

## 4. Frontend UI & Interaction Design

### 4.1 Allowed Models Container
- Replaces the simple `.flex.flex-wrap` of plain chips with a list of brutalist model cards: `.b-model-card`.
- Cards maintain responsive layout: stack vertically in single column or 2-column grid on desktop while ensuring ample horizontal width for model names.

### 4.2 Single-Line Auto-Fit Typography (No Ellipsis, No Scroll)
- Container: `.b-model-card-head` with `display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;`.
- Title wrapper: `.b-model-name-wrapper` with `flex: 1; min-width: 0; overflow: hidden;`.
- Title element: `.b-model-name` with:
  ```css
  white-space: nowrap;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--fit-size, clamp(11px, 2.2vw, 14px));
  ```
- An inline client-side hook/measurement measures text scrollWidth vs clientWidth and adjusts `--fit-size` down if necessary, stopping at a strict floor of 11px so it remains clearly larger than the 9px capability text.
- No `text-overflow: ellipsis` and no `overflow-x: auto` on the title row.

### 4.3 Copy Button
- Distinct brutalist interactive button next to model name.
- Font size: `12px`, font weight: `800`.
- Clicking copies the display model name and triggers a quick `✓ Copied` visual confirmation.

### 4.4 Capability Badges (8 Types)
Rendered as `.b-cap-chip` with 1.5px border, rounded pill (9999px), 1.5px hard shadow, 9px bold uppercase/title text, matching SVG icon:
1. **Vision (image input):** Eye icon (`<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>`), pastel blue bg (`hsl(210 90% 80%)`).
2. **Reasoning / thinking:** Brain icon (cerebral lobes with dual hemispheric folds), pastel yellow bg (`hsl(50 95% 75%)`).
3. **Tool calling:** Crossed wrench/hammer or tool icon, pastel green bg (`hsl(150 75% 78%)`).
4. **PDF input:** Document with PDF fold/lines icon, pastel coral bg (`hsl(10 90% 82%)`).
5. **Image output:** Picture frame / landscape icon, pastel purple bg (`hsl(270 80% 84%)`).
6. **Audio input:** Microphone / waveform frequency bars icon, pastel orange bg (`hsl(30 95% 80%)`).
7. **Video input:** Video camera / reel icon, pastel cyan bg (`hsl(185 80% 78%)`).
8. **Audio output:** Speaker with sound wave icon, pastel pink bg (`hsl(340 85% 82%)`).

---

## 5. Error Handling & Edge Cases

1. **Unknown Model / Missing Metadata:**
   - Capabilities resolve to all `false`.
   - Model card renders only the model name and copy button. No chip list, no placeholder text.
2. **Empty `allowedModels`:**
   - Renders "All models allowed" (existing behavior preserved).
3. **Legacy String Entry:**
   - If `allowedModels` contains raw strings `["model-a"]` instead of objects, code handles `typeof m === "string" ? { model: m } : m` without throwing.
4. **Combos:**
   - Resolved using intersection/minimal capabilities so capabilities shown accurately reflect what every underlying model supports.

---

## 6. Testing & Verification

1. **Unit Tests (`tests/unit/check-usage-capabilities.test.js`):**
   - Test capability resolution in `quotaUsageReport.js` for:
     - Standard multimodal models (e.g. `gemini-3.7-flash` -> vision: true, reasoning: true, tools: true).
     - Text-only / unknown models -> empty/false caps.
     - Custom override merging from `modelCaps`.
2. **Visual & Browser Verification:**
   - Verify rendered page on `/check-usage` with real test key.
   - Check mobile/narrow viewport: verify model name stays in 1 line without ellipsis and without horizontal scrollbars.
   - Verify Eye icon for Vision and Brain icon for Reasoning.
   - Verify font hierarchy: Model Name (11px-14px) > Copy button (12px) > Capability chips (9px).
3. **Regression Suite:**
   - Run `npx vitest run` on affected units to ensure zero regression.
