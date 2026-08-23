# Correct Combo Models Implementation Report

## Summary

Implemented LLM combos as ordinary editable rows on `/dashboard/models`, removed the embedded combo-management section, added combo-level capability/pricing/alias metadata handling, made aliases targeting `combo/<name>` routable through the canonical combo name, and added video/audio modality controls.

## TDD Evidence

### RED

Command:

```powershell
cd tests
npx vitest run unit/models-dashboard-collapse.test.js unit/dashboard-combo-management-structure.test.js unit/v1-models-caps-overrides.test.js unit/model-routing.test.js unit/edit-model-modal-capabilities.test.js
```

Outcome: failed as expected before implementation. Relevant failures included missing `comboModels.js`, embedded `ComboManagement` still present, missing `/api/combos` fetch, missing `videoInput`/`audioOutput`, missing combo-level override behavior, and missing alias-to-combo routing helper. The first root-level invocation also exposed the documented Windows test invocation/path issue; subsequent runs were executed from `tests/` as required by `CLAUDE.md`.

### GREEN

Command:

```powershell
cd tests
npx vitest run unit/models-dashboard-collapse.test.js unit/dashboard-combo-management-structure.test.js unit/v1-models-caps-overrides.test.js unit/model-combo-alias-routing.test.js unit/edit-model-modal-capabilities.test.js
```

Outcome: 5 files passed, 18 tests passed.

Adjacent regressions:

```powershell
cd tests
npx vitest run unit/combo-slash-resolve.test.js unit/model-routing.test.js unit/api-models-caps-merge.test.js
```

Outcome: combo-slash and API capability merge tests passed. `model-routing.test.js` assertions passed when run alone with retry, but the grouped Windows run intermittently failed during test cleanup with `EBUSY` unlinking the temporary SQLite database. This is a cleanup/file-lock issue, not an assertion failure.

## Implementation Files

- `src/app/(dashboard)/dashboard/models/comboModels.js`
  - Projects only no-kind/`llm` combos into the synthetic `combo` provider group.
  - Produces exact row identity and combo metadata.
  - Computes conservative member-derived static caps and combo-override effective caps.
- `src/app/(dashboard)/dashboard/models/page.js`
  - Fetches `/api/combos` in the initial request batch.
  - Integrates the synthetic combo group into existing grouping, search, collapse, and modal flows.
  - Removes embedded `ComboManagement` and divider.
  - Suppresses enable/disable and delete controls for combo rows.
- `src/app/(dashboard)/dashboard/models/EditModelModal.js`
  - Adds `videoInput` and `audioOutput` toggles.
- `src/shared/hooks/useModelCaps.js`
  - Preserves `audioInput`, `videoInput`, and `audioOutput` in selected caps.
- `src/app/api/v1/models/route.js`
  - Merges `combo|<name>` overrides over conservative combo caps, preserving false booleans and numeric values.
- `src/sse/services/model.js`
  - Adds `resolveComboRoute`, resolving aliases and canonical combo names.
- `src/sse/handlers/chat.js`
  - Uses canonical combo names for combo-specific strategy, fusion judge/tuning, and combo execution identity.

## Test Files

- `tests/unit/models-dashboard-collapse.test.js`
- `tests/unit/dashboard-combo-management-structure.test.js`
- `tests/unit/v1-models-caps-overrides.test.js`
- `tests/unit/model-combo-alias-routing.test.js`
- `tests/unit/edit-model-modal-capabilities.test.js`

## Lint and Validation

Focused lint excluding the two legacy React effect files completed cleanly:

```powershell
npx eslint src/app/(dashboard)/dashboard/models/comboModels.js src/app/api/v1/models/route.js src/shared/hooks/useModelCaps.js src/sse/services/model.js src/sse/handlers/chat.js tests/unit/dashboard-combo-management-structure.test.js tests/unit/models-dashboard-collapse.test.js tests/unit/v1-models-caps-overrides.test.js tests/unit/model-combo-alias-routing.test.js tests/unit/edit-model-modal-capabilities.test.js
```

Full changed-file lint reports existing `react-hooks/set-state-in-effect` findings in:

- `src/app/(dashboard)/dashboard/models/page.js` (`fetchData()` effect; explicitly allowed by the task)
- `src/app/(dashboard)/dashboard/models/EditModelModal.js` (existing modal initialization effect, untouched except for adding constants)

No new lint findings were introduced. `git diff --check` passed.

## Concerns

- Windows occasionally retains a lock on the temporary better-sqlite3 database in `model-routing.test.js`, causing an `EBUSY` cleanup failure in grouped runs. The actual routing assertions pass, and the focused alias-to-combo contract uses mocked persistence to avoid this unrelated platform flake.
- Existing `.omc` state changes were left untouched and are not included in the implementation commit.

## Commit

Pending at report creation; final commit hash is recorded in the final response.
