# Invalid Providers Node Details and Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich Invalid Providers groups with safe custom provider-node metadata and increase page typography to match the dashboard Providers experience.

**Architecture:** Keep `connectionsRepo.getInvalidConnections()` focused on invalid connection grouping. Enrich the response in `GET /api/providers/invalid` by joining raw provider IDs to `getProviderNodes()`, preserving the raw ID while adding `providerDetails`. Render the metadata in `InvalidProviderGroup` with fallbacks and update typography classes in the page, group, and tab components without changing bulk-action behavior.

**Tech Stack:** Next.js App Router, React client components, plain JavaScript, Vitest, Tailwind utility classes, existing `@/models` and shared UI components.

## Global Constraints

- Raw provider ID remains the grouping key, React key, and internal identifier.
- Node metadata is limited to `id`, `name`, `prefix`, `type`, `apiType`, and `baseUrl`.
- Credential fields (`apiKey`, `accessToken`, `refreshToken`, `idToken`) must never be returned.
- Missing provider-node matches fall back to the raw provider ID and must not fail the endpoint.
- Existing invalid grouping, bucket, selection, confirmation, and bulk behavior must remain unchanged.
- Preserve responsive layout; typography changes must improve readability without introducing horizontal overflow.

---

### Task 1: Enrich Invalid Provider API Groups With Node Metadata

**Files:**
- Modify: `src/app/api/providers/invalid/route.js`
- Test: `tests/unit/invalid-provider-route.test.js` (create if absent)

**Interfaces:**
- Consumes: `getInvalidConnections()` from `@/models`; `getProviderNodes()` from `@/models`.
- Produces: Each provider group retains `provider` and gains `providerDetails` with `{ id, name, prefix, type, apiType, baseUrl }` or `null`.

- [ ] **Step 1: Add route test fixtures and mocks**

Mock `@/models` so `getInvalidConnections()` returns one group with `provider: "oc-custom-1"` and one bucket containing a connection with credential-like fields, while `getProviderNodes()` returns a matching node:

```js
vi.mock("@/models", () => ({
  getInvalidConnections: vi.fn(),
  getProviderNodes: vi.fn(),
}));
```

Assert that the route response preserves `provider: "oc-custom-1"`, returns the six approved node fields, and does not include credential fields in connection rows or node metadata.

- [ ] **Step 2: Add fallback and failure-isolation tests**

Add a test where `getProviderNodes()` returns a node for another ID and assert `providerDetails` is `null` while the provider group remains present. Add a test where `getProviderNodes()` rejects and assert the route still returns HTTP 200 with the invalid groups and `providerDetails: null`.

- [ ] **Step 3: Implement safe node lookup**

Import `getProviderNodes` beside `getInvalidConnections`. In `GET`, load invalid connections and provider nodes, catching node lookup failures separately:

```js
const data = await getInvalidConnections();
let nodeById = new Map();
try {
  const { nodes = [] } = await getProviderNodes();
  nodeById = new Map(nodes.map((node) => [node.id, node]));
} catch (error) {
  console.warn("Failed to fetch provider nodes for invalid connections:", error);
}
```

If the repository function returns an array rather than `{ nodes }`, normalize both shapes before constructing the map. For each group, set `providerDetails` from the matching node using only `id`, `name`, `prefix`, `type`, `apiType`, and `baseUrl`; otherwise set `null`. Continue sanitizing each bucket through the existing `sanitize` function.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
cd /home/ubuntu/9router-fork/tests && npx vitest run unit/invalid-provider-route.test.js unit/invalid-connections.test.js
```

Expected: all route and existing grouping tests pass.

- [ ] **Step 5: Commit the API change**

```bash
git add src/app/api/providers/invalid/route.js tests/unit/invalid-provider-route.test.js
git commit -m "feat: expose provider node details for invalid groups"
```

---

### Task 2: Render Provider Node Details in Invalid Provider Groups

**Files:**
- Modify: `src/app/(dashboard)/dashboard/invalid-providers/components/InvalidProviderGroup.js`

**Interfaces:**
- Consumes: `provider.providerDetails` from Task 1, with nullable fallback.
- Produces: Group header showing node name plus all requested node details while keeping raw provider ID visible.

- [ ] **Step 1: Define display fallbacks**

Inside `InvalidProviderGroup`, derive:

```js
const details = provider?.providerDetails || {};
const providerName = details.name || provider.provider;
const providerId = details.id || provider.provider;
```

- [ ] **Step 2: Replace the raw-only group header**

Keep the existing expand button, Badge, count, and click behavior. Render the node name as the primary label, then render a secondary metadata block containing:

- raw node ID (`providerId`),
- `prefix` when present,
- `type` and `apiType` when present,
- `baseUrl` when present.

Use `title={details.baseUrl}` on the endpoint element and `truncate`/`min-w-0` classes so long URLs do not force overflow. Do not use node metadata for bulk IDs; existing `provider.provider` remains unchanged in the `onBulk` call and confirmation copy.

- [ ] **Step 3: Increase group typography and controls**

Update the group header and expanded content to readable dashboard sizes:

- chevron icon from `text-[18px]` to `text-xl`;
- primary node title to `text-base sm:text-lg font-semibold`;
- metadata/count/labels/empty state from `text-[13px]` to `text-sm`;
- table from `text-[13px]` to `text-sm`;
- keep error text red and add `leading-relaxed` where it improves wrapping.

Preserve existing Badge/Button sizes and all selection/confirm logic.

- [ ] **Step 4: Run focused tests and build lint/type checks available in the repo**

Run:

```bash
cd /home/ubuntu/9router-fork/tests && npx vitest run unit/invalid-provider-route.test.js unit/invalid-connections.test.js
cd /home/ubuntu/9router-fork && npm run build
```

Expected: tests pass and production build succeeds.

- [ ] **Step 5: Commit the group UI change**

```bash
git add "src/app/(dashboard)/dashboard/invalid-providers/components/InvalidProviderGroup.js"
git commit -m "feat: show provider node details in invalid groups"
```

---

### Task 3: Increase Typography Across the Invalid Providers Page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/invalid-providers/page.js`
- Modify: `src/app/(dashboard)/dashboard/invalid-providers/components/ErrorStatusTabs.js`

**Interfaces:**
- Consumes: Existing page data and tab props; no API changes.
- Produces: Readable typography consistent with dashboard Providers while preserving loading, empty, fetch-race, and tab behavior.

- [ ] **Step 1: Update page-level hierarchy**

In `page.js`, change the warning title to `text-lg sm:text-xl font-semibold`, warning copy to `text-sm`, and empty state to `text-sm`. Keep the warning content and destructive-action disclaimer unchanged.

- [ ] **Step 2: Update error status tabs**

In `ErrorStatusTabs.js`, change tab labels from `text-[13px]` to `text-sm`, retain `font-medium`, focus/hover/active classes, and preserve the dynamic count rendering.

- [ ] **Step 3: Run focused tests and production build**

Run:

```bash
cd /home/ubuntu/9router-fork/tests && npx vitest run unit/invalid-provider-route.test.js unit/invalid-connections.test.js unit/bulk-connections.test.js
cd /home/ubuntu/9router-fork && npm run build
```

Expected: all focused tests pass and build succeeds.

- [ ] **Step 4: Commit typography changes**

```bash
git add "src/app/(dashboard)/dashboard/invalid-providers/page.js" "src/app/(dashboard)/dashboard/invalid-providers/components/ErrorStatusTabs.js"
git commit -m "style: improve invalid providers typography"
```

---

### Task 4: Whole-Feature Verification

**Files:**
- Review: all files changed by Tasks 1–3
- Test: existing unit suite

- [ ] **Step 1: Inspect the final diff for scope and secrets**

Run:

```bash
git diff HEAD~3..HEAD --stat
git diff HEAD~3..HEAD --check
grep -RInE "apiKey|accessToken|refreshToken|idToken" src/app/api/providers/invalid src/app/\(dashboard\)/dashboard/invalid-providers || true
```

Expected: no whitespace errors; no credential values are added to the response or rendered metadata.

- [ ] **Step 2: Run the complete test suite**

Run:

```bash
cd /home/ubuntu/9router-fork/tests && npm test -- --run
```

Expected: all existing tests pass, including invalid provider and quota regressions.

- [ ] **Step 3: Verify working tree and commits**

Run:

```bash
git status --short --branch
git log -3 --oneline
```

Expected: only intentional commits are present and the working tree is clean.
