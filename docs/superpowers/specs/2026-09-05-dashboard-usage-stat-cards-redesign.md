# Design: Redesign Usage Stat Cards in apps/dashboard to Match /check-usage Brutalist Design

**Date:** 2026-09-05  
**Topic:** OmniRoute / AI Router Usage Stat Cards Redesign  
**Project:** `afandiaziz.my.id/apps/dashboard`  
**Status:** Approved  

---

## 1. Overview & Goals

Redesign the 8 primary usage metric cards in `apps/dashboard/app/(dashboard)/web-tools/omniroute/usage/page.tsx` (served on `/web-tools/ai-router/usage` and `/web-tools/omniroute/usage`) to adopt the exact brutalist visual aesthetics, typography, icon plate rotation, and pastel palettes from the `/check-usage` page in `_9router-fork`.

### The 8 Cards:
1. **Total Requests (`requests`)**: `#` (Hashtag icon), yellow pastel theme.
2. **Total Tokens (`tokens`)**: Lightning bolt icon, blue pastel theme.
3. **Input Tokens (`input`)**: Arrow down tray icon, blue pastel theme.
4. **Output Tokens (`output`)**: Arrow up dispatch icon, orange pastel theme.
5. **Cached Tokens (`cached`)**: Database cylinder stack icon, green pastel theme.
6. **Cache Read (`cacheRead`)**: Database hit icon, green pastel theme.
7. **Cached Write (`cacheCreation`)**: Sparkles icon, pink pastel theme.
8. **Est. Cost (`cost`)**: Currency dollar coin icon, purple pastel theme.

---

## 2. Component Design & Styling

### 2.1 StatCard Component Anatomy
Matches the `/check-usage` card from 9router:
- Container: `.b-card.shadow-brutal.hover-lift.p-3.5` with custom pastel background (`hsl(var(--brutal-*) / 0.55)`).
- Icon Plate: `.b-icon-plate` size-10 (40x40px), rounded-md (0.5rem), border-2 border-black, shadow-brutal-sm (`2px 2px 0 #000`), rotated `-4deg`, with matching solid pastel plate background.
- Label: uppercase, bold/black font, tracking-wider, text-[11px].
- Value: text-2xl font-black, tabular-nums.
- Subtext: text-[11px] font-mono font-semibold, top border separator `border-t-2 border-black/15 pt-1.5 mt-2`.

### 2.2 Grid Layout
- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`:
  - Row 1: Requests, Total Tokens, Input Tokens, Output Tokens
  - Row 2: Cached Tokens, Cached Read, Cached Write, Est. Cost

---

## 3. Deployment & Git Target
- Repository: `D:\_\react\next-js\afandiaziz.my.id` (Worktree: `C:\Users\afand\AppData\Local\Temp\afandiaziz-model-resolver`).
- Target Branch: `main`.
- Actions: Run tests, commit, push to `origin main`, triggering GitHub Actions `deploy.yml`.
