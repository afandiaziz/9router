# Merge v0.5.59 → Fork v0.5.55-fork28 Resolution Notes (2026-08-29)

## Overview
17 conflicts resolved between upstream v0.5.59 and fork v0.5.55-fork28:
- 1 modify/delete (commandcode.js executor deleted in fork, modified upstream)
- 1 add/add (system-inject.test.js fork 48 lines, upstream 491 lines)  
- 15 content conflicts across runtime files

## Conflict Patterns & Resolutions

### 1. Modify/Delete: open-sse/executors/commandcode.js
**Situation**: Fork deleted legacy NDJSON executor (commit `b71f0a8d`). Upstream added error-handling logic (commit `67d9182e`) for combo/account fallback on HTTP 200 streams with in-stream errors.

**Resolution**: Keep fork deletion. CommandCode migrated to OpenAI-compatible provider API (`/provider/v1/chat/completions`) instead of old endpoint (`/alpha/generate`). Upstream error-handling fix must be re-implemented in new transport if needed.

**Key Insight**: Never cherry-pick fixes to executors already refactored away. Look for migration commits first.

---

### 2. Add/Add: tests/unit/system-inject.test.js
**Situation**: Both branches created test file independently.
- Fork: 48 lines, minimal system injection tests
- Upstream: 491 lines, format-aware testing (Chat/Responses/Claude/Gemini/Kiro), idempotency, fail-open cases

**Resolution**: Take full upstream test suite. Requires corresponding implementation from `open-sse/rtk/systemInject.js` rewrite (308 lines added upstream).

**Key Insight**: Test divergence often signals larger behavior changes. Verify test coverage aligns with actual runtime contracts.

---

### 3. Content Conflicts Pattern A - Runtime Core

#### SystemInject (systemInject.js)
Upstream rewrite made format-aware: Chat `messages[]`, Responses `input[]`, Claude cache-control insertion, Gemini snake_case preservation, Kiro atomic rollback, frozen-body fail-open.

Fork had custom token saver injection. Solution: merge both intents by keeping upstream structure but adding fork-specific instruction injection path.

---

#### capabilities.js  
Both sides heavily diverged: fork adds combo capability calculation and provider overrides; upstream adds model registry sync from models.dev, vision patterns fallback, new models (GLM-5.3-Flash, DeepSeek V4 Vision, Grok 4.5/4.6).

Resolution strategy: Take upstream as base, then layer in combo capability logic below hand-written entries. Upstream is strictly additive; don't override manual rules.

---

#### Usage dispatch table (services/usage.js)
Upstream introduces `zed` handler, moves GLM to separate module (`glm.js`). Fork has opencode-go and commandcode handlers.

Resolution: Preserve all fork handlers, replace only GLM body with import from new module. Don't remove any existing dispatch keys.

---

#### Codex quota (services/usage/codex.js)
Upstream adds Spark rate limit tracking (`spark_session`, `spark_weekly`) and normalized reset credits structure. Fork had its own reset credit parsing.

Resolution: Include spark limits alongside existing normal/review paths. Take upstream resetCredits structure (`{ availableCount: number }`) over fork's simplified version.

---

#### OpenAI Responses translator (translator/request/openai-responses.js)
Upstream simplifies max_tokens normalization (takes any of max_output_tokens/max_completion_tokens/max_tokens, deletes legacy fields). Fork had toolChoice normalization logic.

Resolution: Use upstream normalization pattern but keep fork's toolChoice handling if present.

---

#### Usage tracking (utils/usageTracking.js)
Critical bug fix: nested `cached_tokens` path (`prompt_tokens_details.cached_tokens`). Without this, cache reads drop to zero and billing counts wrong.

Resolution: Always take upstream nested read even when other usage code differs.

---

### 4. Registry Files (index.js, opencode.js, xai.js)
All are auto-generated via project script. After resolving conflict markers (just need to clear them), regenerate using repository's expected generator.

Check AGENTS.md for command. Usually something like `npm run registry:generate`.

Don't manually merge these. Just get past markers, then regenerate.

---

### 5. Dashboard page (src/app/(dashboard)/dashboard/providers/[id]/page.js)
Upstream: bulk import modal for Grok CLI accounts. Fork: pagination, bulk enable/disable, DevIn provider integration.

Resolution: Both can coexist. Import modal is feature addition that doesn't conflict with pagination/state logic. Merge by taking fork's state management + upstream component imports.

---

## Verification Steps Post-Merge

```bash
# Check no unresolved conflicts
git diff --name-only --diff-filter=U || echo "clean"

# Run typecheck
npm run typecheck  # or yarn tsc

# Run affected unit tests  
npm test -- systemInject
npm test -- capabilities
npm test -- usage*
npm test -- cached-token-usage

# Regenerate registries if applicable
npm run registry:generate  # verify command in AGENTS.md
```

## Key Lessons

1. **Read commit messages before resolving** — upstream commits include rationale (e.g., "CommandCode returns errors as type:error event inside HTTP 200"). This determines whether a fix still applies after your fork's refactorations.

2. **Test divergence ≠ minor changes** — When one side has 48 lines vs 491 lines in test files, expect massive behavioral divergence in production code. Check implementation file sizes too.

3. **Generated files = resolve markers then regenerate** — Don't spend time merging index/import lists. Clear markers, run the project's generator script.

4. **Usage tracking fixes are critical** — Nested field bugs affect billing correctness. Always prioritize upstream fixes here.

5. **Keep both intents when possible** — Fork's feature additions (combo capability, zed usage, Spark tracking) can coexist with upstream changes. The goal is union, not replacement.
